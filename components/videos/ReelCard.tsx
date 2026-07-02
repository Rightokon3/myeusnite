import { useState, useEffect, useRef, memo } from 'react';
import { View, Text, TouchableWithoutFeedback, StyleSheet, Animated, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import {
  doc, updateDoc, arrayUnion, arrayRemove, increment,
  addDoc, collection, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '../../constants/theme';

interface ReelCardProps {
  item: any;
  isActive: boolean;
  userId: string;
  width: number;
  height: number;
  onOpenComments: () => void;
  onOpenMore: () => void;
}

function ReelCard({ item, isActive, userId, width, height, onOpenComments, onOpenMore }: ReelCardProps) {
  const videoRef = useRef<any>(null);
  const [liked, setLiked] = useState(item.likes?.includes(userId));
  const [likesCount, setLikesCount] = useState(item.likes?.length || 0);
  const [paused, setPaused] = useState(!isActive);
  const hasTrackedView = useRef(false);

  const lastTap = useRef<number>(0);
  const heartScale = useRef(new Animated.Value(0)).current;
  const likeIconScale = useRef(new Animated.Value(1)).current;

  const bounceLikeIcon = () => {
    Animated.sequence([
      Animated.spring(likeIconScale, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
      Animated.spring(likeIconScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
  };

  useEffect(() => {
    if (isActive) {
      videoRef.current?.playAsync();
      setPaused(false);
      if (!hasTrackedView.current) {
        hasTrackedView.current = true;
        updateDoc(doc(db, 'videos', item.id), { views: increment(1) }).catch(() => {});
      }
    } else {
      videoRef.current?.pauseAsync();
      setPaused(true);
    }
  }, [isActive]);

  const doLike = async (forceLike = false) => {
    const vRef = doc(db, 'videos', item.id);
    if (liked && !forceLike) {
      await updateDoc(vRef, { likes: arrayRemove(userId) });
      setLikesCount((c: number) => c - 1);
      setLiked(false);
    } else if (!liked) {
      await updateDoc(vRef, { likes: arrayUnion(userId) });
      setLikesCount((c: number) => c + 1);
      setLiked(true);
      if (item.authorId !== userId) {
        addDoc(collection(db, 'notifications'), {
          type: 'video_like', recipientId: item.authorId, senderId: userId,
          message: 'Someone liked your video', videoId: item.id,
          createdAt: serverTimestamp(), read: false,
        }).catch(() => {});
      }
    }
  };

  const burstHeart = () => {
    heartScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
      Animated.timing(heartScale, { toValue: 0, duration: 250, delay: 350, useNativeDriver: true }),
    ]).start();
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      // Double tap → like + heart burst
      doLike(true);
      burstHeart();
      bounceLikeIcon();
    } else {
      setTimeout(() => {
        if (Date.now() - lastTap.current >= 280) setPaused(p => !p);
      }, 280);
    }
    lastTap.current = now;
  };

  return (
    <TouchableWithoutFeedback onPress={handleTap} onLongPress={onOpenMore}>
      <View style={{ width, height, backgroundColor: '#000' }}>
        <Video
          ref={videoRef}
          source={{ uri: item.videoUrl }}
          style={StyleSheet.absoluteFillObject}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={isActive}
        />

        {/* Gradient-ish overlay via semi-transparent black bottom panel */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: SPACING.lg }}>
          <View style={{ paddingHorizontal: SPACING.md, paddingRight: 80 }}>
            {/* Author row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.sm }}>
              {item.authorPhoto ? (
                <Image source={{ uri: item.authorPhoto }} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: COLORS.white }} />
              ) : (
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.white }}>
                  <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>{(item.authorName || 'U')[0]}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.body }}>{item.authorName}</Text>
                {!!item.authorDept && (
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: FONT_SIZE.caption }}>{item.authorDept}</Text>
                )}
              </View>
            </View>

            {!!item.caption && (
              <Text style={{ color: COLORS.white, fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.medium, marginBottom: 4 }} numberOfLines={3}>
                {item.caption}
              </Text>
            )}
            {item.hashtags?.length > 0 && (
              <Text style={{ color: COLORS.goldBadge, fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.semiBold }}>
                {item.hashtags.map((h: string) => `#${h}`).join(' ')}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Ionicons name="eye-outline" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{item.views || 0} views</Text>
            </View>
          </View>
        </View>

        {/* Right action rail */}
        <View style={{ position: 'absolute', right: SPACING.md, bottom: SPACING.xl + 30, alignItems: 'center', gap: SPACING.lg }}>
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Animated.View style={{ transform: [{ scale: likeIconScale }] }}>
              <TouchableWithoutFeedback onPress={() => { doLike(); bounceLikeIcon(); }}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={30} color={liked ? '#FF3B5C' : COLORS.white} />
              </TouchableWithoutFeedback>
            </Animated.View>
            <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: FONT_WEIGHT.bold }}>{likesCount}</Text>
          </View>

          <TouchableWithoutFeedback onPress={onOpenComments}>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Ionicons name="chatbubble-ellipses" size={27} color={COLORS.white} />
              <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: FONT_WEIGHT.bold }}>{item.commentsCount || 0}</Text>
            </View>
          </TouchableWithoutFeedback>

          <TouchableWithoutFeedback>
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Ionicons name="share-social" size={26} color={COLORS.white} />
              <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: FONT_WEIGHT.bold }}>Share</Text>
            </View>
          </TouchableWithoutFeedback>

          <TouchableWithoutFeedback onPress={onOpenMore}>
            <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.white} />
          </TouchableWithoutFeedback>
        </View>

        {/* Double-tap heart burst */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute', top: '40%', left: '50%', marginLeft: -45, marginTop: -45,
            transform: [{ scale: heartScale }],
          }}>
          <Ionicons name="heart" size={90} color="rgba(255,255,255,0.95)" />
        </Animated.View>

        {/* Pause indicator */}
        {paused && (
          <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
            <Ionicons name="play-circle" size={68} color="rgba(255,255,255,0.75)" />
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

export default memo(ReelCard, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.isActive === next.isActive &&
  prev.item.likes?.length === next.item.likes?.length &&
  prev.item.commentsCount === next.item.commentsCount &&
  prev.item.views === next.item.views
);