
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  SafeAreaView, KeyboardAvoidingView, Platform, useWindowDimensions,
  Image, Animated,
} from 'react-native';
import {
  ref, push, onValue, set, remove,
  query as rtQuery, limitToLast, orderByChild,
} from 'firebase/database';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { rtdb, db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW, DESKTOP_BREAKPOINT,
} from '../constants/theme';

// ── Types ───────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string | null;
  timestamp: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function timeStr(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function dateSeparator(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// Build a list of messages with date-separator markers inserted
function withDateSeparators(msgs: Message[]) {
  const out: (Message | { type: 'separator'; label: string; key: string })[] = [];
  let lastDate = '';
  msgs.forEach(m => {
    const ds = dateSeparator(m.timestamp);
    if (ds !== lastDate) {
      out.push({ type: 'separator', label: ds, key: `sep_${m.timestamp}` });
      lastDate = ds;
    }
    out.push(m);
  });
  return out;
}

// ── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ uri, name, size = 32 }: { uri?: string | null; name: string; size?: number }) {
  return uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: size * 0.38 }}>
        {(name || 'U')[0].toUpperCase()}
      </Text>
    </View>
  );
}

// ── TypingDots ───────────────────────────────────────────────────────────────
function TypingDots() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anim = Animated.loop(
      Animated.stagger(180, dots.map(d =>
        Animated.sequence([
          Animated.timing(d, { toValue: -4, duration: 300, useNativeDriver: true }),
          Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ))
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 4 }}>
      {dots.map((d, i) => (
        <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.textLight, transform: [{ translateY: d }] }} />
      ))}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { roomId, roomName, recipientId, recipientName } = useLocalSearchParams<{
    roomId?: string; roomName?: string; recipientId?: string; recipientName?: string;
  }>();
  const { user, profile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const flatRef = useRef<FlatList>(null);
  const typingTimer = useRef<any>(null);
  const inputRef = useRef<TextInput>(null);

  const chatId = recipientId
    ? [user!.uid, recipientId].sort().join('_')
    : (roomId || 'general');

  const msgRef = ref(rtdb, `chats/${chatId}/messages`);
  const myTypingRef = ref(rtdb, `chats/${chatId}/typing/${user!.uid}`);

  // ── Real-time messages listener (RTDB) ────────────────────────────────────
  useEffect(() => {
    const q = rtQuery(msgRef, orderByChild('timestamp'), limitToLast(80));
    const unsub = onValue(q, snap => {
      const data = snap.val();
      if (data) {
        const msgs = Object.entries(data)
          .map(([id, val]: any) => ({ id, ...val }))
          .sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgs);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
      } else {
        setMessages([]);
      }
    });
    return () => unsub();
  }, [chatId]);

  // ── Typing indicator listener ─────────────────────────────────────────────
  useEffect(() => {
    const tRef = ref(rtdb, `chats/${chatId}/typing`);
    const unsub = onValue(tRef, snap => {
      const data = snap.val() || {};
      setTypingUsers(
        Object.entries(data)
          .filter(([uid, v]: any) => uid !== user!.uid && v?.isTyping)
          .map(([_, v]: any) => v.name as string)
      );
    });
    return () => unsub();
  }, [chatId]);

  // Cleanup typing status on unmount
  useEffect(() => {
    return () => {
      remove(myTypingRef);
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  // ── Typing handler ────────────────────────────────────────────────────────
  const handleType = useCallback((val: string) => {
    setText(val);
    set(myTypingRef, { isTyping: true, name: profile?.fullName ?? 'Someone' });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => remove(myTypingRef), 2500);
  }, [profile]);

  // ── Send message ──────────────────────────────────────────────────────────
  const send = async () => {
    const msg = text.trim();
    if (!msg) return;
    setText('');
    remove(myTypingRef);
    if (typingTimer.current) clearTimeout(typingTimer.current);

    await push(msgRef, {
      text: msg,
      senderId: user!.uid,
      senderName: profile?.fullName ?? 'User',
      senderPhoto: profile?.photoURL ?? null,
      timestamp: Date.now(),
    });

    if (recipientId) {
      addDoc(collection(db, 'notifications'), {
        type: 'new_message',
        recipientId,
        senderId: user!.uid,
        senderName: profile?.fullName ?? 'User',
        message: `${profile?.fullName ?? 'User'}: ${msg.slice(0, 60)}`,
        chatRoomId: chatId,
        createdAt: serverTimestamp(),
        read: false,
      }).catch(() => {});
    }
  };

  const title = recipientName || roomName || 'Chat';
  const subtitle = recipientId ? 'Direct Message' : 'Group Chat';
  const items = withDateSeparators(messages);

  // ── Message bubble ────────────────────────────────────────────────────────
  const renderItem = ({ item, index }: { item: any; index: number }) => {
    if (item.type === 'separator') {
      return (
        <View style={{ alignItems: 'center', marginVertical: SPACING.sm }}>
          <View style={{ backgroundColor: COLORS.background, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, fontWeight: FONT_WEIGHT.medium }}>{item.label}</Text>
          </View>
        </View>
      );
    }

    const msg = item as Message;
    const isMe = msg.senderId === user!.uid;
    const prev = index > 0 ? items[index - 1] as Message : null;
    const showAvatar = !isMe && (!prev || (prev as any).type === 'separator' || (prev as Message).senderId !== msg.senderId);
    const showName = !isMe && showAvatar && !recipientId; // only in group chats

    return (
      <View style={{ marginBottom: 3, paddingHorizontal: SPACING.md }}>
        {showName && (
          <Text style={{ fontSize: 11, color: COLORS.primaryRed, fontWeight: FONT_WEIGHT.bold, marginLeft: 42, marginBottom: 2 }}>
            {msg.senderName}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
          {!isMe && (
            <View style={{ width: 30 }}>
              {showAvatar && <Avatar uri={msg.senderPhoto} name={msg.senderName} size={30} />}
            </View>
          )}
          <View
            style={{
              maxWidth: '72%',
              backgroundColor: isMe ? COLORS.primaryRed : COLORS.white,
              borderRadius: RADIUS.md,
              borderBottomRightRadius: isMe ? 4 : RADIUS.md,
              borderBottomLeftRadius: !isMe ? 4 : RADIUS.md,
              paddingHorizontal: SPACING.md,
              paddingVertical: SPACING.sm,
              ...SHADOW.card,
            }}>
            <Text style={{ fontSize: FONT_SIZE.body, color: isMe ? COLORS.white : COLORS.textDark, lineHeight: 20 }}>
              {msg.text}
            </Text>
            <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.55)' : COLORS.textLight, alignSelf: 'flex-end', marginTop: 3 }}>
              {timeStr(msg.timestamp)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, flexDirection: 'row' }}>
      {isDesktop && <Sidebar />}

      <View style={{ flex: 1 }}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
          backgroundColor: COLORS.primaryRed,
          paddingHorizontal: SPACING.md,
          paddingTop: isDesktop ? SPACING.md : 52,
          paddingBottom: SPACING.md,
          ...SHADOW.header,
        }}>
          {!isDesktop && (
            <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="arrow-back" size={22} color={COLORS.white} />
            </TouchableOpacity>
          )}

          {/* Avatar */}
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <Ionicons name={recipientId ? 'person' : 'people'} size={20} color={COLORS.white} />
          </View>

          {/* Name + status */}
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.body + 1 }} numberOfLines={1}>
              {title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              {recipientId && <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.success }} />}
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: FONT_SIZE.caption }}>
                {recipientId ? 'Online' : subtitle}
              </Text>
            </View>
          </View>

          {/* Action icons */}
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="call-outline" size={18} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="videocam-outline" size={18} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="ellipsis-vertical" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Messages list ───────────────────────────────────────────────── */}
        <FlatList
          ref={flatRef}
          data={items}
          keyExtractor={(item: any) => item.id || item.key}
          renderItem={renderItem}
          contentContainerStyle={{ paddingTop: SPACING.md, paddingBottom: SPACING.sm }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, gap: SPACING.sm }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="chatbubble-ellipses-outline" size={36} color={COLORS.border} />
              </View>
              <Text style={{ color: COLORS.textDark, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.cardTitle }}>
                Start the conversation
              </Text>
              <Text style={{ color: COLORS.textLight, textAlign: 'center', paddingHorizontal: 40 }}>
                Say hello to {title} 👋
              </Text>
            </View>
          }
        />

        {/* ── Typing indicator ────────────────────────────────────────────── */}
        {typingUsers.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: 6 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 12 }}>✍️</Text>
            </View>
            <View style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 6, ...SHADOW.card }}>
              <TypingDots />
            </View>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>
              {typingUsers[0]} is typing…
            </Text>
          </View>
        )}

        {/* ── Input bar ───────────────────────────────────────────────────── */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={isDesktop ? 0 : 0}>
          <View style={{
            flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm,
            paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
            backgroundColor: COLORS.white,
            borderTopWidth: 1, borderTopColor: COLORS.border,
          }}>
            <TouchableOpacity hitSlop={8} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}>
              <Ionicons name="add" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={handleType}
              placeholder="Type a message..."
              placeholderTextColor={COLORS.textLight}
              multiline
              style={{
                flex: 1,
                backgroundColor: COLORS.background,
                borderRadius: RADIUS.lg,
                paddingHorizontal: SPACING.md,
                paddingTop: SPACING.sm,
                paddingBottom: SPACING.sm,
                fontSize: FONT_SIZE.body,
                color: COLORS.textDark,
                maxHeight: 120,
                minHeight: 40,
              }}
            />

            {text.trim() ? (
              <TouchableOpacity
                onPress={send}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: COLORS.primaryRed,
                  alignItems: 'center', justifyContent: 'center',
                  marginBottom: 1,
                  shadowColor: COLORS.primaryRed, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 5,
                }}>
                <Ionicons name="send" size={17} color={COLORS.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity hitSlop={8} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginBottom: 1 }}>
                <Ionicons name="mic-outline" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>

      {!isDesktop && <Sidebar />}
    </SafeAreaView>
  );
}