
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  SafeAreaView, useWindowDimensions, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection, query, orderBy, onSnapshot,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../../components/Sidebar';
import ProductCard, { MarketplaceItem } from '../../components/marketplace/ProductCard';
import CategoryTabs from '../../components/marketplace/CategoryTabs';
import FiltersModal, { MarketplaceFilters, DEFAULT_FILTERS } from '../../components/marketplace/FiltersModal';
import FadeInView from '../../components/FadeInView';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW,
  DESKTOP_BREAKPOINT,
} from '../../constants/theme';

export default function MarketplaceScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [category, setCategory] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MarketplaceFilters>(DEFAULT_FILTERS);
  const [refreshing, setRefreshing] = useState(false);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  // Real-time Firestore listener — unchanged backend behavior
  useEffect(() => {
    const q = query(collection(db, 'marketplace'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap =>
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as MarketplaceItem)))
    );
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  }, []);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.minPrice) n++;
    if (filters.maxPrice) n++;
    if (filters.condition) n++;
    if (filters.sortBy !== 'recent') n++;
    return n;
  }, [filters]);

  const filtered = useMemo(() => {
    let result = items.filter(i => i.status !== 'sold' || category === 'All');

    if (category !== 'All') {
      result = result.filter(i => i.category === category);
    }

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.sellerName?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q) ||
        i.sellerDept?.toLowerCase().includes(q)
      );
    }

    if (filters.minPrice) result = result.filter(i => i.price >= Number(filters.minPrice));
    if (filters.maxPrice) result = result.filter(i => i.price <= Number(filters.maxPrice));
    if (filters.condition) result = result.filter(i => i.condition === filters.condition);

    if (filters.sortBy === 'priceLow') result = [...result].sort((a, b) => a.price - b.price);
    else if (filters.sortBy === 'priceHigh') result = [...result].sort((a, b) => b.price - a.price);
    else if (filters.sortBy === 'popular') result = [...result].sort((a, b) => (b.views || 0) - (a.views || 0));

    return result;
  }, [items, category, searchText, filters]);

  const openProduct = (item: MarketplaceItem) => {
    router.push({ pathname: '/marketplace/[id]', params: { id: item.id } });
  };

  const cardWidth = isDesktop ? 200 : (width - SPACING.md * 2 - SPACING.sm) / 2;

  // ── Header (shared mobile/desktop) ──────────────────────────────────────
  const Header = () => (
    <View style={{ backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.md, paddingTop: isDesktop ? SPACING.md : 50, paddingBottom: SPACING.sm,
      }}>
        <Text style={{ fontSize: FONT_SIZE.header, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>
          Marketplace
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <TouchableOpacity
            onPress={() => setLayout(l => l === 'grid' ? 'list' : 'grid')}
            hitSlop={8}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={layout === 'grid' ? 'list-outline' : 'grid-outline'} size={18} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/marketplace/my-listings')}
            hitSlop={8}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="briefcase-outline" size={18} color={COLORS.textDark} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/marketplace/create')}
            hitSlop={8}
            style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={22} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search + filter row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm }}>
        <View style={{
          flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: COLORS.background, borderRadius: RADIUS.pill,
          paddingHorizontal: SPACING.md, height: 44,
        }}>
          <Ionicons name="search-outline" size={18} color={COLORS.textLight} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search products, sellers, categories..."
            placeholderTextColor={COLORS.textLight}
            style={{ flex: 1, fontSize: FONT_SIZE.body, color: COLORS.textDark }}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: activeFilterCount > 0 ? COLORS.primaryRed : COLORS.background,
            alignItems: 'center', justifyContent: 'center',
          }}>
          <Ionicons name="options-outline" size={19} color={activeFilterCount > 0 ? COLORS.white : COLORS.textDark} />
          {activeFilterCount > 0 && (
            <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: COLORS.goldBadge, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
              <Text style={{ color: COLORS.white, fontSize: 9, fontWeight: FONT_WEIGHT.bold }}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <CategoryTabs active={category} onChange={setCategory} />
    </View>
  );

  // ── Body content (list) ─────────────────────────────────────────────────
  const ListBody = (
    <FlatList
      data={filtered}
      key={layout} // forces FlatList to remount when switching numColumns
      keyExtractor={i => i.id}
      numColumns={layout === 'grid' ? (isDesktop ? 4 : 2) : 1}
      columnWrapperStyle={layout === 'grid' ? { gap: SPACING.sm, paddingHorizontal: SPACING.md } : undefined}
      contentContainerStyle={{ paddingVertical: SPACING.md, paddingHorizontal: layout === 'list' ? SPACING.md : 0, gap: SPACING.sm, paddingBottom: isDesktop ? SPACING.lg : 90 }}
      ListHeaderComponent={<Header />}
      stickyHeaderIndices={[0]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryRed]} tintColor={COLORS.primaryRed} />}
      renderItem={({ item, index }) => (
        <FadeInView delay={Math.min(index, 8) * 40} style={layout === 'grid' ? { flex: 1 } : undefined}>
          <ProductCard item={item} onPress={() => openProduct(item)} width={cardWidth} layout={layout} />
        </FadeInView>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 70, gap: SPACING.sm, paddingHorizontal: SPACING.lg }}>
          <Ionicons name="storefront-outline" size={56} color={COLORS.border} />
          <Text style={{ color: COLORS.textDark, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.cardTitle }}>
            No listings found
          </Text>
          <Text style={{ color: COLORS.textLight, fontSize: FONT_SIZE.body, textAlign: 'center' }}>
            {searchText || activeFilterCount > 0 || category !== 'All'
              ? 'Try adjusting your search or filters'
              : 'Be the first to list something!'}
          </Text>
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );

  if (isDesktop) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, flexDirection: 'row' }}>
        <Sidebar />
        <View style={{ flex: 1 }}>{ListBody}</View>
        <FiltersModal visible={showFilters} onClose={() => setShowFilters(false)} filters={filters} onApply={setFilters} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {ListBody}
      <Sidebar />
      <FiltersModal visible={showFilters} onClose={() => setShowFilters(false)} filters={filters} onApply={setFilters} />
    </SafeAreaView>
  );
}