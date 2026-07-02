import { memo, useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import AnimatedPressable from '../AnimatedPressable';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW } from '../../constants/theme';

export interface MarketplaceItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  condition?: string;
  location?: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  sellerId: string;
  sellerName: string;
  sellerDept?: string;
  sellerPhoto?: string | null;
  views?: number;
  savedBy?: string[];
  status?: 'active' | 'sold' | 'pending' | 'expired' | 'draft';
  isPremium?: boolean;
  createdAt: any;
}

function timeAgo(ts: any) {
  if (!ts?.seconds) return 'just now';
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  item: MarketplaceItem;
  onPress: () => void;
  width: number;
  layout?: 'grid' | 'list';
}

function ProductCard({ item, onPress, width, layout = 'grid' }: Props) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(item.savedBy?.includes(user?.uid || '') ?? false);
  const [savedCount, setSavedCount] = useState(item.savedBy?.length || 0);
  const cover = item.imageUrls?.[0] || item.imageUrl;

  const toggleSave = async (e: any) => {
    e.stopPropagation?.();
    if (!user) return;
    const ref = doc(db, 'marketplace', item.id);
    if (saved) {
      await updateDoc(ref, { savedBy: arrayRemove(user.uid) });
      setSavedCount(c => c - 1);
    } else {
      await updateDoc(ref, { savedBy: arrayUnion(user.uid) });
      setSavedCount(c => c + 1);
    }
    setSaved(s => !s);
  };

  if (layout === 'list') {
    return (
      <AnimatedPressable
        onPress={onPress}
        scaleTo={0.98}
        style={{
          flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.md,
          overflow: 'hidden', marginBottom: SPACING.md, ...SHADOW.card,
        }}>
        <View style={{ width: 110, height: 110, backgroundColor: COLORS.background }}>
          {cover ? (
            <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="image-outline" size={28} color={COLORS.border} />
            </View>
          )}
          {item.status === 'sold' && (
            <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' } as any}>
              <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.caption }}>SOLD</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, padding: SPACING.sm, justifyContent: 'center' }}>
          <Text numberOfLines={1} style={{ fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.semiBold, color: COLORS.textDark }}>{item.title}</Text>
          <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryRed, marginTop: 2 }}>
            ₦{Number(item.price).toLocaleString()}
          </Text>
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, marginTop: 2 }} numberOfLines={1}>
            {item.location || item.sellerDept || ''}  •  {timeAgo(item.createdAt)}
          </Text>
        </View>
        <TouchableOpacity onPress={toggleSave} hitSlop={8} style={{ padding: SPACING.sm, justifyContent: 'center' }}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? COLORS.primaryRed : COLORS.textLight} />
        </TouchableOpacity>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.96}
      style={{
        width, backgroundColor: COLORS.white, borderRadius: RADIUS.md,
        overflow: 'hidden', ...SHADOW.card,
      }}>
      <View style={{ height: width * 0.85, backgroundColor: COLORS.background }}>
        {cover ? (
          <Image source={{ uri: cover }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="image-outline" size={32} color={COLORS.border} />
          </View>
        )}

        {item.isPremium && (
          <View style={{
            position: 'absolute', top: 8, left: 8, backgroundColor: COLORS.goldBadge,
            borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 3,
            flexDirection: 'row', alignItems: 'center', gap: 3,
          }}>
            <Ionicons name="star" size={10} color={COLORS.white} />
            <Text style={{ color: COLORS.white, fontSize: 9, fontWeight: FONT_WEIGHT.bold }}>FEATURED</Text>
          </View>
        )}

        {item.status === 'sold' && (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' } as any}>
            <View style={{ backgroundColor: COLORS.textDark, paddingHorizontal: 14, paddingVertical: 5, borderRadius: RADIUS.sm }}>
              <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.caption }}>SOLD</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          onPress={toggleSave}
          hitSlop={8}
          style={{
            position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15,
            backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
          }}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={15} color={saved ? COLORS.primaryRed : COLORS.textLight} />
        </TouchableOpacity>
      </View>

      <View style={{ padding: SPACING.sm }}>
        <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryRed }}>
          ₦{Number(item.price).toLocaleString()}
        </Text>
        <Text numberOfLines={2} style={{ fontSize: FONT_SIZE.caption + 1, color: COLORS.textDark, marginTop: 2, minHeight: 32, fontWeight: FONT_WEIGHT.medium }}>
          {item.title}
        </Text>
        <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, marginTop: 4 }} numberOfLines={1}>
          {item.location || item.sellerDept || 'ESUT Campus'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="eye-outline" size={12} color={COLORS.textLight} />
            <Text style={{ fontSize: 10, color: COLORS.textLight }}>{item.views || 0}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="bookmark" size={11} color={COLORS.textLight} />
            <Text style={{ fontSize: 10, color: COLORS.textLight }}>{savedCount}</Text>
          </View>
          <Text style={{ fontSize: 10, color: COLORS.textLight, marginLeft: 'auto' }}>{timeAgo(item.createdAt)}</Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}

export default memo(ProductCard, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.item.price === next.item.price &&
  prev.item.title === next.item.title &&
  prev.item.status === next.item.status &&
  prev.item.savedBy?.length === next.item.savedBy?.length &&
  prev.width === next.width
);