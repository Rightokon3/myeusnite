// app/my-listings.tsx
// Images uploaded via Cloudinary — Firebase used only as DB

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { db } from '../config/firebase';
import { BG, BRAND, CARD, TEXT, TEXT_MUTED } from '../constants/Colors';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';
import { uploadToCloudinary } from '../utils/cloudinary';


// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastStatus = 'uploading' | 'success' | 'error' | 'deleting' | 'deleted';

function Toast({ status, visible }: { status: ToastStatus; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(opacity, { toValue: visible ? 1 : 0, useNativeDriver: true }).start();
  }, [visible]);

  const config: Record<ToastStatus, { icon: string; color: string; msg: string }> = {
    uploading: { icon: 'cloud-upload-outline', color: '#F59E0B', msg: 'Saving changes…' },
    success:   { icon: 'checkmark-circle',     color: '#10B981', msg: 'Post updated successfully!' },
    error:     { icon: 'close-circle',         color: '#EF4444', msg: 'Something went wrong. Try again.' },
    deleting:  { icon: 'trash-outline',        color: '#F59E0B', msg: 'Deleting post…' },
    deleted:   { icon: 'checkmark-circle',     color: '#10B981', msg: 'Post deleted.' },
  };
  const { icon, color, msg } = config[status];

  return (
    <Animated.View style={[ts.toast, { opacity, borderLeftColor: color }]}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={ts.toastText}>{msg}</Text>
    </Animated.View>
  );
}

const ts = StyleSheet.create({
  toast: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderLeftWidth: 4, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
  toastText: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1 },
});

