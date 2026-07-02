// components/TypingIndicator.tsx
import { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';

export default function TypingIndicator({ names }: { names: string[] }) {
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (d: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(d, { toValue: -5, duration: 280, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.delay(560),
      ])).start();
    anim(d1, 0); anim(d2, 180); anim(d3, 360);
  }, []);

  const label = names.length === 1 ? `${names[0]} is typing` : `${names.slice(0, 2).join(' & ')} are typing`;

  return (
    <View className="flex-row items-center px-4 py-2 gap-2">
      <View className="bg-white rounded-2xl px-3 py-2 flex-row gap-1 items-center" style={{ elevation: 1 }}>
        {[d1, d2, d3].map((d, i) => (
          <Animated.View key={i} className="w-1.5 h-1.5 rounded-full bg-gray-300" style={{ transform: [{ translateY: d }] }} />
        ))}
      </View>
      <Text className="text-gray-400 text-xs italic">{label}...</Text>
    </View>
  );
}