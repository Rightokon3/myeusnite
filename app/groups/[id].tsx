import { useState, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, FlatList, TextInput,
  SafeAreaView, ScrollView, Alert, useWindowDimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  addDoc, collection, serverTimestamp, doc, deleteDoc, updateDoc, increment,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useGroup } from '../../hooks/useGroup';
import { uploadToCloudinary } from '../../utils/cloudinary';
import GroupPostCard from '../../components/groups/GroupPostCard';
import FadeInView from '../../components/FadeInView';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW, DESKTOP_BREAKPOINT,
} from '../../constants/theme';

type Tab = 'posts' | 'members' | 'about' | 'chat';

const TABS: { key: Tab; icon: any; label: string }[] = [
  { key: 'posts',   icon: 'newspaper-outline',   label: 'Posts'   },
  { key: 'members', icon: 'people-outline',       label: 'Members' },
  { key: 'about',   icon: 'information-circle-outline', label: 'About' },
  { key: 'chat',    icon: 'chatbubbles-outline',  label: 'Chat'    },
];

export default function GroupProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const { group, members, posts, isMember, isOwner, can, join, leave } = useGroup(id || '');

  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [postText, setPostText] = useState('');
  const [isAnnounce, setIsAnnounce] = useState(false);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const handleJoinLeave = useCallback(async () => {
    if (isMember) {
      Alert.alert('Leave group?', `You'll no longer see ${group?.name} posts.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: leave },
      ]);
    } else {
      await join();
    }
  }, [isMember, join, leave, group]);

  const pickMedia = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    });
    if (!res.canceled) setMediaUri(res.assets[0].uri);
  }, []);

  const submitPost = useCallback(async () => {
    if (!postText.trim() && !mediaUri) return;
    if (!can.post) return Alert.alert('Join the group to post');
    setPosting(true);
    try {
      let mediaUrl: string | null = null;
      if (mediaUri) {
        mediaUrl = await uploadToCloudinary({ uri: mediaUri, resourceType: 'image', folder: 'group_posts' });
      }
      await addDoc(collection(db, 'groupPosts'), {
        groupId: id,
        authorId: user!.uid,
        authorName: profile?.fullName || 'User',
        authorPhoto: profile?.photoURL || null,
        content: postText.trim(),
        mediaUrl,
        mediaType: mediaUrl ? 'image' : null,
        isAnnouncement: isAnnounce && isOwner,
        likes: [],
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'groups', id), { postsCount: increment(1) });
      setPostText(''); setMediaUri(null); setIsAnnounce(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setPosting(false);
    }
  }, [postText, mediaUri, can, isOwner, id, user, profile, isAnnounce]);

  if (!group) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={COLORS.primaryRed} />
      </SafeAreaView>
    );
  }

  // ── Posts tab content ──────────────────────────────────────────────────────
  const PostsTab = (
    <FlatList
      data={posts}
      keyExtractor={p => p.id}
      contentContainerStyle={{ padding: SPACING.md, paddingBottom: 90 }}
      ListHeaderComponent={
        isMember ? (
          <View style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOW.card }}>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              {profile?.photoURL
                ? <Image source={{ uri: profile.photoURL }} style={{ width: 38, height: 38, borderRadius: 19 }} />
                : <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>{(profile?.fullName || 'U')[0]}</Text>
                  </View>
              }
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, justifyContent: 'center', height: 40 }}
                onPress={() => {}}>
                <TextInput
                  value={postText}
                  onChangeText={setPostText}
                  placeholder={`Share something with ${group.name}...`}
                  placeholderTextColor={COLORS.textLight}
                  style={{ fontSize: FONT_SIZE.body, color: COLORS.textDark }}
                  multiline
                />
              </TouchableOpacity>
            </View>

            {mediaUri && (
              <View style={{ marginTop: SPACING.sm, position: 'relative' }}>
                <Image source={{ uri: mediaUri }} style={{ width: '100%', height: 180, borderRadius: RADIUS.sm }} resizeMode="cover" />
                <TouchableOpacity onPress={() => setMediaUri(null)} style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="close" size={14} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.sm }}>
              <TouchableOpacity onPress={pickMedia} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: SPACING.sm }}>
                <Ionicons name="image-outline" size={18} color={COLORS.textLight} />
                <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>Photo</Text>
              </TouchableOpacity>
              {isOwner && (
                <TouchableOpacity
                  onPress={() => setIsAnnounce(v => !v)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: SPACING.sm, backgroundColor: isAnnounce ? '#FEF2F2' : 'transparent', borderRadius: RADIUS.sm }}>
                  <Ionicons name="megaphone-outline" size={16} color={isAnnounce ? COLORS.primaryRed : COLORS.textLight} />
                  <Text style={{ fontSize: FONT_SIZE.caption, color: isAnnounce ? COLORS.primaryRed : COLORS.textLight, fontWeight: isAnnounce ? FONT_WEIGHT.bold : FONT_WEIGHT.regular }}>
                    {isAnnounce ? 'Announcement' : 'Announce'}
                  </Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={submitPost}
                disabled={(!postText.trim() && !mediaUri) || posting}
                style={{
                  paddingHorizontal: SPACING.lg, paddingVertical: 9, borderRadius: RADIUS.pill,
                  backgroundColor: (postText.trim() || mediaUri) ? COLORS.primaryRed : COLORS.border,
                }}>
                {posting
                  ? <ActivityIndicator size="small" color={COLORS.white} />
                  : <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.caption }}>Post</Text>}
              </TouchableOpacity>
            </View>
          </View>
        ) : null
      }
      renderItem={({ item, index }) => (
        <GroupPostCard
          post={item}
          canDelete={can.deleteAnyPost || item.authorId === user?.uid}
          delay={Math.min(index, 6) * 40}
        />
      )}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 50, gap: SPACING.sm }}>
          <Ionicons name="newspaper-outline" size={44} color={COLORS.border} />
          <Text style={{ color: COLORS.textLight }}>No posts yet. Be the first to share!</Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );

  // ── Members tab ────────────────────────────────────────────────────────────
  const MembersTab = (
    <FlatList
      data={members}
      keyExtractor={m => m.id}
      contentContainerStyle={{ padding: SPACING.md, paddingBottom: 90 }}
      renderItem={({ item }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          {item.photoURL
            ? <Image source={{ uri: item.photoURL }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>{(item.displayName || 'U')[0]}</Text>
              </View>
          }
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textDark }}>{item.displayName}</Text>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>{item.department}</Text>
          </View>
          {item.role === 'owner' && (
            <View style={{ backgroundColor: COLORS.goldBadge, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: FONT_WEIGHT.bold }}>Owner</Text>
            </View>
          )}
        </View>
      )}
      ListHeaderComponent={
        <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>
          {group.memberCount || 0} Members
        </Text>
      }
    />
  );

  // ── About tab ──────────────────────────────────────────────────────────────
  const AboutTab = (
    <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 90 }}>
      {!!group.description && (
        <View>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>About</Text>
          <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textLight, lineHeight: 22 }}>{group.description}</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: SPACING.xl, flexWrap: 'wrap' }}>
        {[
          { icon: 'people-outline', label: `${group.memberCount || 0} Members` },
          { icon: 'newspaper-outline', label: `${group.postsCount || 0} Posts` },
          { icon: group.privacy === 'private' ? 'lock-closed-outline' : 'globe-outline', label: group.privacy === 'private' ? 'Private' : 'Public' },
          { icon: 'school-outline', label: group.category },
        ].map(item => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name={item.icon as any} size={16} color={COLORS.textLight} />
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textLight }}>{item.label}</Text>
          </View>
        ))}
      </View>
      {group.department && (
        <View>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: 4 }}>Department</Text>
          <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textLight }}>{group.department}</Text>
        </View>
      )}
      {group.tags?.length > 0 && (
        <View>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Tags</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {group.tags.map(tag => (
              <View key={tag} style={{ backgroundColor: COLORS.background, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 5 }}>
                <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textDark }}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {group.rules?.length > 0 && (
        <View>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Group Rules</Text>
          {group.rules.map((rule, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: SPACING.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: FONT_WEIGHT.bold }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, fontSize: FONT_SIZE.body, color: COLORS.textDark, lineHeight: 20 }}>{rule}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Back + action header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.md, paddingTop: isDesktop ? SPACING.md : 50, paddingBottom: SPACING.sm,
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.white} />
        </TouchableOpacity>
        {isOwner && (
          <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="settings-outline" size={18} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        {/* Cover photo */}
        <View style={{ height: 200, backgroundColor: COLORS.primaryRed + '44' }}>
          {group.coverPhoto
            ? <Image source={{ uri: group.coverPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="people" size={60} color={COLORS.primaryRed + '55'} />
              </View>}
        </View>

        {/* Group info card */}
        <View style={{ backgroundColor: COLORS.white, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md, ...SHADOW.card }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -26 }}>
            {group.avatar
              ? <Image source={{ uri: group.avatar }} style={{ width: 64, height: 64, borderRadius: 16, borderWidth: 3, borderColor: COLORS.white }} />
              : <View style={{ width: 64, height: 64, borderRadius: 16, borderWidth: 3, borderColor: COLORS.white, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: 22 }}>{(group.name || 'G')[0]}</Text>
                </View>}
            <TouchableOpacity
              onPress={handleJoinLeave}
              style={{
                paddingHorizontal: SPACING.xl, paddingVertical: 10, borderRadius: RADIUS.pill,
                backgroundColor: isMember ? COLORS.background : COLORS.primaryRed,
                borderWidth: isMember ? 1 : 0, borderColor: COLORS.border,
              }}>
              <Text style={{ fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: isMember ? COLORS.textDark : COLORS.white }}>
                {isMember ? 'Joined ✓' : '+ Join Group'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: FONT_SIZE.header, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginTop: SPACING.sm }}>{group.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name={group.privacy === 'private' ? 'lock-closed' : 'globe-outline'} size={13} color={COLORS.textLight} />
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, textTransform: 'capitalize' }}>{group.privacy}</Text>
            </View>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>• {group.memberCount || 0} members</Text>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>• {group.category}</Text>
          </View>
          {!!group.description && (
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textLight, marginTop: SPACING.sm, lineHeight: 20 }} numberOfLines={2}>
              {group.description}
            </Text>
          )}
        </View>

        {/* Sticky tab bar */}
        <View style={{ backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md }}>
            <View style={{ flexDirection: 'row' }}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => tab.key === 'chat'
                    ? router.push({ pathname: '/chat', params: { roomId: id, roomName: group.name } })
                    : setActiveTab(tab.key)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingVertical: 14, paddingHorizontal: SPACING.md,
                    borderBottomWidth: activeTab === tab.key ? 2 : 0,
                    borderBottomColor: COLORS.primaryRed,
                    marginRight: 4,
                  }}>
                  <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? COLORS.primaryRed : COLORS.textLight} />
                  <Text style={{ fontSize: FONT_SIZE.body, fontWeight: activeTab === tab.key ? FONT_WEIGHT.bold : FONT_WEIGHT.medium, color: activeTab === tab.key ? COLORS.primaryRed : COLORS.textLight }}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Tab content */}
        {activeTab === 'posts'   && PostsTab}
        {activeTab === 'members' && MembersTab}
        {activeTab === 'about'   && AboutTab}
      </ScrollView>
    </SafeAreaView>
  );
}