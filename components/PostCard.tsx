// components/PostCard.tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';

function timeAgo(ts: any) {
  if (!ts?.seconds) return 'just now';
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function PostCard({ post }: { post: any }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [liked, setLiked] = useState(post.likes?.includes(user!.uid));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);

  const toggleLike = async () => {
    const postRef = doc(db, 'posts', post.id);
    if (liked) {
      await updateDoc(postRef, { likes: arrayRemove(user!.uid) });
      setLikesCount((c: number) => c - 1);
    } else {
      await updateDoc(postRef, { likes: arrayUnion(user!.uid) });
      setLikesCount((c: number) => c + 1);
      if (post.authorId !== user!.uid) {
        await addDoc(collection(db, 'notifications'), {
          type: 'post_like', recipientId: post.authorId,
          senderId: user!.uid, senderName: profile?.fullName,
          message: `${profile?.fullName} liked your post`,
          postId: post.id, createdAt: serverTimestamp(), read: false,
        });
      }
    }
    setLiked(!liked);
  };

  return (
    <View className="bg-white rounded-2xl p-4 mb-3"
      style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 }}>
      {/* Header */}
      <View className="flex-row items-center gap-3 mb-3">
        {post.authorPhoto ? (
          <Image source={{ uri: post.authorPhoto }} className="w-10 h-10 rounded-full" />
        ) : (
          <View className="w-10 h-10 rounded-full bg-[#C0392B] items-center justify-center">
            <Text className="text-white font-black">{(post.authorName || 'U')[0]}</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="text-gray-900 font-black text-sm">{post.authorName}</Text>
          <Text className="text-gray-400 text-xs">{post.authorDept}  •  {timeAgo(post.createdAt)}</Text>
        </View>
        <Ionicons name="ellipsis-horizontal" size={18} color="#ccc" />
      </View>

      {/* Content */}
      <Text className="text-gray-700 text-sm leading-5 mb-3">{post.text}</Text>

      {/* Actions */}
      <View className="flex-row border-t border-gray-100 pt-3 gap-1">
        <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-1.5" onPress={toggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={19} color={liked ? '#E74C3C' : '#888'} />
          <Text className={`text-xs font-bold ${liked ? 'text-red-500' : 'text-gray-400'}`}>{likesCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-1.5">
          <Ionicons name="chatbubble-outline" size={18} color="#888" />
          <Text className="text-xs font-bold text-gray-400">{post.commentsCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 flex-row items-center justify-center gap-1.5">
          <Ionicons name="share-social-outline" size={18} color="#888" />
          <Text className="text-xs font-bold text-gray-400">Share</Text>
        </TouchableOpacity>
        {post.authorId !== user!.uid && (
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center gap-1.5"
            onPress={() => router.push({ pathname: '/chat', params: { recipientId: post.authorId, recipientName: post.authorName } })}>
            <Ionicons name="paper-plane-outline" size={18} color="#888" />
            <Text className="text-xs font-bold text-gray-400">DM</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}