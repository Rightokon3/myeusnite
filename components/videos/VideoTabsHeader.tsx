
import { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING } from '../../constants/theme';

export type VideoTab = 'trending' | 'forYou';

interface Props {
  active: VideoTab;
  onChange: (tab: VideoTab) => void;
  onSearchPress: () => void;
  topInset: number;
}

export default function VideoTabsHeader({ active, onChange, onSearchPress, topInset }: Props) {
  const underlineX = useRef(new Animated.Value(active === 'trending' ? 0 : 1)).current;

  useEffect(() => {
    Animated.spring(underlineX, { toValue: active === 'trending' ? 0 : 1, useNativeDriver: true, bounciness: 4 }).start();
  }, [active]);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
        paddingTop: topInset, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', gap: SPACING.lg }}>
          {(['trending', 'forYou'] as VideoTab[]).map(tab => (
            <TouchableOpacity key={tab} onPress={() => onChange(tab)} hitSlop={8}>
              <Text style={{
                fontSize: FONT_SIZE.cardTitle,
                fontWeight: active === tab ? FONT_WEIGHT.bold : FONT_WEIGHT.medium,
                color: active === tab ? COLORS.white : 'rgba(255,255,255,0.55)',
                textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4,
              }}>
                {tab === 'trending' ? 'Trending' : 'For You'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={onSearchPress} hitSlop={8}>
          <Ionicons name="search" size={22} color={COLORS.white} style={{ textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}