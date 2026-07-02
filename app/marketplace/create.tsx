
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, SafeAreaView,
  Image, Alert, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { uploadMultipleToCloudinary } from '../../utils/cloudinary';
import { CATEGORIES } from '../../components/marketplace/CategoryTabs';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, DESKTOP_BREAKPOINT } from '../../constants/theme';

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Used'];
const MAX_IMAGES = 5;

export default function CreateListingScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Books');
  const [condition, setCondition] = useState('Good');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Please allow photo library access.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setImages(prev => [...prev, ...uris].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx));

  const publish = async () => {
    if (!title.trim() || !price.trim()) {
      return Alert.alert('Missing info', 'Title and price are required.');
    }
    setUploading(true);
    setProgress(0);
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadMultipleToCloudinary(images, 'marketplace', setProgress);
      }

      await addDoc(collection(db, 'marketplace'), {
        title: title.trim(),
        description: description.trim(),
        price: parseFloat(price),
        category,
        condition,
        location: location.trim(),
        imageUrl: imageUrls[0] || null,
        imageUrls,
        sellerId: user!.uid,
        sellerName: profile?.fullName ?? 'User',
        sellerDept: profile?.department ?? '',
        sellerPhoto: profile?.photoURL ?? null,
        views: 0,
        savedBy: [],
        status: 'active',
        createdAt: serverTimestamp(),
      });

      addDoc(collection(db, 'notifications'), {
        type: 'marketplace',
        senderId: user!.uid,
        senderName: profile?.fullName ?? 'User',
        message: `${profile?.fullName ?? 'User'} listed "${title.trim()}" on marketplace`,
        global: true, read: false, createdAt: serverTimestamp(),
      }).catch(() => {});

      Alert.alert('Listed!', 'Your item is now live on the marketplace.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {  
      console.log('UPLOAD ERROR:',e);
      console.log('UPLOAD ERROR MESSAGE:', e?.message);
      Alert.alert('Upload failed', e.message,JSON>stringify(e));
    } finally {
      setUploading(false);
      setProgress(0);
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.md, paddingTop: isDesktop ? SPACING.md : 50, paddingBottom: SPACING.sm,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} disabled={uploading} hitSlop={8}>
          <Text style={{ color: uploading ? COLORS.border : COLORS.textLight, fontSize: FONT_SIZE.body }}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>New Listing</Text>
        <TouchableOpacity onPress={publish} disabled={uploading} hitSlop={8}>
          {uploading
            ? <ActivityIndicator color={COLORS.primaryRed} />
            : <Text style={{ color: COLORS.primaryRed, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.body }}>Publish</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg, maxWidth: isDesktop ? 600 : undefined, width: '100%', alignSelf: 'center' }}>

        {/* Image picker row */}
        <View>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>
            Photos ({images.length}/{MAX_IMAGES})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {images.map((uri, i) => (
              <View key={uri} style={{ marginRight: SPACING.sm }}>
                <Image source={{ uri }} style={{ width: 90, height: 90, borderRadius: RADIUS.sm }} />
                <TouchableOpacity
                  onPress={() => removeImage(i)}
                  style={{ position: 'absolute', top: -6, right: -6, backgroundColor: COLORS.white, borderRadius: 11 }}>
                  <Ionicons name="close-circle" size={22} color={COLORS.primaryRed} />
                </TouchableOpacity>
                {i === 0 && (
                  <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: COLORS.primaryRed, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ color: COLORS.white, fontSize: 9, fontWeight: FONT_WEIGHT.bold }}>COVER</Text>
                  </View>
                )}
              </View>
            ))}
            {images.length < MAX_IMAGES && (
              <TouchableOpacity
                onPress={pickImages}
                style={{
                  width: 90, height: 90, borderRadius: RADIUS.sm, borderWidth: 2, borderColor: COLORS.border,
                  borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background,
                }}>
                <Ionicons name="camera-outline" size={26} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </ScrollView>

          {uploading && images.length > 0 && (
            <View style={{ marginTop: SPACING.sm }}>
              <View style={{ height: 6, backgroundColor: COLORS.background, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${progress}%`, backgroundColor: COLORS.primaryRed }} />
              </View>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, marginTop: 4 }}>
                Uploading images… {progress}%
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <View>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Title *</Text>
          <TextInput
            value={title} onChangeText={setTitle}
            placeholder="e.g. HP Laptop, like new"
            placeholderTextColor={COLORS.textLight}
            style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, fontSize: FONT_SIZE.body, color: COLORS.textDark }}
          />
        </View>

        {/* Price */}
        <View>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Price (₦) *</Text>
          <TextInput
            value={price} onChangeText={setPrice}
            placeholder="e.g. 15000"
            keyboardType="numeric"
            placeholderTextColor={COLORS.textLight}
            style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, fontSize: FONT_SIZE.body, color: COLORS.textDark }}
          />
        </View>

        {/* Description */}
        <View>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Description</Text>
          <TextInput
            value={description} onChangeText={setDescription}
            placeholder="Describe the item's condition, features, etc."
            placeholderTextColor={COLORS.textLight}
            multiline
            style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, fontSize: FONT_SIZE.body, color: COLORS.textDark, minHeight: 100, textAlignVertical: 'top' }}
          />
        </View>

        {/* Category */}
        <View>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Category</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CATEGORIES.filter(c => c.key !== 'All').map(c => (
              <Chip key={c.key} label={c.key} active={category === c.key} onPress={() => setCategory(c.key)} />
            ))}
          </View>
        </View>

        {/* Condition */}
        <View>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Condition</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CONDITIONS.map(c => (
              <Chip key={c} label={c} active={condition === c} onPress={() => setCondition(c)} />
            ))}
          </View>
        </View>

        {/* Location */}
        <View>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>Location (optional)</Text>
          <TextInput
            value={location} onChangeText={setLocation}
            placeholder="e.g. Hostel Block C, ESUT campus"
            placeholderTextColor={COLORS.textLight}
            style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 14, fontSize: FONT_SIZE.body, color: COLORS.textDark }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}