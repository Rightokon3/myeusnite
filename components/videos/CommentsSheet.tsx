import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, Modal,
  KeyboardAvoidingView, Platform, Image, Animated, PanResponder,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
  doc, updateDoc, arrayUnion, arrayRemove, increment,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.75;

interface CommentDoc {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string | null;
  likes?: string[];
  createdAt: any;
  parentId?: string | null;
}

function timeAgo(ts: any) {
  if (!ts?.seconds) return 'now';
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  videoId: string;
}

export default function CommentsSheet({ visible, onClose, videoId }: Props) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<CommentDoc[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<CommentDoc | null>(null);
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SHEET_HEIGHT,
      useNativeDriver: true,
      bounciness: 2,
    }).start();
  }, [visible]);

  // Drag-to-close handle
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) onClose();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (!visible || !videoId) return;
    const q = query(collection(db, 'videos', videoId, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() } as CommentDoc)));
    });
    return unsub;
  }, [visible, videoId]);

  // Group into top-level + nested replies
  const threaded = useMemo(() => {
    const topLevel = comments.filter(c => !c.parentId);
    const repliesOf = (id: string) => comments.filter(c => c.parentId === id);
    return topLevel.map(c => ({ ...c, replies: repliesOf(c.id) }));
  }, [comments]);

  const post = async () => {
    if (!text.trim() || !user) return;
    setPosting(true);
    try {
      await addDoc(collection(db, 'videos', videoId, 'comments'), {
        text: text.trim(),
        authorId: user.uid,
        authorName: profile?.fullName ?? 'User',
        authorPhoto: profile?.photoURL ?? null,
        likes: [],
        parentId: replyTo?.id ?? null,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'videos', videoId), { commentsCount: increment(1) });
      setText('');
      setReplyTo(null);
    } finally {
      setPosting(false);
    }
  };

  const toggleCommentLike = async (comment: CommentDoc) => {
    if (!user) return;
    const ref = doc(db, 'videos', videoId, 'comments', comment.id);
    const liked = comment.likes?.includes(user.uid);
    await updateDoc(ref, { likes: liked ? arrayRemove(user.uid) : arrayUnion(user.uid) });
  };

  const Avatar = ({ uri, name, size = 34 }: { uri?: string | null; name: string; size?: number }) => (
    uri ? (
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    ) : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: size * 0.4 }}>{(name || 'U')[0]}</Text>
      </View>
    )
  );

  const CommentRow = ({ comment, isReply = false }: { comment: CommentDoc; isReply?: boolean }) => {
    const liked = comment.likes?.includes(user?.uid || '');
    return (
      <View style={{ flexDirection: 'row', gap: SPACING.sm, paddingLeft: isReply ? 40 : 0, marginBottom: SPACING.md }}>
        <Avatar uri={comment.authorPhoto} name={comment.authorName} size={isReply ? 28 : 34} />
        <View style={{ flex: 1 }}>
          <View style={{ backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.sm }}>
            <Text style={{ fontSize: FONT_SIZE.caption + 1, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>
              {comment.authorName}
            </Text>
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textDark, marginTop: 2 }}>{comment.text}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: 4, paddingLeft: SPACING.sm }}>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>{timeAgo(comment.createdAt)}</Text>
            <TouchableOpacity onPress={() => toggleCommentLike(comment)} hitSlop={6}>
              <Text style={{ fontSize: FONT_SIZE.caption, color: liked ? COLORS.primaryRed : COLORS.textLight, fontWeight: FONT_WEIGHT.bold }}>
                Like{comment.likes?.length ? ` (${comment.likes.length})` : ''}
              </Text>
            </TouchableOpacity>
            {!isReply && (
              <TouchableOpacity onPress={() => { setReplyTo(comment); inputRef.current?.focus(); }} hitSlop={6}>
                <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, fontWeight: FONT_WEIGHT.bold }}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={{
            height: SHEET_HEIGHT,
            backgroundColor: COLORS.white,
            borderTopLeftRadius: RADIUS.lg,
            borderTopRightRadius: RADIUS.lg,
            transform: [{ translateY }],
          }}>
          {/* Drag handle */}
          <View {...pan.panHandlers} style={{ alignItems: 'center', paddingVertical: SPACING.sm }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>
              {comments.length} Comment{comments.length === 1 ? '' : 's'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
            <FlatList
              data={threaded}
              keyExtractor={c => c.id}
              contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.md }}
              renderItem={({ item }) => (
                <View>
                  <CommentRow comment={item} />
                  {item.replies.map(reply => (
                    <CommentRow key={reply.id} comment={reply} isReply />
                  ))}
                </View>
              )}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 50, gap: SPACING.sm }}>
                  <Ionicons name="chatbubble-outline" size={40} color={COLORS.border} />
                  <Text style={{ color: COLORS.textLight }}>No comments yet. Be the first!</Text>
                </View>
              }
            />

            {replyTo && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: 6, backgroundColor: COLORS.background }}>
                <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>
                  Replying to <Text style={{ fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>{replyTo.authorName}</Text>
                </Text>
                <TouchableOpacity onPress={() => setReplyTo(null)} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <Avatar uri={profile?.photoURL} name={profile?.fullName ?? 'U'} size={32} />
              <TextInput
                ref={inputRef}
                value={text}
                onChangeText={setText}
                placeholder={replyTo ? `Reply to ${replyTo.authorName}...` : 'Add a comment...'}
                placeholderTextColor={COLORS.textLight}
                style={{
                  flex: 1, backgroundColor: COLORS.background, borderRadius: RADIUS.pill,
                  paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: FONT_SIZE.body, color: COLORS.textDark,
                }}
              />
              <TouchableOpacity
                onPress={post}
                disabled={!text.trim() || posting}
                style={{
                  width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: text.trim() ? COLORS.primaryRed : COLORS.border,
                }}>
                {posting ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="send" size={15} color={COLORS.white} />}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}