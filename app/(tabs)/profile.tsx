import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  SafeAreaView, Modal, TextInput, Alert, ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../../components/Sidebar';
import PostCard from '../../components/PostCard';
import { uploadToCloudinary } from '../../utils/cloudinary';

type Tab = 'posts' | 'tagged';

// 🆕 Shape of the new optional fields living on users/{uid}.
// All optional because existing docs won't have them until first save.
type SocialLinks = {
  twitter?: string;
  linkedin?: string;
  instagram?: string;
};

const LEVEL_OPTIONS = ['100', '200', '300', '400', '500', 'Postgrad'];

export default function ProfileScreen() {
  const { user, profile } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [activeTab, setActiveTab] = useState<Tab>('posts');
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [taggedPosts, setTaggedPosts] = useState<any[]>([]);
  const [showEdit, setShowEdit] = useState(false);

  const [editName, setEditName] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editBio, setEditBio] = useState('');

  // 🆕 New editable fields
  const [editFaculty, setEditFaculty] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [editSocialLinks, setEditSocialLinks] = useState<SocialLinks>({});
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);

  // ✅ Sync edit fields whenever profile loads or changes
  useEffect(() => {
    if (profile) {
      setEditName(profile.fullName || '');
      setEditDept(profile.department || '');
      setEditBio(profile.bio || '');
      // 🆕 — every read falls back to a safe default since these
      // fields may not exist yet on older user docs
      setEditFaculty(profile.faculty || '');
      setEditLevel(profile.level || '');
      setEditStudentId(profile.studentId || '');
      setEditWebsite(profile.website || '');
      setEditSkills(Array.isArray(profile.skills) ? profile.skills : []);
      setEditInterests(Array.isArray(profile.interests) ? profile.interests : []);
      setEditSocialLinks(profile.socialLinks || {});
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.photoURL && !localPhotoURL) {
      setLocalPhotoURL(profile.photoURL);
    }
  }, [profile?.photoURL]);

  useEffect(() => {
    if (!user) return;

    const qMy = query(
      collection(db, 'posts'),
      where('authorId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const u1 = onSnapshot(qMy, snap =>
      setMyPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const qTag = query(
      collection(db, 'posts'),
      where('taggedUsers', 'array-contains', user.uid),
      orderBy('createdAt', 'desc')
    );

    const u2 = onSnapshot(qTag, snap =>
      setTaggedPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => {
      u1();
      u2();
    };
  }, [user]);

  // 🆕 Chip helpers — shared by Skills and Interests
  const addChip = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    clearInput: () => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (list.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      clearInput();
      return; // silently ignore duplicates
    }
    setList([...list, trimmed]);
    clearInput();
  };

  const removeChip = (
    index: number,
    list: string[],
    setList: (v: string[]) => void
  ) => {
    setList(list.filter((_, i) => i !== index));
  };

  // 🆕 Basic URL sanity check — doesn't block saving, just warns
  const isLikelyUrl = (value: string) => {
    if (!value) return true; // empty is fine, it's optional
    return /^https?:\/\/.+/i.test(value.trim());
  };

  const saveProfile = async () => {
    if (!editName.trim()) return Alert.alert('Required', 'Name cannot be empty');

    // 🆕 Validate optional URL-ish fields before writing
    if (editWebsite && !isLikelyUrl(editWebsite)) {
      return Alert.alert(
        'Check Website Link',
        'Please enter a full URL starting with http:// or https://'
      );
    }
    const socialEntries = Object.entries(editSocialLinks).filter(([, v]) => !!v);
    for (const [platform, url] of socialEntries) {
      if (url && !isLikelyUrl(url)) {
        return Alert.alert(
          'Check Social Link',
          `Your ${platform} link should start with http:// or https://`
        );
      }
    }

    setSaving(true);
    try {
      // 🆕 Build socialLinks with only non-empty values so we don't
      // write a map full of empty strings to Firestore
      const cleanedSocialLinks: SocialLinks = {};
      socialEntries.forEach(([platform, url]) => {
        (cleanedSocialLinks as any)[platform] = url;
      });

      await updateDoc(doc(db, 'users', user!.uid), {
        fullName: editName.trim(),
        department: editDept.trim(),
        bio: editBio.trim(),
        // 🆕 new fields — merge-safe via updateDoc, existing fields untouched
        faculty: editFaculty.trim(),
        level: editLevel.trim(),
        studentId: editStudentId.trim(),
        website: editWebsite.trim(),
        skills: editSkills,
        interests: editInterests,
        socialLinks: cleanedSocialLinks,
      });

      await updateProfile(auth.currentUser!, {
        displayName: editName.trim(),
      });

      setShowEdit(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      return Alert.alert('Permission Required', 'Please allow access to your photo library.');
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: true,
    });

    if (res.canceled) return;

    setUploadingPhoto(true);

    try {
      const asset = res.assets[0];

      const url = await uploadToCloudinary({
        base64: asset.base64,
        resourceType: 'image',
        folder: 'avatars',
        fileName: `${user!.uid}.jpg`,
      });

      setLocalPhotoURL(url);

      await updateDoc(doc(db, 'users', user!.uid), {
        photoURL: url,
      });

      await updateProfile(auth.currentUser!, {
        photoURL: url,
      });

      console.log('UPLOAD SUCCESS:', url);
    } catch (e: any) {
      Alert.alert('Upload Error', e.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const avatar = localPhotoURL || profile?.photoURL;
  const displayedPosts = activeTab === 'posts' ? myPosts : taggedPosts;

  const AvatarDisplay = ({ size = 96, borderColor = 'rgba(255,255,255,0.4)', textColor = 'white', loadingColor = 'white' }: {
    size?: number;
    borderColor?: string;
    textColor?: string;
    loadingColor?: string;
  }) => (
    <TouchableOpacity onPress={pickAndUploadPhoto} style={{ alignItems: 'center' }}>
      {uploadingPhoto ? (
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: 'rgba(0,0,0,0.1)',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <ActivityIndicator color={loadingColor} />
        </View>
      ) : avatar ? (
        <Image
          source={{ uri: avatar }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 3,
            borderColor,
          }}
        />
      ) : (
        <View style={{
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: 'rgba(255,255,255,0.3)',
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 3, borderColor,
        }}>
          <Text style={{ color: textColor, fontSize: size * 0.35, fontWeight: 'bold' }}>
            {(profile?.fullName || 'U')[0].toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={{ color: textColor === 'white' ? 'rgba(255,255,255,0.8)' : '#C0392B', fontSize: 12, marginTop: 4 }}>
        Tap to change photo
      </Text>
    </TouchableOpacity>
  );

  // 🆕 Reusable chip list editor (used for Skills + Interests)
  const ChipEditor = ({
    label,
    placeholder,
    items,
    inputValue,
    onInputChange,
    onAdd,
    onRemove,
  }: {
    label: string;
    placeholder: string;
    items: string[];
    inputValue: string;
    onInputChange: (v: string) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
  }) => (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-gray-400 uppercase mb-1 ml-1">{label}</Text>
      <View className="flex-row flex-wrap mb-2">
        {items.map((item, index) => (
          <View
            key={`${item}-${index}`}
            className="flex-row items-center bg-[#FCE9E6] rounded-full px-3 py-1.5 mr-2 mb-2"
          >
            <Text className="text-[#C0392B] text-sm font-medium mr-1">{item}</Text>
            <TouchableOpacity onPress={() => onRemove(index)}>
              <Ionicons name="close-circle" size={16} color="#C0392B" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <View className="flex-row items-center">
        <TextInput
          value={inputValue}
          onChangeText={onInputChange}
          placeholder={placeholder}
          onSubmitEditing={onAdd}
          returnKeyType="done"
          className="flex-1 border border-gray-200 bg-gray-50 p-3 rounded-xl text-base mr-2"
        />
        <TouchableOpacity
          onPress={onAdd}
          className="bg-[#C0392B] rounded-xl px-4 py-3"
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // 🆕 Small labeled text input, reused for several fields below
  const LabeledInput = (props: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder: string;
    multiline?: boolean;
    keyboardType?: 'default' | 'url' | 'email-address';
    icon?: keyof typeof Ionicons.glyphMap;
  }) => (
    <View className="mb-4">
      <Text className="text-xs font-semibold text-gray-400 uppercase mb-1 ml-1">{props.label}</Text>
      <View className="flex-row items-center border border-gray-200 bg-gray-50 rounded-xl">
        {props.icon ? (
          <Ionicons name={props.icon} size={18} color="#999" style={{ marginLeft: 12 }} />
        ) : null}
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          multiline={props.multiline}
          numberOfLines={props.multiline ? 4 : 1}
          textAlignVertical={props.multiline ? 'top' : 'center'}
          keyboardType={props.keyboardType || 'default'}
          autoCapitalize="none"
          className={`flex-1 p-3 text-base ${props.multiline ? 'h-28' : ''}`}
        />
      </View>
    </View>
  );

  const Content = () => (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <View className="bg-[#C0392B]" style={{ paddingTop: isDesktop ? 0 : 48 }}>
        <View className="flex-row items-center justify-between px-4 py-4">
          <Text className="text-white font-black text-xl">My Profile</Text>
          <TouchableOpacity onPress={() => setShowEdit(true)}>
            <Ionicons name="create-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View className="items-center pb-6 px-4">
          <AvatarDisplay size={96} borderColor="rgba(255,255,255,0.4)" textColor="white" loadingColor="white" />
          <Text className="text-white font-bold text-xl mt-2">
            {profile?.fullName || 'User'}
          </Text>
          <Text className="text-white/70">{profile?.department}</Text>
          {profile?.bio ? (
            <Text className="text-white/60 text-sm text-center mt-1 px-6">{profile.bio}</Text>
          ) : null}
        </View>
      </View>

      {/* TABS */}
      <View className="flex-row border-b border-gray-200 bg-white">
        <TouchableOpacity
          onPress={() => setActiveTab('posts')}
          className={`flex-1 py-3 items-center ${activeTab === 'posts' ? 'border-b-2 border-[#C0392B]' : ''}`}
        >
          <Text className={`font-semibold ${activeTab === 'posts' ? 'text-[#C0392B]' : 'text-gray-400'}`}>
            My Posts ({myPosts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('tagged')}
          className={`flex-1 py-3 items-center ${activeTab === 'tagged' ? 'border-b-2 border-[#C0392B]' : ''}`}
        >
          <Text className={`font-semibold ${activeTab === 'tagged' ? 'text-[#C0392B]' : 'text-gray-400'}`}>
            Tagged ({taggedPosts.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* POSTS */}
      <View className="p-4">
        {displayedPosts.length === 0 ? (
          <View className="items-center py-12">
            <Ionicons name="document-outline" size={40} color="#ccc" />
            <Text className="text-gray-400 mt-2">
              {activeTab === 'posts' ? 'No posts yet' : 'No tagged posts'}
            </Text>
          </View>
        ) : (
          displayedPosts.map(post => (
            <PostCard key={post.id} post={post} />
          ))
        )}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <View className="flex-1 flex-row">
        <Sidebar />
        <View className="flex-1">
          <Content />
        </View>
      </View>

      {/* EDIT MODAL */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-white">
          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowEdit(false)}>
              <Text className="text-gray-500 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold">Edit Profile</Text>
            <TouchableOpacity onPress={saveProfile} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#C0392B" />
              ) : (
                <Text className="text-[#C0392B] font-bold text-base">Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
            {/* AVATAR PREVIEW INSIDE MODAL */}
            <View className="items-center mb-6 mt-2">
              <AvatarDisplay
                size={100}
                borderColor="#e0e0e0"
                textColor="#C0392B"
                loadingColor="#C0392B"
              />
            </View>

            {/* --- Basic Info --- */}
            <Text className="text-sm font-bold text-gray-700 mb-2">Basic Info</Text>

            <LabeledInput
              label="Full Name"
              value={editName}
              onChangeText={setEditName}
              placeholder="Full Name"
            />

            <LabeledInput
              label="Bio"
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell people a little about yourself..."
              multiline
            />

            {/* --- Academic Info --- 🆕 */}
            <Text className="text-sm font-bold text-gray-700 mb-2 mt-2">Academic Info</Text>

            <LabeledInput
              label="Department"
              value={editDept}
              onChangeText={setEditDept}
              placeholder="Department"
            />

            <LabeledInput
              label="Faculty"
              value={editFaculty}
              onChangeText={setEditFaculty}
              placeholder="Faculty"
            />

            {/* 🆕 Level — simple chip-select since values are constrained */}
            <View className="mb-4">
              <Text className="text-xs font-semibold text-gray-400 uppercase mb-1 ml-1">Level</Text>
              <View className="flex-row flex-wrap">
                {LEVEL_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setEditLevel(option)}
                    className={`rounded-full px-4 py-2 mr-2 mb-2 border ${
                      editLevel === option
                        ? 'bg-[#C0392B] border-[#C0392B]'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text className={editLevel === option ? 'text-white font-medium' : 'text-gray-600'}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <LabeledInput
              label="Student ID (optional)"
              value={editStudentId}
              onChangeText={setEditStudentId}
              placeholder="e.g. 190401234"
            />

            {/* --- Skills & Interests --- 🆕 */}
            <Text className="text-sm font-bold text-gray-700 mb-2 mt-2">Skills & Interests</Text>

            <ChipEditor
              label="Skills"
              placeholder="e.g. Public Speaking"
              items={editSkills}
              inputValue={skillInput}
              onInputChange={setSkillInput}
              onAdd={() => addChip(skillInput, editSkills, setEditSkills, () => setSkillInput(''))}
              onRemove={(i) => removeChip(i, editSkills, setEditSkills)}
            />

            <ChipEditor
              label="Interests"
              placeholder="e.g. Photography"
              items={editInterests}
              inputValue={interestInput}
              onInputChange={setInterestInput}
              onAdd={() => addChip(interestInput, editInterests, setEditInterests, () => setInterestInput(''))}
              onRemove={(i) => removeChip(i, editInterests, setEditInterests)}
            />

            {/* --- Links --- 🆕 */}
            <Text className="text-sm font-bold text-gray-700 mb-2 mt-2">Links</Text>

            <LabeledInput
              label="Website"
              value={editWebsite}
              onChangeText={setEditWebsite}
              placeholder="https://yourwebsite.com"
              keyboardType="url"
              icon="link-outline"
            />

            <LabeledInput
              label="Twitter / X"
              value={editSocialLinks.twitter || ''}
              onChangeText={(v) => setEditSocialLinks(prev => ({ ...prev, twitter: v }))}
              placeholder="https://x.com/yourhandle"
              keyboardType="url"
              icon="logo-twitter"
            />

            <LabeledInput
              label="LinkedIn"
              value={editSocialLinks.linkedin || ''}
              onChangeText={(v) => setEditSocialLinks(prev => ({ ...prev, linkedin: v }))}
              placeholder="https://linkedin.com/in/yourname"
              keyboardType="url"
              icon="logo-linkedin"
            />

            <LabeledInput
              label="Instagram"
              value={editSocialLinks.instagram || ''}
              onChangeText={(v) => setEditSocialLinks(prev => ({ ...prev, instagram: v }))}
              placeholder="https://instagram.com/yourhandle"
              keyboardType="url"
              icon="logo-instagram"
            />

            <View style={{ height: 24 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}