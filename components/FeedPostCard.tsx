// components/FeedPostCard.tsx
import { memo, useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import FadeInView from './FadeInView';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW } from '../constants/theme';

function timeAgo(ts: any) {
  if (!ts?.seconds) return 'just now';
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  post: any;
  delay?: number;
}

function FeedPostCard({ post, delay = 0 }: Props) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(post.likes?.includes(user?.uid));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);

  const toggleLike = useCallback(async () => {
    const postRef = doc(db, 'posts', post.id);
    if (liked) {
      await updateDoc(postRef, { likes: arrayRemove(user!.uid) });
      setLikesCount((c: number) => c - 1);
    } else {
      await updateDoc(postRef, { likes: arrayUnion(user!.uid) });
      setLikesCount((c: number) => c + 1);
      if (post.authorId !== user!.uid) {
        await addDoc(collection(db, 'notifications'), {
          type: 'post_like',
          recipientId: post.authorId,
          senderId: user!.uid,
          senderName: profile?.fullName ?? 'User',
          message: `${profile?.fullName ?? 'User'} liked your post`,
          postId: post.id,
          createdAt: serverTimestamp(),
          read: false,
        });
      }
    }
    setLiked((v: boolean) => !v);
  }, [liked, post, user, profile]);

  return (
    <FadeInView delay={delay} style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOW.card }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm }}>
        {post.authorPhoto ? (
          <Image source={{ uri: post.authorPhoto }} style={{ width: 42, height: 42, borderRadius: 21 }} />
        ) : (
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>{(post.authorName || 'U')[0]}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>{post.authorName}</Text>
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>
            {post.authorDept}{post.authorDept ? '  •  ' : ''}{timeAgo(post.createdAt)}
          </Text>
        </View>
        <TouchableOpacity hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Text content */}
      {!!post.text && (
        <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textDark, lineHeight: 21, marginBottom: post.imageUrl ? SPACING.sm : SPACING.md }}>
          {post.text}
        </Text>
      )}

      {/* Image */}
      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={{ width: '100%', height: 220, borderRadius: RADIUS.sm, marginBottom: SPACING.sm }}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.sm, gap: 4 }}>
        <TouchableOpacity onPress={toggleLike} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={19} color={liked ? COLORS.primaryRed : COLORS.textLight} />
          <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.semiBold, color: liked ? COLORS.primaryRed : COLORS.textLight }}>
            {likesCount} Like{likesCount === 1 ? '' : 's'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}>
          <Ionicons name="chatbubble-outline" size={17} color={COLORS.textLight} />
          <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textLight }}>
            {post.commentsCount || 0} Comments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 44 }}>
          <Ionicons name="share-social-outline" size={17} color={COLORS.textLight} />
          <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textLight }}>Share</Text>
        </TouchableOpacity>
      </View>
    </FadeInView>
  );
}

export default memo(FeedPostCard, (prev, next) =>
  prev.post.id === next.post.id &&
  prev.post.likes?.length === next.post.likes?.length &&
  prev.post.commentsCount === next.post.commentsCount
);