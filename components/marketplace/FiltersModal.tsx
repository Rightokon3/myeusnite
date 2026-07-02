
import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

export interface MarketplaceFilters {
  minPrice: string;
  maxPrice: string;
  condition: string | null;
  sortBy: 'recent' | 'popular' | 'priceLow' | 'priceHigh';
}

export const DEFAULT_FILTERS: MarketplaceFilters = {
  minPrice: '',
  maxPrice: '',
  condition: null,
  sortBy: 'recent',
};

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Used'];
const SORT_OPTIONS: { key: MarketplaceFilters['sortBy']; label: string; icon: any }[] = [
  { key: 'recent', label: 'Recently Added', icon: 'time-outline' },
  { key: 'popular', label: 'Most Popular', icon: 'flame-outline' },
  { key: 'priceLow', label: 'Price: Low to High', icon: 'arrow-up-outline' },
  { key: 'priceHigh', label: 'Price: High to Low', icon: 'arrow-down-outline' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: MarketplaceFilters;
  onApply: (f: MarketplaceFilters) => void;
}

export default function FiltersModal({ visible, onClose, filters, onApply }: Props) {
  const [local, setLocal] = useState<MarketplaceFilters>(filters);

  useEffect(() => { if (visible) setLocal(filters); }, [visible, filters]);

  const reset = () => setLocal(DEFAULT_FILTERS);
  const apply = () => { onApply(local); onClose(); };

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
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.white }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Text style={{ color: COLORS.textLight, fontSize: FONT_SIZE.body }}>Close</Text>
          </TouchableOpacity>
          <Text style={{ fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.cardTitle, color: COLORS.textDark }}>Filters</Text>
          <TouchableOpacity onPress={reset} hitSlop={8}>
            <Text style={{ color: COLORS.primaryRed, fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.semiBold }}>Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg }}>

          {/* Price range */}
          <View>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>
              Price Range (₦)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <TextInput
                value={local.minPrice}
                onChangeText={v => setLocal(f => ({ ...f, minPrice: v }))}
                placeholder="Min"
                placeholderTextColor={COLORS.textLight}
                keyboardType="numeric"
                style={{ flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12, fontSize: FONT_SIZE.body, color: COLORS.textDark }}
              />
              <Text style={{ color: COLORS.textLight }}>—</Text>
              <TextInput
                value={local.maxPrice}
                onChangeText={v => setLocal(f => ({ ...f, maxPrice: v }))}
                placeholder="Max"
                placeholderTextColor={COLORS.textLight}
                keyboardType="numeric"
                style={{ flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 12, fontSize: FONT_SIZE.body, color: COLORS.textDark }}
              />
            </View>
          </View>

          {/* Condition */}
          <View>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>
              Condition
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {CONDITIONS.map(c => (
                <Chip key={c} label={c} active={local.condition === c} onPress={() => setLocal(f => ({ ...f, condition: f.condition === c ? null : c }))} />
              ))}
            </View>
          </View>

          {/* Sort by */}
          <View>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>
              Sort By
            </Text>
            {SORT_OPTIONS.map(opt => {
              const active = local.sortBy === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setLocal(f => ({ ...f, sortBy: opt.key }))}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
                    paddingVertical: 12, paddingHorizontal: SPACING.md,
                    borderRadius: RADIUS.sm, marginBottom: 6,
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
        </ScrollView>

        <View style={{ padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border }}>
          <TouchableOpacity
            onPress={apply}
            style={{ backgroundColor: COLORS.primaryRed, borderRadius: RADIUS.md, paddingVertical: 15, alignItems: 'center' }}>
            <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.body }}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}