const CATS = ['Electronics', 'Books', 'Clothing', 'Food', 'Services', 'Other'];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MyListingsScreen() {
  const { user } = useAuth();
  const router   = useRouter();

  const [listings, setListings]   = useState<any[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [editItem, setEditItem]   = useState<any | null>(null);
  const [editForm, setEditForm]   = useState({ title: '', description: '', price: '', category: '' });
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editLoading, setEditLoading]   = useState(false);
  const [editProgress, setEditProgress] = useState(0);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastStatus, setToastStatus]   = useState<ToastStatus>('uploading');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (status: ToastStatus, autoDismiss = true) => {
    setToastStatus(status);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (autoDismiss && status !== 'uploading' && status !== 'deleting') {
      toastTimer.current = setTimeout(() => setToastVisible(false), 3500);
    }
  };

  // ── Load my listings ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'marketplace'),
      where('sellerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setFetching(false);
    });
    return unsub;
  }, [user]);

  // ── Open / close edit modal ─────────────────────────────────────────────────
  const openEdit = (item: any) => {
    setEditItem(item);
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      price: String(item.price || ''),
      category: item.category || 'Electronics',
    });
    setEditImageUri(null);
  };

  const closeEdit = () => { setEditItem(null); setEditImageUri(null); setEditProgress(0); };
  const setField  = (k: string, v: string) => setEditForm(f => ({ ...f, [k]: v }));

  // ── Pick image ──────────────────────────────────────────────────────────────
  const pickEditImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow access to your photo library.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });
    if (!result.canceled) setEditImageUri(result.assets[0].uri);
  };

  // ── Save edits ──────────────────────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editForm.title.trim() || !editForm.price.trim()) {
      Alert.alert('Required', 'Title and price are required.');
      return;
    }
    setEditLoading(true);
    setEditProgress(0);
    showToast('uploading', false);

    try {
      // Use the new image if user picked one, otherwise keep the existing URL
      let imageUrl = editItem.imageUrl ?? null;
      let imagePublicId = editItem.imagePublicId ?? null;

      if (editImageUri) {
        imageUrl = await uploadToCloudinary({
  uri: editImageUri,
  resourceType: 'image',
  folder: 'marketplace',
});
        // Extract public_id
        const parts = imageUrl.split('/');
        const fi = parts.indexOf('marketplace');
        if (fi !== -1) imagePublicId = `marketplace/${parts[fi + 1].split('.')[0]}`;
        // NOTE: old image on Cloudinary is not deleted here — requires a backend call.
        // Store the old public_id if you want to clean it up later.
      }

      await updateDoc(doc(db, 'marketplace', editItem.id), {
        title:        editForm.title.trim(),
        description:  editForm.description.trim(),
        price:        parseFloat(editForm.price),
        category:     editForm.category,
        imageUrl,
        imagePublicId,
        updatedAt:    serverTimestamp(),
      });

      showToast('success');
      closeEdit();
    } catch (e: any) {
      console.error('saveEdit error:', e);
      showToast('error');
    } finally {
      setEditLoading(false);
      setEditProgress(0);
    }
  };

  // ── Delete listing ──────────────────────────────────────────────────────────
  const confirmDelete = (item: any) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${item.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteListing(item) },
      ]
    );
  };

  const deleteListing = async (item: any) => {
    showToast('deleting', false);
    try {
      // Delete the Firestore doc — this is the critical step
      await deleteDoc(doc(db, 'marketplace', item.id));
      // NOTE: the Cloudinary image (item.imagePublicId) is NOT deleted here.
      // Cloudinary deletion requires your API secret, which must stay server-side.
      // To auto-delete images, create a Firebase Cloud Function that calls:
      // https://api.cloudinary.com/v1_1/YOUR_CLOUD/image/destroy  (signed)
      showToast('deleted');
    } catch (e: any) {
      console.error('deleteListing error:', e);
      showToast('error');
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.listCard}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.listImg} resizeMode="cover" />
      ) : (
        <View style={[styles.listImg, styles.listImgPlaceholder]}>
          <Ionicons name="image-outline" size={28} color="#ddd" />
        </View>
      )}
      <View style={styles.listInfo}>
        <Text style={styles.listTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.listPrice}>₦{Number(item.price).toLocaleString()}</Text>
        <View style={styles.catBadge}>
          <Text style={styles.catBadgeTxt}>{item.category}</Text>
        </View>
      </View>
      <View style={styles.listActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
          <Ionicons name="pencil" size={18} color={BRAND} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <View style={{ width: 38 }} />
      </View>

      {fetching ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, gap: 12 }}>
              <Ionicons name="storefront-outline" size={60} color="#ddd" />
              <Text style={{ color: '#bbb', fontSize: 15 }}>You have no active listings</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => router.back()}>
                <Text style={styles.createBtnTxt}>Create your first listing</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {toastVisible && <Toast status={toastStatus} visible={toastVisible} />}

      {/* Edit modal */}
      <Modal visible={!!editItem} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeEdit} disabled={editLoading}>
              <Text style={{ color: editLoading ? '#ccc' : '#666' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontWeight: '700', fontSize: 16 }}>Edit Listing</Text>
            <TouchableOpacity onPress={saveEdit} disabled={editLoading}>
              {editLoading
                ? <ActivityIndicator color={BRAND} />
                : <Text style={{ color: BRAND, fontWeight: '700' }}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {/* Upload progress */}
            {editLoading && editImageUri && (
              <View style={styles.progressWrap}>
                <View style={[styles.progressBar, { width: `${editProgress}%` as any }]} />
                <Text style={styles.progressTxt}>
                  {editProgress < 100 ? `Uploading image… ${editProgress}%` : 'Saving…'}
                </Text>
              </View>
            )}

            {/* Image */}
            <Text style={styles.sectionLabel}>Product Photo</Text>
            {editImageUri ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: editImageUri }} style={styles.preview} resizeMode="cover" />
                <TouchableOpacity style={styles.removeBtn} onPress={() => setEditImageUri(null)}>
                  <Ionicons name="close-circle" size={28} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.changeBtn} onPress={pickEditImage}>
                  <Ionicons name="camera" size={15} color="#fff" />
                  <Text style={styles.changeTxt}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : editItem?.imageUrl ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: editItem.imageUrl }} style={styles.preview} resizeMode="cover" />
                <TouchableOpacity style={styles.changeBtn} onPress={pickEditImage}>
                  <Ionicons name="camera" size={15} color="#fff" />
                  <Text style={styles.changeTxt}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.pickerBox} onPress={pickEditImage}>
                <Ionicons name="camera-outline" size={32} color="#aaa" />
                <Text style={{ color: '#aaa', marginTop: 6, fontSize: 13 }}>Tap to add a photo</Text>
              </TouchableOpacity>
            )}

            <TextInput style={styles.input} placeholder="Item title *" placeholderTextColor="#aaa" value={editForm.title} onChangeText={v => setField('title', v)} />
            <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} placeholder="Description (optional)" placeholderTextColor="#aaa" value={editForm.description} onChangeText={v => setField('description', v)} multiline />
            <TextInput style={styles.input} placeholder="Price in ₦ *" placeholderTextColor="#aaa" value={editForm.price} onChangeText={v => setField('price', v)} keyboardType="numeric" />

            <Text style={styles.sectionLabel}>Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CATS.map(c => (
                <TouchableOpacity key={c} style={[styles.catChip, editForm.category === c && styles.catActive]} onPress={() => setField('category', c)}>
                  <Text style={[styles.catTxt, editForm.category === c && styles.catActiveTxt]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Danger zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => { closeEdit(); setTimeout(() => confirmDelete(editItem), 300); }}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.dangerBtnTxt}>Delete this listing</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
  
}

