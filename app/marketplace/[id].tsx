
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView, SafeAreaView,
  Dimensions, Alert, Share, useWindowDimensions, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  doc, onSnapshot, updateDoc, increment,
  arrayUnion, arrayRemove, collection, query, where, orderBy, limit, getDocs,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import ProductCard, { MarketplaceItem } from '../../components/marketplace/ProductCard';
import FadeInView from '../../components/FadeInView';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW, DESKTOP_BREAKPOINT } from '../../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [related, setRelated] = useState<MarketplaceItem[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [saved, setSaved] = useState(false);
  const hasTrackedView = useRef(false);

  // Live product data
  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'marketplace', id), snap => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as MarketplaceItem;
        setItem(data);
        setSaved(data.savedBy?.includes(user?.uid || '') ?? false);
      }
    });
    return unsub;
  }, [id, user]);

  // Track a view once per screen visit
  useEffect(() => {
    if (!id || hasTrackedView.current) return;
    hasTrackedView.current = true;
    updateDoc(doc(db, 'marketplace', id), { views: increment(1) }).catch(() => {});
  }, [id]);

  // Related products — same category, excluding current item
  useEffect(() => {
    if (!item?.category) return;
    const q = query(
      collection(db, 'marketplace'),
      where('category', '==', item.category),
      orderBy('createdAt', 'desc'),
      limit(8)
    );
    getDocs(q).then(snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as MarketplaceItem))
        .filter(p => p.id !== item.id);
      setRelated(list);
    }).catch(() => {});
  }, [item?.category, item?.id]);

  const toggleSave = useCallback(async () => {
    if (!user || !item) return;
    const ref = doc(db, 'marketplace', item.id);
    if (saved) await updateDoc(ref, { savedBy: arrayRemove(user.uid) });
    else await updateDoc(ref, { savedBy: arrayUnion(user.uid) });
    setSaved(s => !s);
  }, [saved, user, item]);

  const handleShare = useCallback(async () => {
    if (!item) return;
    try {
      await Share.share({
        message: `Check out "${item.title}" for ₦${Number(item.price).toLocaleString()} on MyEusnite Marketplace!`,
      });
    } catch {}
  }, [item]);

  const handleReport = useCallback(() => {
    Alert.alert(
      'Report Listing',
      'Why are you reporting this listing?',
      [
        { text: 'Scam / Fraud', onPress: () => Alert.alert('Reported', 'Thanks — our team will review this listing.') },
        { text: 'Inappropriate content', onPress: () => Alert.alert('Reported', 'Thanks — our team will review this listing.') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, []);

  const messageSeller = useCallback(() => {
    if (!item) return;
    router.push({
      pathname: '/chat',
      params: { recipientId: item.sellerId, recipientName: item.sellerName },
    });
  }, [item, router]);

  if (!item) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.textLight }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const images = item.imageUrls?.length ? item.imageUrls : (item.imageUrl ? [item.imageUrl] : []);
  const carouselWidth = isDesktop ? 480 : SCREEN_WIDTH;
  const isOwner = item.sellerId === user?.uid;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.md, paddingTop: isDesktop ? SPACING.md : 50, paddingBottom: SPACING.sm,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>Product Details</Text>
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          <TouchableOpacity onPress={handleShare} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="share-social-outline" size={17} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReport} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="flag-outline" size={17} color={COLORS.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={isDesktop ? { flexDirection: 'row', padding: SPACING.lg, gap: SPACING.lg } : undefined}>

          {/* Hero image carousel */}
          <View>
            <View style={{ width: carouselWidth, height: carouselWidth * 0.85, backgroundColor: COLORS.background }}>
              {images.length > 0 ? (
                <ScrollView
                  horizontal pagingEnabled showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={e => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / carouselWidth))}>
                  {images.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={{ width: carouselWidth, height: carouselWidth * 0.85 }} resizeMode="cover" />
                  ))}
                </ScrollView>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="image-outline" size={48} color={COLORS.border} />
                </View>
              )}
              {item.status === 'sold' && (
                <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' } as any}>
                  <View style={{ backgroundColor: COLORS.textDark, paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.sm }}>
                    <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>SOLD</Text>
                  </View>
                </View>
              )}
            </View>
            {images.length > 1 && (
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: SPACING.sm }}>
                {images.map((_, i) => (
                  <View key={i} style={{
                    width: activeImage === i ? 18 : 6, height: 6, borderRadius: 3,
                    backgroundColor: activeImage === i ? COLORS.primaryRed : COLORS.border,
                  }} />
                ))}
              </View>
            )}
          </View>

          <View style={{ flex: 1, paddingHorizontal: isDesktop ? 0 : SPACING.md, paddingTop: isDesktop ? 0 : SPACING.md }}>
            {/* Price + save */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 26, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryRed }}>
                  ₦{Number(item.price).toLocaleString()}
                </Text>
                <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textDark, marginTop: 4 }}>
                  {item.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={toggleSave}
                style={{
                  width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: saved ? COLORS.primaryRed : COLORS.background,
                }}>
                <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? COLORS.white : COLORS.textDark} />
              </TouchableOpacity>
            </View>

            {/* Meta row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="eye-outline" size={14} color={COLORS.textLight} />
                <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>{item.views || 0} views</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="bookmark-outline" size={14} color={COLORS.textLight} />
                <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>{item.savedBy?.length || 0} saved</Text>
              </View>
              {item.category && (
                <View style={{ backgroundColor: COLORS.background, paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill }}>
                  <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textDark, fontWeight: FONT_WEIGHT.semiBold }}>{item.category}</Text>
                </View>
              )}
            </View>

            {/* Description */}
            {!!item.description && (
              <View style={{ marginTop: SPACING.lg }}>
                <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: 6 }}>
                  Description
                </Text>
                <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textLight, lineHeight: 21 }}>
                  {item.description}
                </Text>
              </View>
            )}

            {/* Seller card */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
              backgroundColor: COLORS.background, borderRadius: RADIUS.md, padding: SPACING.md,
              marginTop: SPACING.lg,
            }}>
              {item.sellerPhoto ? (
                <Image source={{ uri: item.sellerPhoto }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: 18 }}>{(item.sellerName || 'U')[0]}</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>{item.sellerName}</Text>
                <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>{item.sellerDept || 'ESUT Student'}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            </View>

            {/* Action buttons */}
            {!isOwner && (
              <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg }}>
                <TouchableOpacity
                  onPress={messageSeller}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                    backgroundColor: COLORS.primaryRed, borderRadius: RADIUS.md, paddingVertical: 14,
                  }}>
                  <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.white} />
                  <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.body }}>Chat Seller</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{
                    width: 52, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
                  }}>
                  <Ionicons name="call-outline" size={20} color={COLORS.textDark} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Related products */}
        {related.length > 0 && (
          <View style={{ marginTop: SPACING.lg, paddingHorizontal: isDesktop ? SPACING.lg : SPACING.md }}>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>
              Related Products
            </Text>
            <FlatList
              data={related}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={p => p.id}
              renderItem={({ item: rel }) => (
                <View style={{ marginRight: SPACING.sm }}>
                  <ProductCard item={rel} width={160} onPress={() => router.push({ pathname: '/marketplace/[id]', params: { id: rel.id } })} />
                </View>
              )}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}