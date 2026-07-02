import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal, SafeAreaView,
  ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { GroupCategory, GroupPrivacy } from '../../hooks/useGroup';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

const CATEGORIES: GroupCategory[] = [
  'Department', 'Faculty', 'Course', 'Study',
  'Project', 'Sports', 'Religious', 'Club', 'Marketplace', 'Community',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated: (groupId: string) => void;
}

export default function CreateGroupModal({ visible, onClose, onCreated }: Props) {
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<GroupCategory>('Study');
  const [privacy, setPrivacy] = useState<GroupPrivacy>('public');
  const [department, setDepartment] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setName(''); setDescription(''); setCategory('Study'); setPrivacy('public');
    setDepartment(''); setTagsText(''); setRulesText('');
    setAvatarUri(null); setCoverUri(null);
  };

  const pick = async (target: 'avatar' | 'cover') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed');
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: target === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });
    if (!res.canceled) {
      if (target === 'avatar') setAvatarUri(res.assets[0].uri);
      else setCoverUri(res.assets[0].uri);
    }
  };

  const create = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Group name is required');
    setUploading(true);
    try {
      let avatarUrl: string | null = null;
      let coverUrl: string | null = null;

      if (avatarUri) {
        avatarUrl = await uploadToCloudinary({ uri: avatarUri, resourceType: 'image', folder: 'group_avatars' });
      }
      if (coverUri) {
        coverUrl = await uploadToCloudinary({ uri: coverUri, resourceType: 'image', folder: 'group_covers' });
      }

      const tags = tagsText.split(',').map(t => t.trim()).filter(Boolean);
      const rules = rulesText.split('\n').map(r => r.trim()).filter(Boolean);

      const gRef = await addDoc(collection(db, 'groups'), {
        name: name.trim(),
        description: description.trim(),
        avatar: avatarUrl,
        coverPhoto: coverUrl,
        ownerId: user!.uid,
        ownerName: profile?.fullName || 'User',
        category,
        privacy,
        department: department.trim(),
        tags,
        rules,
        members: [user!.uid],
        memberCount: 1,
        postsCount: 0,
        createdAt: serverTimestamp(),
      });

      // Add owner as member with 'owner' role
      await addDoc(collection(db, 'groupMembers'), {
        userId: user!.uid,
        groupId: gRef.id,
        role: 'owner',
        displayName: profile?.fullName || 'User',
        photoURL: profile?.photoURL || null,
        department: profile?.department || '',
        joinedAt: serverTimestamp(),
      });

      // Global notification
      addDoc(collection(db, 'notifications'), {
        type: 'group_invite',
        senderId: user!.uid,
        senderName: profile?.fullName || 'User',
        message: `${profile?.fullName || 'User'} created a new group: "${name.trim()}"`,
        groupId: gRef.id,
        global: true,
        read: false,
        createdAt: serverTimestamp(),
      }).catch(() => {});

      reset();
      onClose();
      onCreated(gRef.id);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setUploading(false);
    }
  };

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill,
        borderWidth: 1.5, borderColor: active ? COLORS.primaryRed : COLORS.border,
        backgroundColor: active ? COLORS.primaryRed : COLORS.white,
        marginRight: SPACING.sm, marginBottom: SPACING.sm,
      }}>
      <Text style={{ fontSize: FONT_SIZE.caption + 1, fontWeight: FONT_WEIGHT.semiBold, color: active ? COLORS.white : COLORS.textDark }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <TouchableOpacity onPress={() => { reset(); onClose(); }} disabled={uploading} hitSlop={8}>
            <Text style={{ color: uploading ? COLORS.border : COLORS.textLight, fontSize: FONT_SIZE.body }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={{ fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.cardTitle, color: COLORS.textDark }}>Create Group</Text>
          <TouchableOpacity onPress={create} disabled={uploading} hitSlop={8}>
            {uploading
              ? <ActivityIndicator color={COLORS.primaryRed} />
              : <Text style={{ color: COLORS.primaryRed, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.body }}>Create</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg }}>

          {/* Cover photo */}
          <TouchableOpacity onPress={() => pick('cover')} style={{ height: 140, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed' }}>
            {coverUri
              ? <Image source={{ uri: coverUri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              : <View style={{ alignItems: 'center', gap: 6 }}>
                  <Ionicons name="image-outline" size={32} color={COLORS.textLight} />
                  <Text style={{ color: COLORS.textLight, fontSize: FONT_SIZE.caption }}>Add cover photo</Text>
                </View>}
          </TouchableOpacity>

          {/* Avatar */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md }}>
            <TouchableOpacity onPress={() => pick('avatar')} style={{ width: 72, height: 72, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.border, overflow: 'hidden' }}>
              {avatarUri
                ? <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} />
                : <View style={{ alignItems: 'center' }}>
                    <Ionicons name="camera-outline" size={22} color={COLORS.textLight} />
                    <Text style={{ fontSize: 9, color: COLORS.textLight, marginTop: 2 }}>Avatar</Text>
                  </View>}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>Group avatar shown in cards and search results</Text>
            </View>
          </View>

          {/* Name */}
          <View>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Group Name *</Text>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. CS Department 2024" placeholderTextColor={COLORS.textLight} style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, fontSize: FONT_SIZE.body, color: COLORS.textDark }} />
          </View>

          {/* Description */}
          <View>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Description</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder="What is this group about?" placeholderTextColor={COLORS.textLight} multiline style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, fontSize: FONT_SIZE.body, color: COLORS.textDark, minHeight: 80, textAlignVertical: 'top' }} />
          </View>

          {/* Category */}
          <View>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => <Chip key={c} label={c} active={category === c} onPress={() => setCategory(c)} />)}
            </View>
          </View>

          {/* Privacy */}
          <View>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Privacy</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              {(['public', 'private'] as GroupPrivacy[]).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPrivacy(p)}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
                    padding: SPACING.md, borderRadius: RADIUS.sm, borderWidth: 1.5,
                    borderColor: privacy === p ? COLORS.primaryRed : COLORS.border,
                    backgroundColor: privacy === p ? '#FEF2F2' : COLORS.white,
                  }}>
                  <Ionicons name={p === 'public' ? 'globe-outline' : 'lock-closed-outline'} size={18} color={privacy === p ? COLORS.primaryRed : COLORS.textLight} />
                  <View>
                    <Text style={{ fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.semiBold, color: privacy === p ? COLORS.primaryRed : COLORS.textDark, textTransform: 'capitalize' }}>{p}</Text>
                    <Text style={{ fontSize: 10, color: COLORS.textLight }}>{p === 'public' ? 'Anyone can join' : 'Owner approves'}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Department */}
          <View>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Department (optional)</Text>
            <TextInput value={department} onChangeText={setDepartment} placeholder="e.g. Computer Science" placeholderTextColor={COLORS.textLight} style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, fontSize: FONT_SIZE.body, color: COLORS.textDark }} />
          </View>

          {/* Tags */}
          <View>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Tags (comma separated)</Text>
            <TextInput value={tagsText} onChangeText={setTagsText} placeholder="study, exam, 2024" placeholderTextColor={COLORS.textLight} style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, fontSize: FONT_SIZE.body, color: COLORS.textDark }} />
          </View>

          {/* Rules */}
          <View>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Group Rules (one per line)</Text>
            <TextInput value={rulesText} onChangeText={setRulesText} placeholder={"No spam\nRespect members\nAcademic content only"} placeholderTextColor={COLORS.textLight} multiline style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, fontSize: FONT_SIZE.body, color: COLORS.textDark, minHeight: 90, textAlignVertical: 'top' }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}