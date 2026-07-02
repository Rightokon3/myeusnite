
import { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import ProductCard, { MarketplaceItem } from '../../components/marketplace/ProductCard';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW, DESKTOP_BREAKPOINT } from '../../constants/theme';

export default function MyListingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [items, setItems] = useState<MarketplaceItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'marketplace'), where('sellerId', '==', user.uid), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem))));
  }, [user]);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(i => i.status !== 'sold').length,
    sold: items.filter(i => i.status === 'sold').length,
    totalViews: items.reduce((sum, i) => sum + (i.views || 0), 0),
  }), [items]);

  const StatCard = ({ label, value, icon }: { label: string; value: number; icon: any }) => (
    <View style={{ flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, alignItems: 'center', ...SHADOW.card }}>
      <Ionicons name={icon} size={20} color={COLORS.primaryRed} />
      <Text style={{ fontSize: FONT_SIZE.header, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginTop: 6 }}>{value}</Text>
      <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, marginTop: 2 }}>{label}</Text>
    </View>
  );

  const cardWidth = isDesktop ? 200 : (width - SPACING.md * 3) / 2;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
        paddingHorizontal: SPACING.md, paddingTop: isDesktop ? SPACING.md : 50, paddingBottom: SPACING.md,
        backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={{ fontSize: FONT_SIZE.header, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>My Listings</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        numColumns={2}
        columnWrapperStyle={{ gap: SPACING.sm, paddingHorizontal: SPACING.md }}
        contentContainerStyle={{ paddingVertical: SPACING.md, gap: SPACING.sm, paddingBottom: 90 }}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, marginBottom: SPACING.md }}>
            <StatCard label="Total" value={stats.total} icon="layers-outline" />
            <StatCard label="Active" value={stats.active} icon="checkmark-circle-outline" />
            <StatCard label="Sold" value={stats.sold} icon="cash-outline" />
            <StatCard label="Views" value={stats.totalViews} icon="eye-outline" />
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ flex: 1 }}>
            <ProductCard item={item} width={cardWidth} onPress={() => router.push({ pathname: '/marketplace/[id]', params: { id: item.id } })} />
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 70, gap: SPACING.sm }}>
            <Ionicons name="briefcase-outline" size={56} color={COLORS.border} />
            <Text style={{ color: COLORS.textDark, fontWeight: FONT_WEIGHT.bold }}>No listings yet</Text>
            <TouchableOpacity
              onPress={() => router.push('/marketplace/create')}
              style={{ backgroundColor: COLORS.primaryRed, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.lg, paddingVertical: 10, marginTop: SPACING.sm }}>
              <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>Create your first listing</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}