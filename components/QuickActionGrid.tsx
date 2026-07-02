// components/QuickActionGrid.tsx
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from './AnimatedPressable';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS } from '../constants/theme';

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}

export default function QuickActionGrid({ actions }: { actions: Action[] }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.primaryRed,
        borderRadius: RADIUS.md,
        flexDirection: 'row',
        overflow: 'hidden',
      }}>
      {actions.map((action, i) => (
        <AnimatedPressable
          key={action.label}
          onPress={action.onPress}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: SPACING.md,
            gap: 6,
            minHeight: 44,
            borderRightWidth: i < actions.length - 1 ? 1 : 0,
            borderRightColor: 'rgba(255,255,255,0.18)',
          }}>
          <Ionicons name={action.icon} size={22} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.semiBold }}>
            {action.label}
          </Text>
        </AnimatedPressable>
      ))}
    </View>
  );
}