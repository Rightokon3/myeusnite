
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, SafeAreaView,
  ScrollView, Image, ActivityIndicator, Alert, Animated, PanResponder, Dimensions,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

const SHEET_HEIGHT = Dimensions.get('window').height * 0.92;
const CAPTION_LIMIT = 300;

const CATEGORIES = ['Campus Life', 'Academics', 'Events', 'Comedy', 'Sports', 'Talent', 'Announcements'];
const AUDIENCE_OPTIONS: { key: 'everyone' | 'department' | 'followers'; label: string; icon: any }[] = [
  { key: 'everyone', label: 'Everyone', icon: 'globe-outline' },
  { key: 'department', label: 'My Department Only', icon: 'school-outline' },
  { key: 'followers', label: 'Followers Only', icon: 'people-outline' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onPublished: () => void;
}

export default function UploadModal({ visible, onClose, onPublished }: Props) {
  const { user, profile } = useAuth();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [audience, setAudience] = useState<'everyone' | 'department' | 'followers'>('everyone');
  const [tagDepartment, setTagDepartment] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    Animated.spring(translateY, { toValue: visible ? 0 : SHEET_HEIGHT, useNativeDriver: true, bounciness: 2 }).start();
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 6 && !uploading,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 && !uploading) resetAndClose();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 2 }).start();
      },
    })
  ).current;

  const resetAndClose = () => {
    if (uploading) return;
    setPickedUri(null); setDuration(null); setCaption(''); setHashtags('');
    setCategory(CATEGORIES[0]); setAudience('everyone'); setProgress(0); setPublished(false);
    onClose();
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission Required', 'Please allow media library access.');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.7,
      videoMaxDuration: 120,
    });
    if (!res.canceled && res.assets[0]) {
      setPickedUri(res.assets[0].uri);
      setDuration(res.assets[0].duration ? Math.round(res.assets[0].duration / 1000) : null);
    }
  };

  const publish = async (asDraft = false) => {
    if (!pickedUri) return Alert.alert('No video', 'Please select a video first');
    if (!caption.trim() && !asDraft) return Alert.alert('Add a caption', 'Tell viewers what this video is about');

    setUploading(true);
    setProgress(0);
    try {
      const url = await uploadToCloudinary({
        uri: pickedUri,
        resourceType: 'video',
        folder: 'videos',
        fileName: `${user!.uid}_${Date.now()}.mp4`,
        onProgress: setProgress,
      });

      await addDoc(collection(db, 'videos'), {
        videoUrl: url,
        caption: caption.trim(),
        hashtags: hashtags.split(/\s+/).filter(h => h.startsWith('#')).map(h => h.slice(1)),
        category,
        audience,
        authorId: user!.uid,
        authorName: profile?.fullName || 'User',
        authorDept: tagDepartment ? (profile?.department || '') : '',
        authorPhoto: profile?.photoURL ?? null,
        status: asDraft ? 'draft' : 'published',
        likes: [],
        views: 0,
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });

      if (!asDraft) {
        addDoc(collection(db, 'notifications'), {
          type: 'new_video', senderId: user!.uid, senderName: profile?.fullName ?? 'User',
          message: `${profile?.fullName ?? 'User'} posted a new video`,
          global: true, read: false, createdAt: serverTimestamp(),
        }).catch(() => {});
      }

      setPublished(true);
      setTimeout(() => {
        onPublished();
        resetAndClose();
      }, 1100);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: SPACING.md, paddingVertical: 9, borderRadius: RADIUS.pill,
        borderWidth: 1.5, borderColor: active ? COLORS.primaryRed : COLORS.border,
        backgroundColor: active ? COLORS.primaryRed : COLORS.white,
        marginRight: SPACING.sm, marginBottom: SPACING.sm,
      }}>
      <Text style={{ fontSize: FONT_SIZE.caption + 1, fontWeight: FONT_WEIGHT.semiBold, color: active ? COLORS.white : COLORS.textDark }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={resetAndClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <Animated.View
          style={{
            height: SHEET_HEIGHT, backgroundColor: COLORS.white,
            borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
            transform: [{ translateY }],
          }}>

          {published ? (
            // ── Success state ──────────────────────────────────────────────
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F8EC', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark-circle" size={56} color={COLORS.success} />
              </View>
              <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>
                Video Published!
              </Text>
              <Text style={{ color: COLORS.textLight }}>Your video is now live</Text>
            </View>
          ) : (
            <>
              {/* Drag handle */}
              <View {...pan.panHandlers} style={{ alignItems: 'center', paddingVertical: SPACING.sm }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border }} />
              </View>

              {/* Header with profile + title */}
              <View style={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <TouchableOpacity onPress={resetAndClose} disabled={uploading} hitSlop={8}>
                    <Text style={{ color: uploading ? COLORS.border : COLORS.textLight, fontSize: FONT_SIZE.body }}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>
                    Create Video Post
                  </Text>
                  <View style={{ width: 50 }} />
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md }}>
                  {profile?.photoURL ? (
                    <Image source={{ uri: profile.photoURL }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                  ) : (
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>{(profile?.fullName || 'U')[0]}</Text>
                    </View>
                  )}
                  <View>
                    <Text style={{ fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>{profile?.fullName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.pill, alignSelf: 'flex-start', marginTop: 2 }}>
                      <Ionicons name={AUDIENCE_OPTIONS.find(a => a.key === audience)?.icon} size={11} color={COLORS.textLight} />
                      <Text style={{ fontSize: 10, color: COLORS.textLight, fontWeight: FONT_WEIGHT.semiBold }}>
                        {AUDIENCE_OPTIONS.find(a => a.key === audience)?.label}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, paddingBottom: 40 }}>

                {/* Video preview / picker */}
                {pickedUri ? (
                  <View style={{ borderRadius: RADIUS.md, overflow: 'hidden', height: 220, backgroundColor: '#000', position: 'relative' }}>
                    <Video
                      source={{ uri: pickedUri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode={ResizeMode.COVER}
                      isLooping
                      shouldPlay={false}
                      useNativeControls
                    />
                    {duration != null && (
                      <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: FONT_WEIGHT.semiBold }}>
                          {Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      onPress={pickVideo}
                      disabled={uploading}
                      style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="swap-horizontal" size={13} color={COLORS.white} />
                      <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: FONT_WEIGHT.semiBold }}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickVideo}
                    style={{
                      height: 180, borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.border,
                      borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 8,
                      backgroundColor: COLORS.background,
                    }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...{ elevation: 1 } }}>
                      <Ionicons name="videocam" size={26} color={COLORS.primaryRed} />
                    </View>
                    <Text style={{ fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>Select a video</Text>
                    <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>Up to 2 minutes</Text>
                  </TouchableOpacity>
                )}

                {/* Caption */}
                <View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Caption</Text>
                    <Text style={{ fontSize: FONT_SIZE.caption, color: caption.length > CAPTION_LIMIT ? COLORS.primaryRed : COLORS.textLight }}>
                      {caption.length}/{CAPTION_LIMIT}
                    </Text>
                  </View>
                  <TextInput
                    value={caption}
                    onChangeText={t => setCaption(t.slice(0, CAPTION_LIMIT))}
                    placeholder="What's happening in this video?"
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, fontSize: FONT_SIZE.body, color: COLORS.textDark, minHeight: 80, textAlignVertical: 'top' }}
                  />
                </View>

                {/* Hashtags */}
                <View>
                  <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Hashtags</Text>
                  <TextInput
                    value={hashtags}
                    onChangeText={setHashtags}
                    placeholder="#campus #esut #fun"
                    placeholderTextColor={COLORS.textLight}
                    style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, fontSize: FONT_SIZE.body, color: COLORS.textDark }}
                  />
                </View>

                {/* Category */}
                <View>
                  <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Category</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {CATEGORIES.map(c => (
                      <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
                    ))}
                  </View>
                </View>

                {/* Audience / visibility */}
                <View>
                  <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Who can see this?</Text>
                  {AUDIENCE_OPTIONS.map(opt => {
                    const active = audience === opt.key;
                    return (
                      <TouchableOpacity
                        key={opt.key}
                        onPress={() => setAudience(opt.key)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
                          paddingVertical: 12, paddingHorizontal: SPACING.md, borderRadius: RADIUS.sm, marginBottom: 6,
                          backgroundColor: active ? '#FEEAEA' : COLORS.background,
                        }}>
                        <Ionicons name={opt.icon} size={18} color={active ? COLORS.primaryRed : COLORS.textLight} />
                        <Text style={{ flex: 1, fontSize: FONT_SIZE.body, color: active ? COLORS.primaryRed : COLORS.textDark, fontWeight: active ? FONT_WEIGHT.bold : FONT_WEIGHT.medium }}>
                          {opt.label}
                        </Text>
                        {active && <Ionicons name="checkmark-circle" size={18} color={COLORS.primaryRed} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Department tag toggle */}
                <TouchableOpacity
                  onPress={() => setTagDepartment(v => !v)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flex: 1 }}>
                    <Ionicons name="pricetag-outline" size={18} color={COLORS.textLight} />
                    <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textDark }}>
                      Tag my department ({profile?.department || 'not set'})
                    </Text>
                  </View>
                  <View style={{
                    width: 44, height: 26, borderRadius: 13, padding: 2,
                    backgroundColor: tagDepartment ? COLORS.primaryRed : COLORS.border,
                    justifyContent: 'center',
                  }}>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.white,
                      alignSelf: tagDepartment ? 'flex-end' : 'flex-start',
                    }} />
                  </View>
                </TouchableOpacity>

                {/* Upload progress */}
                {uploading && (
                  <View>
                    <View style={{ height: 6, backgroundColor: COLORS.background, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${progress}%`, backgroundColor: COLORS.primaryRed }} />
                    </View>
                    <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, marginTop: 4, textAlign: 'center' }}>
                      Uploading video… {progress}%
                    </Text>
                  </View>
                )}

                {/* Action buttons */}
                <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                  <TouchableOpacity
                    onPress={() => publish(true)}
                    disabled={uploading || !pickedUri}
                    style={{
                      flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
                      paddingVertical: 14, alignItems: 'center', opacity: !pickedUri ? 0.5 : 1,
                    }}>
                    <Text style={{ color: COLORS.textDark, fontWeight: FONT_WEIGHT.bold }}>Save Draft</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => publish(false)}
                    disabled={uploading || !pickedUri}
                    style={{
                      flex: 2, backgroundColor: COLORS.primaryRed, borderRadius: RADIUS.md,
                      paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
                      opacity: !pickedUri ? 0.5 : 1,
                    }}>
                    {uploading
                      ? <ActivityIndicator color={COLORS.white} />
                      : <>
                          <Ionicons name="paper-plane" size={16} color={COLORS.white} />
                          <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>Publish</Text>
                        </>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}