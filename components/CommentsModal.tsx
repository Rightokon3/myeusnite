// components/CommentsModal.tsx
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image, Modal, TextInput,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import {
  Comment, Reply,
  addComment, deleteComment, toggleCommentLike,
  addReply, toggleReplyLike,
} from '../utils/social';

function timeAgo(ts: any) {
  if (!ts?.seconds) return 'now';
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function Avatar({ uri, name, size = 32 }: { uri?: string | null; name: string; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-[#C0392B] items-center justify-center"
    >
      <Text className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
        {(name || 'U')[0].toUpperCase()}
      </Text>
    </View>
  );
}

// ---------- Single Reply Row ----------

function ReplyRow({ postId, commentId, reply }: { postId: string; commentId: string; reply: Reply }) {
  const { user } = useAuth();
  const liked = reply.likes?.includes(user!.uid);

  const onLike = () => {
    toggleReplyLike(postId, commentId, reply.id, user!.uid, !!liked);
  };

  return (
    <View className="flex-row mb-3 ml-10">
      <Avatar uri={reply.authorPhoto} name={reply.authorName} size={26} />
      <View className="flex-1 ml-2">
        <View className="bg-gray-100 rounded-2xl px-3 py-2">
          <Text className="text-gray-900 font-bold text-xs">{reply.authorName}</Text>
          <Text className="text-gray-700 text-sm mt-0.5">{reply.text}</Text>
        </View>
        <View className="flex-row items-center mt-1 ml-2 gap-3">
          <Text className="text-gray-400 text-[11px]">{timeAgo(reply.createdAt)}</Text>
          <TouchableOpacity onPress={onLike}>
            <Text className={`text-[11px] font-bold ${liked ? 'text-[#C0392B]' : 'text-gray-400'}`}>
              Like{reply.likes?.length ? ` · ${reply.likes.length}` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ---------- Single Comment Row (with its replies) ----------

function CommentRow({ postId, comment }: { postId: string; comment: Comment }) {
  const { user, profile } = useAuth();
  const liked = comment.likes?.includes(user!.uid);

  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [repliesLoaded, setRepliesLoaded] = useState(false);

  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    if (!showReplies) return;

    const q = query(
      collection(db, 'posts', postId, 'comments', comment.id, 'replies'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setReplies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reply)));
      setRepliesLoaded(true);
    });
    return () => unsub();
  }, [showReplies, postId, comment.id]);

  const onLikeComment = () => {
    toggleCommentLike(postId, comment.id, user!.uid, !!liked);
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      await addReply(postId, comment.id, {
        text: replyText,
        authorId: user!.uid,
        authorName: profile?.fullName || 'User',
        authorPhoto: profile?.photoURL,
      });
      setReplyText('');
      setShowReplyInput(false);
      setShowReplies(true); // auto-expand so they see their own reply
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <View className="mb-4">
      <View className="flex-row">
        <Avatar uri={comment.authorPhoto} name={comment.authorName} size={32} />
        <View className="flex-1 ml-2">
          <View className="bg-gray-100 rounded-2xl px-3 py-2">
            <Text className="text-gray-900 font-bold text-sm">{comment.authorName}</Text>
            <Text className="text-gray-700 text-sm mt-0.5">{comment.text}</Text>
          </View>

          {/* Action row — Facebook-style: Like · Reply · time, all inline */}
          <View className="flex-row items-center mt-1 ml-2 gap-4">
            <Text className="text-gray-400 text-xs">{timeAgo(comment.createdAt)}</Text>
            <TouchableOpacity onPress={onLikeComment}>
              <Text className={`text-xs font-bold ${liked ? 'text-[#C0392B]' : 'text-gray-400'}`}>
                Like{comment.likes?.length ? ` · ${comment.likes.length}` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowReplyInput(v => !v)}>
              <Text className="text-xs font-bold text-gray-400">Reply</Text>
            </TouchableOpacity>
          </View>

          {/* View replies toggle — Facebook-style "View 3 replies" */}
          {comment.repliesCount > 0 && (
            <TouchableOpacity
              className="ml-2 mt-2 flex-row items-center"
              onPress={() => setShowReplies(v => !v)}
            >
              <View className="w-5 h-[1px] bg-gray-300 mr-2" />
              <Text className="text-xs font-bold text-gray-500">
                {showReplies ? 'Hide replies' : `View ${comment.repliesCount} ${comment.repliesCount === 1 ? 'reply' : 'replies'}`}
              </Text>
            </TouchableOpacity>
          )}

          {showReplies && !repliesLoaded && (
            <ActivityIndicator size="small" color="#C0392B" style={{ marginTop: 8, marginLeft: 8 }} />
          )}

          {showReplies && repliesLoaded && (
            <View className="mt-2">
              {replies.map(r => (
                <ReplyRow key={r.id} postId={postId} commentId={comment.id} reply={r} />
              ))}
            </View>
          )}

          {/* Reply input — LinkedIn-style inline box that appears under the comment */}
          {showReplyInput && (
            <View className="flex-row items-center mt-2 ml-2">
              <Avatar uri={profile?.photoURL} name={profile?.fullName || 'U'} size={24} />
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder={`Reply to ${comment.authorName}...`}
                className="flex-1 bg-gray-100 rounded-full px-3 py-2 ml-2 text-sm"
                onSubmitEditing={submitReply}
                returnKeyType="send"
                autoFocus
              />
              <TouchableOpacity onPress={submitReply} disabled={sendingReply} className="ml-2">
                {sendingReply ? (
                  <ActivityIndicator size="small" color="#C0392B" />
                ) : (
                  <Ionicons name="send" size={18} color="#C0392B" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ---------- Main Modal ----------

export default function CommentsModal({
  visible,
  onClose,
  postId,
}: {
  visible: boolean;
  onClose: () => void;
  postId: string;
}) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!visible) return;

    setLoading(true);
    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'desc') // newest first, Facebook-style
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
      setLoading(false);
    });

    return () => unsub();
  }, [visible, postId]);

  const submitComment = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await addComment(postId, {
        text,
        authorId: user!.uid,
        authorName: profile?.fullName || 'User',
        authorPhoto: profile?.photoURL,
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <View style={{ width: 24 }} />
          <Text className="text-base font-bold text-gray-900">Comments</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {loading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator color="#C0392B" />
            </View>
          ) : comments.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <Ionicons name="chatbubble-outline" size={40} color="#ddd" />
              <Text className="text-gray-400 mt-3 text-center">
                No comments yet. Be the first to say something!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={comments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => <CommentRow postId={postId} comment={item} />}
              keyboardShouldPersistTaps="handled"
            />
          )}

          {/* Composer — LinkedIn-style persistent bottom bar */}
          <View className="flex-row items-center px-4 py-3 border-t border-gray-100">
            <Avatar uri={profile?.photoURL} name={profile?.fullName || 'U'} size={32} />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Write a comment..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 ml-2 text-sm"
              onSubmitEditing={submitComment}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity onPress={submitComment} disabled={sending || !text.trim()} className="ml-2">
              {sending ? (
                <ActivityIndicator size="small" color="#C0392B" />
              ) : (
                <Ionicons
                  name="send"
                  size={22}
                  color={text.trim() ? '#C0392B' : '#ccc'}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}