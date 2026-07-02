
import { memo, useState } from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  doc, updateDoc, arrayUnion, arrayRemove, deleteDoc,
  addDoc, collection, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import FadeInView from '../FadeInView';
import { GroupPost } from '../../hooks/useGroup';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW } from '../../constants/theme';

function timeAgo(ts: any) {
  if (!ts?.seconds) return 'just now';
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  post: GroupPost;
  canDelete: boolean;
  delay?: number;
}

function GroupPostCard({ post, canDelete, delay = 0 }: Props) {
  const { user, profile } = useAuth();
  const [liked, setLiked] = useState(post.likes?.includes(user?.uid || ''));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);

  const toggleLike = async () => {
    const ref = doc(db, 'groupPosts', post.id);
    if (liked) {
      await updateDoc(ref, { likes: arrayRemove(user!.uid) });
      setLikesCount(c => c - 1);
    } else {
      await updateDoc(ref, { likes: arrayUnion(user!.uid) });
      setLikesCount(c => c + 1);
      if (post.authorId !== user!.uid) {
        addDoc(collection(db, 'notifications'), {
          type: 'post_like', recipientId: post.authorId,
          senderId: user!.uid, senderName: profile?.fullName ?? 'User',
          message: `${profile?.fullName ?? 'User'} liked your group post`,
          groupId: post.groupId, createdAt: serverTimestamp(), read: false,
        }).catch(() => {});
      }
    }
    setLiked(v => !v);
  };

  const handleDelete = () => {
    Alert.alert('Delete post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDoc(doc(db, 'groupPosts', post.id)).catch(() => {}) },
    ]);
  };

  return (
    <FadeInView delay={delay} style={{
      backgroundColor: COLORS.white, borderRadius: RADIUS.md,
      marginBottom: SPACING.md, overflow: 'hidden', ...SHADOW.card,
      ...(post.isAnnouncement ? { borderLeftWidth: 4, borderLeftColor: COLORS.primaryRed } : {}),
    }}>
      {post.isAnnouncement && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', paddingHorizontal: SPACING.md, paddingVertical: 6 }}>
          <Ionicons name="megaphone" size={13} color={COLORS.primaryRed} />
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.primaryRed, fontWeight: FONT_WEIGHT.bold, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Announcement
          </Text>
        </View>
      )}

      <View style={{ padding: SPACING.md }}>
        {/* Author row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
          {post.authorPhoto ? (
            <Image source={{ uri: post.authorPhoto }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          ) : (
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>{(post.authorName || 'U')[0]}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>{post.authorName}</Text>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>{timeAgo(post.createdAt)}</Text>
          </View>
          {canDelete && (
            <TouchableOpacity onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        {!!post.content && (
          <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textDark, lineHeight: 22, marginBottom: post.mediaUrl ? SPACING.sm : 0 }}>
            {post.content}
          </Text>
        )}
      </View>

      {/* Media */}
      {post.mediaUrl && (
        post.mediaType === 'image'
          ? <Image source={{ uri: post.mediaUrl }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
          : <View style={{ height: 180, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play-circle" size={54} color={COLORS.white} />
            </View>
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: SPACING.md }}>
        <TouchableOpacity onPress={toggleLike} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, minHeight: 44 }}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? COLORS.primaryRed : COLORS.textLight} />
          <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.semiBold, color: liked ? COLORS.primaryRed : COLORS.textLight }}>
            {likesCount} Like{likesCount !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 }}>
          <Ionicons name="chatbubble-outline" size={16} color={COLORS.textLight} />
          <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textLight }}>
            {post.commentsCount || 0} Comments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 }}>
          <Ionicons name="share-social-outline" size={16} color={COLORS.textLight} />
          <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textLight }}>Share</Text>
        </TouchableOpacity>
      </View>
    </FadeInView>
  );
}

export default memo(GroupPostCard, (prev, next) =>
  prev.post.id === next.post.id &&
  prev.post.likes?.length === next.post.likes?.length &&
  prev.post.commentsCount === next.post.commentsCount
);