
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  SafeAreaView, RefreshControl, Alert, Modal, Image,
  KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection, query, orderBy, onSnapshot,
  addDoc, serverTimestamp, limit,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';

import Sidebar from '../../components/Sidebar';
import RightSidebar from '../../components/RightSidebar';
import QuickActionGrid from '../../components/QuickActionGrid';
import ProductCard from '../../components/marketplace/ProductCard';
import FeedPostCard from '../../components/FeedPostCard';
import FadeInView from '../../components/FadeInView';
import AnimatedPressable from '../../components/AnimatedPressable';

import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW,
  DESKTOP_BREAKPOINT,
} from '../../constants/theme';

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [posts, setPosts] = useState<any[]>([]);
  const [marketItems, setMarketItems] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  // ── Firestore listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const uP = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20)), snap =>
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const uM = onSnapshot(query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'), limit(8)), snap =>
      setMarketItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const uE = onSnapshot(query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(3)), snap =>
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const uA = onSnapshot(query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(3)), snap =>
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { uP(); uM(); uE(); uA(); };
  }, []);

  const submitPost = useCallback(async () => {
    if (!postText.trim()) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        text: postText.trim(),
        authorId: user!.uid,
        authorName: profile?.fullName ?? 'User',
        authorDept: profile?.department ?? '',
        authorPhoto: profile?.photoURL ?? null,
        likes: [], commentsCount: 0,
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'notifications'), {
        type: 'new_post', senderId: user!.uid, senderName: profile?.fullName ?? 'User',
        message: `${profile?.fullName ?? 'User'} shared a new post`,
        global: true, read: false, createdAt: serverTimestamp(),
      });
      setPostText(''); setShowPostModal(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setPosting(false);
    }
  }, [postText, user, profile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const avatar = profile?.photoURL;

  // Quick action definitions — shared between mobile & desktop create-post bar
  const quickActions = useMemo(() => ([
    { icon: 'chatbubble-ellipses' as const, label: 'Chat', onPress: () => router.push({ pathname: '/chat', params: { roomId: 'general', roomName: 'General Chat' } }) },
    { icon: 'people' as const, label: 'Groups', onPress: () => router.push('/(tabs)/groups') },
    { icon: 'storefront' as const, label: 'Marketplace', onPress: () => router.push('/(tabs)/marketplace') },
    { icon: 'videocam' as const, label: 'Videos', onPress: () => router.push('/(tabs)/videos') },
  ]), [router]);

  // ════════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT — 3 columns: Sidebar | Center Feed | RightSidebar
  // ════════════════════════════════════════════════════════════════════════
  if (isDesktop) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Top navbar */}
        <View style={{
          height: 70, backgroundColor: COLORS.primaryRed,
          flexDirection: 'row', alignItems: 'center',
          paddingHorizontal: SPACING.lg, gap: SPACING.md,
          ...SHADOW.header,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="school" size={20} color={COLORS.white} />
            </View>
            <Text style={{ color: COLORS.white, fontSize: FONT_SIZE.header, fontWeight: FONT_WEIGHT.bold }}>MyEusnite</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => router.push('/search')}
            style={{ flex: 1, maxWidth: 420, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: RADIUS.pill, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, height: 42, marginLeft: SPACING.lg }}>
            <Ionicons name="search-outline" size={18} color={COLORS.textLight} />
            <Text style={{ marginLeft: SPACING.sm, color: COLORS.textLight, fontSize: FONT_SIZE.body }}>Search here...</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <TouchableOpacity hitSlop={8} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={8}
              onPress={() => router.push({ pathname: '/chat', params: { roomId: 'general', roomName: 'General Chat' } })}
              style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="mail-outline" size={22} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={8} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <View>
                <Ionicons name="notifications-circle-outline" size={22} color={COLORS.white} />
                {unreadCount > 0 && (
                  <View style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.goldBadge }} />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }} />
              ) : (
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' }}>
                  <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>{(profile?.fullName || 'U')[0]}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 3-column body */}
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <Sidebar />

          {/* CENTER FEED */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: SPACING.lg, maxWidth: 700, width: '100%', alignSelf: 'center' }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryRed]} tintColor={COLORS.primaryRed} />}>

            {/* Create Post card */}
            <FadeInView style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOW.card }}>
              <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>
                Create Post
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setShowPostModal(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>{(profile?.fullName || 'U')[0]}</Text>
                  </View>
                )}
                <View style={{ flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: 12 }}>
                  <Text style={{ color: COLORS.textLight, fontSize: FONT_SIZE.body }}>What's on your mind?</Text>
                </View>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md, flexWrap: 'wrap' }}>
                {[
                  { icon: 'image-outline' as const, label: 'Photo/Video' },
                  { icon: 'calendar-outline' as const, label: 'Event' },
                  { icon: 'people-outline' as const, label: 'Group' },
                ].map(btn => (
                  <TouchableOpacity
                    key={btn.label}
                    onPress={() => setShowPostModal(true)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 10 }}>
                    <Ionicons name={btn.icon} size={16} color={COLORS.textLight} />
                    <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textDark, fontWeight: FONT_WEIGHT.medium }}>{btn.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/groups')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryRed, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm, paddingVertical: 10 }}>
                  <Ionicons name="people" size={16} color={COLORS.white} />
                  <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.white, fontWeight: FONT_WEIGHT.semiBold }}>Create Group</Text>
                </TouchableOpacity>
              </View>
            </FadeInView>

            {/* Announcements */}
            {announcements.length > 0 && (
              <FadeInView delay={60} style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOW.card }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm }}>
                  <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>Announcements</Text>
                  <TouchableOpacity><Text style={{ color: COLORS.textLight, fontSize: FONT_SIZE.caption }}>More ›</Text></TouchableOpacity>
                </View>
                {announcements.map((a, i) => (
                  <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: COLORS.border }}>
                    <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textDark, flex: 1 }} numberOfLines={1}>{a.title}</Text>
                    <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>recently</Text>
                  </View>
                ))}
              </FadeInView>
            )}

            {/* Feed posts */}
            {(posts.length === 0
              ? [{ id: 'demo', authorName: 'Chioma Oluchi', authorDept: 'Engineering Dept.', text: 'Fun times at the campus fest! #CampusLife', likes: Array(120).fill('x'), commentsCount: 45, createdAt: null }]
              : posts
            ).map((post, i) => (
              <FeedPostCard key={post.id} post={post} delay={i * 40} />
            ))}
          </ScrollView>

          <RightSidebar events={events} marketItems={marketItems} onlineFriends={[]} />
        </View>

        {/* Post modal (shared) */}
        <PostModal
          visible={showPostModal}
          onClose={() => setShowPostModal(false)}
          text={postText}
          onChangeText={setPostText}
          onSubmit={submitPost}
          posting={posting}
          avatar={avatar}
          name={profile?.fullName}
        />
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ════════════════════════════════════════════════════════════════════════
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryRed]} tintColor={COLORS.primaryRed} />}>

        {/* HEADER — red, height 90, shadow */}
        <View style={{ backgroundColor: COLORS.primaryRed, height: 90, paddingTop: 14, paddingHorizontal: SPACING.md, ...SHADOW.header }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="school" size={26} color={COLORS.white} />
              <Text style={{ color: COLORS.white, fontSize: 22, fontWeight: FONT_WEIGHT.bold }}>MyEusnite</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <TouchableOpacity hitSlop={8} onPress={() => router.push('/notifications')} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <View>
                  <Ionicons name="notifications" size={24} color={COLORS.white} />
                  {unreadCount > 0 && (
                    <View style={{ position: 'absolute', top: -2, right: -4, backgroundColor: COLORS.goldBadge, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                      <Text style={{ color: COLORS.white, fontSize: 9, fontWeight: FONT_WEIGHT.bold }}>{unreadCount}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                hitSlop={8}
                onPress={() => router.push({ pathname: '/chat', params: { roomId: 'general', roomName: 'General Chat' } })}
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="mail" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* UNIVERSITY STRIP — height 35, dark red */}
        <View style={{ backgroundColor: COLORS.darkRed, height: 35, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.92)', fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.medium }}>
            Enugu State University of Science and Technology
          </Text>
        </View>

        <View style={{ paddingHorizontal: SPACING.md }}>

          {/* PROFILE CARD */}
          <FadeInView style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, marginTop: SPACING.md, flexDirection: 'row', alignItems: 'center', ...SHADOW.card }}>
            <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: 18 }}>{(profile?.fullName || 'U')[0]}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>
                {profile?.fullName || 'User'}
              </Text>
              {profile?.isPremium && (
                <View style={{ backgroundColor: COLORS.goldBadge, alignSelf: 'flex-start', borderRadius: RADIUS.pill, paddingHorizontal: SPACING.sm, paddingVertical: 2, marginTop: 4 }}>
                  <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: FONT_WEIGHT.bold }}>Premium Member</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              hitSlop={8}
              onPress={() => router.push('/(tabs)/profile')}
              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="chevron-down" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </FadeInView>

          {/* SEARCH BAR */}
          <FadeInView delay={60}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/search')}
              style={{
                backgroundColor: COLORS.white, height: 50, borderRadius: RADIUS.pill,
                flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md,
                marginTop: SPACING.md, ...SHADOW.card,
              }}>
              <Ionicons name="search" size={20} color={COLORS.textLight} />
              <Text style={{ marginLeft: SPACING.sm, color: COLORS.textLight, fontSize: FONT_SIZE.body }}>Search...</Text>
            </TouchableOpacity>
          </FadeInView>

          {/* QUICK ACTION GRID */}
          <View style={{ marginTop: SPACING.md }}>
            <FadeInView delay={120}>
              <QuickActionGrid actions={quickActions} />
            </FadeInView>
          </View>

          {/* PROMOTIONAL BANNER — Pay School Fees */}
          <FadeInView delay={180} style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', ...SHADOW.card }}>
            <View>
              <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm, maxWidth: 180 }}>
                Pay Your School Fees Here
              </Text>
              <AnimatedPressable
                onPress={() => {}}
                style={{ backgroundColor: COLORS.primaryRed, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.lg, paddingVertical: 10, alignSelf: 'flex-start', minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.body }}>Pay Now</Text>
              </AnimatedPressable>
            </View>
            <Ionicons name="school" size={64} color={COLORS.primaryRed} style={{ opacity: 0.18 }} />
          </FadeInView>

          {/* CAMPUS NEWS & EVENTS */}
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginTop: SPACING.lg, marginBottom: SPACING.sm }}>
            Campus News &amp; Events
          </Text>

          {(events.length === 0
            ? [{ id: 'demo', title: 'Cultural Day Celebration', description: 'Highlights from our vibrant cultural day!', likes: 20, comments: 120 }]
            : events
          ).map((ev, i) => (
            <FadeInView key={ev.id} delay={i * 60} style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, overflow: 'hidden', marginBottom: SPACING.md, ...SHADOW.card }}>
              <View style={{ padding: SPACING.md, paddingBottom: SPACING.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>{ev.title}</Text>
                  <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, marginTop: 2 }}>ESUT campus • 2h ago</Text>
                </View>
                <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textLight} />
              </View>
              <View style={{ height: 180, backgroundColor: COLORS.background, marginHorizontal: SPACING.md, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {ev.imageURL ? (
                  <Image source={{ uri: ev.imageURL }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                  <Ionicons name="image-outline" size={40} color={COLORS.border} />
                )}
              </View>
              <View style={{ padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: FONT_SIZE.caption + 1, color: COLORS.textLight, flex: 1 }} numberOfLines={1}>{ev.description}</Text>
                <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="heart" size={14} color={COLORS.primaryRed} />
                    <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, fontWeight: FONT_WEIGHT.semiBold }}>{ev.likes || 0}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="chatbubble" size={13} color={COLORS.textLight} />
                    <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, fontWeight: FONT_WEIGHT.semiBold }}>{ev.comments || 0}</Text>
                  </View>
                </View>
              </View>
            </FadeInView>
          ))}

          {/* MARKETPLACE — horizontal FlatList style scroll */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.sm, marginBottom: SPACING.sm }}>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>Marketplace</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')}>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.primaryRed, fontWeight: FONT_WEIGHT.bold }}>See All ›</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.lg }}>
            {(marketItems.length === 0
              ? [
                  { id: '1', title: 'Laptop for Sale', price: 120000 },
                  { id: '2', title: 'Textbooks Bundle', price: 5000 },
                ]
              : marketItems
            ).map(item => (
              <ProductCard key={item.id} item={item} onPress={() => router.push({ pathname: '/marketplace/[id]', params: { id: item.id } })} width={150} />
            ))}
          </ScrollView>

          {/* SUBSCRIPTION BANNER */}
          <FadeInView style={{ backgroundColor: COLORS.primaryRed, borderRadius: RADIUS.md, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: COLORS.white, fontSize: FONT_SIZE.body, flex: 1, marginRight: SPACING.sm }}>
              <Text style={{ fontWeight: FONT_WEIGHT.bold }}>Earn 500 Naira Monthly!</Text> Subscribe Now!
            </Text>
            <TouchableOpacity style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: 8, minHeight: 36 }}>
              <Text style={{ color: COLORS.primaryRed, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.caption }}>Subscribe</Text>
            </TouchableOpacity>
          </FadeInView>
        </View>
      </ScrollView>

      {/* Bottom tab bar (mobile only — Sidebar self-detects width) */}
      <Sidebar />

      <PostModal
        visible={showPostModal}
        onClose={() => setShowPostModal(false)}
        text={postText}
        onChangeText={setPostText}
        onSubmit={submitPost}
        posting={posting}
        avatar={avatar}
        name={profile?.fullName}
      />
    </SafeAreaView>
  );
}

