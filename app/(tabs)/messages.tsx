
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  SafeAreaView, Image, useWindowDimensions, ScrollView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ref, onValue, query as rtQuery, orderByChild, limitToLast } from 'firebase/database';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { rtdb, db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../../components/Sidebar';
import FadeInView from '../../components/FadeInView';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW, DESKTOP_BREAKPOINT,
} from '../../constants/theme';

// ── Types ──────────────────────────────────────────────────────────────────
interface Conversation {
  chatId: string;
  recipientId: string;
  recipientName: string;
  recipientPhoto: string | null;
  lastMessage: string;
  lastTimestamp: number;
  unread: number;
  isOnline?: boolean;
}

interface SearchUser {
  uid: string;
  fullName: string;
  department: string;
  photoURL: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function timeLabel(ts: number) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ── Avatar helper ────────────────────────────────────────────────────────────
function Avatar({ uri, name, size = 48, online = false }: { uri?: string | null; name: string; size?: number; online?: boolean }) {
  return (
    <View style={{ position: 'relative' }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: size * 0.38 }}>{(name || 'U')[0].toUpperCase()}</Text>
        </View>
      )}
      {online && (
        <View style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.white }} />
      )}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<SearchUser[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<any>(null);

  // ── Load conversations from RTDB ──────────────────────────────────────────
  // We store a list of known chatIds in Firestore users/{uid}/chats (populated
  // when a message is first sent). Fall back to Firestore notifications to
  // derive conversation partners.
  useEffect(() => {
    if (!user) return;
    // Listen to Firestore notifications for DM events to build conversation list
    const q = query(
      collection(db, 'notifications'),
      where('type', '==', 'new_message'),
      orderBy('createdAt', 'desc'),
      limit(40),
    );
    const unsub = onSnapshot(q, snap => {
      const seen = new Set<string>();
      const convMap: Record<string, Conversation> = {};

      snap.docs.forEach(d => {
        const n = d.data();
        const isIncoming = n.recipientId === user.uid;
        const isOutgoing = n.senderId === user.uid;
        if (!isIncoming && !isOutgoing) return;

        const otherId = isIncoming ? n.senderId : n.recipientId;
        const otherName = isIncoming ? (n.senderName || 'User') : (n.recipientName || 'User');
        const chatId = [user.uid, otherId].sort().join('_');

        if (!seen.has(chatId)) {
          seen.add(chatId);
          convMap[chatId] = {
            chatId,
            recipientId: otherId,
            recipientName: otherName,
            recipientPhoto: null,
            lastMessage: n.message || '',
            lastTimestamp: n.createdAt?.seconds ? n.createdAt.seconds * 1000 : Date.now(),
            unread: isIncoming && !n.read ? 1 : 0,
            isOnline: false,
          };
        } else if (isIncoming && !n.read) {
          convMap[chatId].unread = (convMap[chatId].unread || 0) + 1;
        }
      });

      // Now attach live last-message from RTDB for each conversation
      const convList = Object.values(convMap);
      setConversations(convList);

      // Hydrate lastMessage from RTDB in background
      convList.forEach(conv => {
        const msgQ = rtQuery(ref(rtdb, `chats/${conv.chatId}/messages`), orderByChild('timestamp'), limitToLast(1));
        onValue(msgQ, snap => {
          const data = snap.val();
          if (data) {
            const last = Object.values(data)[0] as any;
            setConversations(prev => prev.map(c =>
              c.chatId === conv.chatId
                ? { ...c, lastMessage: last.text || '', lastTimestamp: last.timestamp || c.lastTimestamp }
                : c
            ));
          }
        }, { onlyOnce: true });
      });
    });
    return unsub;
  }, [user]);

  // ── Load some online users from Firestore ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users'), limit(12));
    getDocs(q).then(snap => {
      setOnlineUsers(
        snap.docs
          .map(d => ({ uid: d.id, ...d.data() } as SearchUser))
          .filter(u => u.uid !== user.uid)
          .slice(0, 10)
      );
    }).catch(() => {});
  }, [user]);

  // ── Search users by name ──────────────────────────────────────────────────
  useEffect(() => {
    if (!searchText.trim()) { setSearchResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const snap = await getDocs(query(collection(db, 'users'), limit(20)));
        const lower = searchText.toLowerCase();
        setSearchResults(
          snap.docs
            .map(d => ({ uid: d.id, ...d.data() } as SearchUser))
            .filter(u => u.uid !== user?.uid && u.fullName?.toLowerCase().includes(lower))
            .slice(0, 8)
        );
      } finally { setSearching(false); }
    }, 350);
  }, [searchText, user]);

  const openChat = useCallback((recipientId: string, recipientName: string) => {
    router.push({ pathname: '/chat', params: { recipientId, recipientName } });
  }, [router]);

  const openGroupChat = useCallback(() => {
    router.push({ pathname: '/chat', params: { roomId: 'general', roomName: 'General Chat' } });
  }, [router]);

  const sortedConversations = useMemo(
    () => [...conversations].sort((a, b) => b.lastTimestamp - a.lastTimestamp),
    [conversations]
  );

  // ── Conversation card ─────────────────────────────────────────────────────
  const ConvCard = ({ conv, index }: { conv: Conversation; index: number }) => (
    <FadeInView delay={index * 30}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => openChat(conv.recipientId, conv.recipientName)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
          paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
          backgroundColor: conv.unread > 0 ? '#FEF2F2' : COLORS.white,
          borderBottomWidth: 1, borderBottomColor: COLORS.border,
        }}>
        <Avatar uri={conv.recipientPhoto} name={conv.recipientName} size={50} online={conv.isOnline} />
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: conv.unread > 0 ? FONT_WEIGHT.bold : FONT_WEIGHT.semiBold, color: COLORS.textDark }} numberOfLines={1}>
              {conv.recipientName}
            </Text>
            <Text style={{ fontSize: FONT_SIZE.caption, color: conv.unread > 0 ? COLORS.primaryRed : COLORS.textLight }}>
              {timeLabel(conv.lastTimestamp)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              numberOfLines={1}
              style={{ flex: 1, fontSize: FONT_SIZE.caption + 1, color: conv.unread > 0 ? COLORS.textDark : COLORS.textLight, fontWeight: conv.unread > 0 ? FONT_WEIGHT.semiBold : FONT_WEIGHT.regular }}>
              {conv.lastMessage}
            </Text>
            {conv.unread > 0 && (
              <View style={{ backgroundColor: COLORS.primaryRed, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, marginLeft: SPACING.sm }}>
                <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: FONT_WEIGHT.bold }}>{conv.unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </FadeInView>
  );

  // ── Search result card ────────────────────────────────────────────────────
  const SearchCard = ({ u, index }: { u: SearchUser; index: number }) => (
    <FadeInView delay={index * 25}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => { setSearchText(''); openChat(u.uid, u.fullName); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <Avatar uri={u.photoURL} name={u.fullName} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textDark }}>{u.fullName}</Text>
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>{u.department}</Text>
        </View>
        <Ionicons name="chatbubble-outline" size={18} color={COLORS.primaryRed} />
      </TouchableOpacity>
    </FadeInView>
  );

  const body = (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      {/* Header */}
      <View style={{
        backgroundColor: COLORS.primaryRed,
        paddingTop: isDesktop ? SPACING.md : 54,
        paddingBottom: SPACING.md,
        paddingHorizontal: SPACING.lg,
        ...SHADOW.header,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: COLORS.white, fontSize: FONT_SIZE.header, fontWeight: FONT_WEIGHT.bold }}>Messages</Text>
            {conversations.filter(c => c.unread > 0).length > 0 && (
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZE.caption }}>
                {conversations.filter(c => c.unread > 0).length} unread
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={openGroupChat}
            style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="create-outline" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
          backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: RADIUS.pill,
          paddingHorizontal: SPACING.md, height: 42, marginTop: SPACING.md,
        }}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.8)" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search conversations..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={{ flex: 1, fontSize: FONT_SIZE.body, color: COLORS.white }}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Body */}
      {searchText.trim() ? (
        // Search results
        <FlatList
          data={searchResults}
          keyExtractor={u => u.uid}
          renderItem={({ item, index }) => <SearchCard u={item} index={index} />}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm }}>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, fontWeight: FONT_WEIGHT.semiBold, textTransform: 'uppercase' }}>
                {searching ? 'Searching...' : `${searchResults.length} users found`}
              </Text>
            </View>
          }
          ListEmptyComponent={
            !searching ? (
              <View style={{ alignItems: 'center', paddingTop: 60, gap: SPACING.sm }}>
                <Ionicons name="person-outline" size={44} color={COLORS.border} />
                <Text style={{ color: COLORS.textLight }}>No users found for "{searchText}"</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={sortedConversations}
          keyExtractor={c => c.chatId}
          renderItem={({ item, index }) => <ConvCard conv={item} index={index} />}
          ListHeaderComponent={
            <>
              {/* Online users strip */}
              {onlineUsers.length > 0 && (
                <View style={{ paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                  <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.bold, color: COLORS.textLight, textTransform: 'uppercase', paddingHorizontal: SPACING.lg, marginBottom: SPACING.sm }}>
                    People on MyEusnite
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.md }}>
                    {onlineUsers.map(u => (
                      <TouchableOpacity
                        key={u.uid}
                        activeOpacity={0.8}
                        onPress={() => openChat(u.uid, u.fullName)}
                        style={{ alignItems: 'center', gap: 6, width: 58 }}>
                        <Avatar uri={u.photoURL} name={u.fullName} size={48} online />
                        <Text style={{ fontSize: 10, color: COLORS.textDark, fontWeight: FONT_WEIGHT.medium, textAlign: 'center' }} numberOfLines={1}>
                          {u.fullName.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* General group chat shortcut */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={openGroupChat}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
                  paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
                  borderBottomWidth: 1, borderBottomColor: COLORS.border,
                  backgroundColor: COLORS.white,
                }}>
                <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="people" size={24} color={COLORS.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>General Chat</Text>
                  <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>All ESUT students</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
              </TouchableOpacity>

              {sortedConversations.length > 0 && (
                <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.bold, color: COLORS.textLight, textTransform: 'uppercase', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: COLORS.background }}>
                  Direct Messages
                </Text>
              )}
            </>
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 70, gap: SPACING.sm, paddingHorizontal: SPACING.lg }}>
              <Ionicons name="chatbubble-ellipses-outline" size={56} color={COLORS.border} />
              <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>No conversations yet</Text>
              <Text style={{ color: COLORS.textLight, textAlign: 'center' }}>Search for a student above to start a direct message</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white, flexDirection: 'row' }}>
      {isDesktop && <Sidebar />}
      {body}
      {!isDesktop && <Sidebar />}
    </SafeAreaView>
  );
}