const styles = StyleSheet.create({
  header: { backgroundColor: BRAND, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingTop: 48 },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 20 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  listCard: { backgroundColor: CARD, borderRadius: 14, flexDirection: 'row', overflow: 'hidden', elevation: 1 },
  listImg: { width: 90, height: 90 },
  listImgPlaceholder: { backgroundColor: '#f8f8f8', alignItems: 'center', justifyContent: 'center' },
  listInfo: { flex: 1, padding: 12, gap: 4 },
  listTitle: { fontWeight: '600', fontSize: 14, color: TEXT },
  listPrice: { color: BRAND, fontWeight: '800', fontSize: 15 },
  catBadge: { alignSelf: 'flex-start', backgroundColor: `${BRAND}18`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  catBadgeTxt: { color: BRAND, fontSize: 10, fontWeight: '700' },
  listActions: { justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  editBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${BRAND}18`, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  createBtn: { backgroundColor: BRAND, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  createBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  input: { borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 12, padding: 14, fontSize: 14, color: TEXT },
  sectionLabel: { fontWeight: '600', color: '#333', fontSize: 13 },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: CARD },
  catActive: { backgroundColor: BRAND, borderColor: BRAND },
  catTxt: { fontSize: 12, color: '#555', fontWeight: '600' },
  catActiveTxt: { color: '#fff' },
  pickerBox: { height: 160, borderWidth: 2, borderColor: '#e0e0e0', borderStyle: 'dashed', borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fafafa', gap: 4 },
  previewWrap: { borderRadius: 14, overflow: 'hidden', height: 200, position: 'relative' },
  preview: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 14 },
  changeBtn: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
  changeTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },
  progressWrap: { backgroundColor: '#f0f0f0', borderRadius: 8, overflow: 'hidden', height: 36, justifyContent: 'center' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: BRAND, opacity: 0.25 },
  progressTxt: { textAlign: 'center', fontSize: 12, color: '#555', fontWeight: '600' },
  dangerZone: { marginTop: 20, borderWidth: 1.5, borderColor: '#FEE2E2', borderRadius: 14, padding: 16, gap: 10 },
  dangerTitle: { fontWeight: '700', color: '#EF4444', fontSize: 13 },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  dangerBtnTxt: { color: '#EF4444', fontWeight: '600', fontSize: 14 },
});