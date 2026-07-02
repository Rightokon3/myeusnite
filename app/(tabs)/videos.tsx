import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, Dimensions, TouchableOpacity,
  SafeAreaView, useWindowDimensions, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../../components/Sidebar';
import ReelCard from '../../components/videos/ReelCard';
import CommentsSheet from '../../components/videos/CommentsSheet';
import MoreOptionsSheet from '../../components/videos/MoreOptionsSheet';
import UploadModal from '../../components/videos/UploadModal';
import VideoTabsHeader, { VideoTab } from '../../components/videos/VideoTabsHeader';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, DESKTOP_BREAKPOINT } from '../../constants/theme';

const { height: SH, width: SW } = Dimensions.get('window');

export default function VideosScreen() {
  const { user, profile } = useAuth();
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [videos, setVideos] = useState<any[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<VideoTab>('forYou');
  const [showUpload, setShowUpload] = useState(false);
  const [commentsVideoId, setCommentsVideoId] = useState<string | null>(null);
  const [moreOptionsVideo, setMoreOptionsVideo] = useState<any | null>(null);

  // Real-time published videos — same Firestore source as before
  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVideos(all.filter((v: any) => v.status !== 'draft'));
    });
  }, []);

  const displayedVideos = useMemo(() => {
    if (activeTab === 'trending') {
      return [...videos].sort((a, b) => {
        const scoreA = (a.views || 0) + (a.likes?.length || 0) * 2;
        const scoreB = (b.views || 0) + (b.likes?.length || 0) * 2;
        return scoreB - scoreA;
      });
    }
    return videos; // For You — chronological (most recent first)
  }, [videos, activeTab]);

  useEffect(() => { setActiveIdx(0); }, [activeTab]);

  const onViewable = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) setActiveIdx(viewableItems[0].index ?? 0);
  }, []);

  // On desktop the reel area is a centered phone-like column, not full width
  const reelWidth = isDesktop ? 420 : SW;
  const reelHeight = isDesktop ? Math.min(height - 40, 760) : SH;

  const Feed = (
    <View style={{ width: reelWidth, height: reelHeight, alignSelf: isDesktop ? 'center' : undefined, borderRadius: isDesktop ? 24 : 0, overflow: 'hidden', backgroundColor: '#000' }}>
      <VideoTabsHeader
        active={activeTab}
        onChange={setActiveTab}
        onSearchPress={() => {}}
        topInset={isDesktop ? SPACING.md : 54}
      />

      {displayedVideos.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm }}>
          <Ionicons name="videocam-outline" size={56} color="#555" />
          <Text style={{ color: '#888', fontSize: FONT_SIZE.body }}>No videos yet</Text>
        </View>
      ) : (
        <FlatList
          data={displayedVideos}
          keyExtractor={i => i.id}
          renderItem={({ item, index }) => (
            <ReelCard
              item={item}
              isActive={index === activeIdx}
              userId={user!.uid}
              width={reelWidth}
              height={reelHeight}
              onOpenComments={() => setCommentsVideoId(item.id)}
              onOpenMore={() => setMoreOptionsVideo(item)}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          getItemLayout={(_, i) => ({ length: reelHeight, offset: reelHeight * i, index: i })}
        />
      )}

      {/* Floating upload button */}
      <TouchableOpacity
        onPress={() => setShowUpload(true)}
        style={{
          position: 'absolute', bottom: isDesktop ? SPACING.lg : 100, right: SPACING.md,
          width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primaryRed,
          alignItems: 'center', justifyContent: 'center',
          shadowColor: COLORS.primaryRed, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 10,
        }}>
        <Ionicons name="add" size={30} color={COLORS.white} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDesktop ? COLORS.background : '#000', flexDirection: 'row' }}>
      {isDesktop && <Sidebar />}

      <View style={{ flex: 1, alignItems: isDesktop ? 'center' : undefined, justifyContent: isDesktop ? 'center' : undefined }}>
        {Feed}
      </View>

      {!isDesktop && <Sidebar />}

      <UploadModal
        visible={showUpload}
        onClose={() => setShowUpload(false)}
        onPublished={() => {}}
      />

      <CommentsSheet
        visible={!!commentsVideoId}
        onClose={() => setCommentsVideoId(null)}
        videoId={commentsVideoId || ''}
      />

      <MoreOptionsSheet
        visible={!!moreOptionsVideo}
        onClose={() => setMoreOptionsVideo(null)}
        videoId={moreOptionsVideo?.id || ''}
        isOwner={moreOptionsVideo?.authorId === user?.uid}
      />
    </SafeAreaView>
  );
}