// ── Shared "Create Post" modal ──────────────────────────────────────────────
interface PostModalProps {
  visible: boolean;
  onClose: () => void;
  text: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  posting: boolean;
  avatar?: string | null;
  name?: string;
}
function PostModal({ visible, onClose, text, onChangeText, onSubmit, posting, avatar, name }: PostModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Text style={{ color: COLORS.textLight, fontSize: FONT_SIZE.body }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.cardTitle, color: COLORS.textDark }}>Create Post</Text>
            <TouchableOpacity
              onPress={onSubmit}
              disabled={!text.trim() || posting}
              style={{ backgroundColor: text.trim() ? COLORS.primaryRed : COLORS.border, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.lg, paddingVertical: 8 }}>
              <Text style={{ color: text.trim() ? COLORS.white : COLORS.textLight, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.caption }}>
                {posting ? 'Posting...' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: SPACING.lg, flexDirection: 'row', gap: SPACING.sm }}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: 18 }}>{(name || 'U')[0]}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.body, color: COLORS.textDark, marginBottom: SPACING.sm }}>{name}</Text>
              <TextInput
                style={{ fontSize: FONT_SIZE.cardTitle, color: COLORS.textDark, minHeight: 120, textAlignVertical: 'top' }}
                placeholder="What's on your mind?"
                placeholderTextColor={COLORS.textLight}
                value={text}
                onChangeText={onChangeText}
                multiline
                autoFocus
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}