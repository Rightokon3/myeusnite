// components/marketplace/CategoryTabs.tsx
import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../../constants/theme';

export const CATEGORIES = [
  { key: 'All', icon: 'apps-outline' as const },
  { key: 'Books', icon: 'book-outline' as const },
  { key: 'Electronics', icon: 'laptop-outline' as const },
  { key: 'Hostel', icon: 'bed-outline' as const },
  { key: 'Services', icon: 'construct-outline' as const },
  { key: 'Fashion', icon: 'shirt-outline' as const },
  { key: 'Jobs', icon: 'briefcase-outline' as const },
  { key: 'Tutoring', icon: 'school-outline' as const },
  { key: 'Events', icon: 'calendar-outline' as const },
];

interface Props {
  active: string;
  onChange: (cat: string) => void;
}

export default function CategoryTabs({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border }}
      contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm }}>
      {CATEGORIES.map(cat => {
        const isActive = active === cat.key;
        return (
          <TouchableOpacity
            key={cat.key}
            onPress={() => onChange(cat.key)}
            activeOpacity={0.8}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              paddingHorizontal: SPACING.md, paddingVertical: 9,
              borderRadius: RADIUS.pill,
              backgroundColor: isActive ? COLORS.primaryRed : COLORS.background,
              minHeight: 38,
            }}>
            <Ionicons name={cat.icon} size={14} color={isActive ? COLORS.white : COLORS.textLight} />
            <Text style={{
              fontSize: FONT_SIZE.caption + 1,
              fontWeight: isActive ? FONT_WEIGHT.bold : FONT_WEIGHT.medium,
              color: isActive ? COLORS.white : COLORS.textLight,
            }}>
              {cat.key}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}