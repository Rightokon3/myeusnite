// components/RightSidebar.tsx
// Desktop-only right column: Upcoming Events / Marketplace / Sponsored / Online Friends widgets
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FadeInView from './FadeInView';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW, RIGHT_SIDEBAR_WIDTH } from '../constants/theme';

interface WidgetCardProps {
  children: React.ReactNode;
  delay?: number;
}
function WidgetCard({ children, delay }: WidgetCardProps) {
  return (
    <FadeInView
      delay={delay}
      style={{
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOW.card,
      }}>
      {children}
    </FadeInView>
  );
}

interface RightSidebarProps {
  events: any[];
  marketItems: any[];
  onlineFriends: any[];
}

export default function RightSidebar({ events, marketItems, onlineFriends }: RightSidebarProps) {
  const router = useRouter();

  const defaultEvents = events.length > 0 ? events : [
    { id: '1', day: '28', title: 'Faculty Dinner Night' },
    { id: '2', day: '05', title: 'Tech Innovation Workshop' },
  ];

  const defaultMarket = marketItems.length > 0 ? marketItems.slice(0, 2) : [
    { id: '1', title: 'Laptop for Sale', price: 150000 },
    { id: '2', title: 'Used Textbooks', price: 5000 },
  ];

  return (
    <View style={{ width: RIGHT_SIDEBAR_WIDTH, paddingLeft: SPACING.md }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: SPACING.md }}>

        {/* Upcoming Events */}
        <WidgetCard delay={0}>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, marginBottom: SPACING.sm }}>
            Upcoming Events
          </Text>
          {defaultEvents.map((ev, i) => (
            <View
              key={ev.id || i}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
                paddingVertical: 10,
                borderBottomWidth: i < defaultEvents.length - 1 ? 1 : 0,
                borderBottomColor: COLORS.border,
              }}>
              <View style={{ width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.caption }}>
                  {ev.day || '•'}
                </Text>
              </View>
              <Text style={{ flex: 1, fontSize: FONT_SIZE.body, color: COLORS.textDark, fontWeight: FONT_WEIGHT.medium }} numberOfLines={1}>
                {ev.title}
              </Text>
              <TouchableOpacity hitSlop={8}>
                <Ionicons name="close" size={14} color={COLORS.textLight} />
              </TouchableOpacity>
            </View>
          ))}
        </WidgetCard>

        {/* Marketplace widget */}
        <WidgetCard delay={80}>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryRed, marginBottom: SPACING.sm }}>
            Marketplace
          </Text>
          {defaultMarket.map((item, i) => (
            <TouchableOpacity
              key={item.id || i}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/marketplace')}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
                paddingVertical: 8,
              }}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={{ width: 44, height: 44, borderRadius: RADIUS.sm }} />
              ) : (
                <View style={{ width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="image-outline" size={20} color={COLORS.border} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: FONT_SIZE.caption + 1, color: COLORS.textDark, fontWeight: FONT_WEIGHT.semiBold }} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.primaryRed, fontWeight: FONT_WEIGHT.bold }}>
                  ₦{Number(item.price).toLocaleString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </WidgetCard>

        {/* Sponsored */}
        <WidgetCard delay={160}>
          <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryRed, marginBottom: SPACING.sm }}>
            Sponsored
          </Text>
          <View style={{ backgroundColor: COLORS.primaryRed, borderRadius: RADIUS.sm, padding: SPACING.md }}>
            <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.body, marginBottom: 4 }}>
              Ace Your Exams!
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: FONT_SIZE.caption, marginBottom: SPACING.sm }}>
              Join Our JAMB Tutorials Now
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              style={{ backgroundColor: COLORS.white, alignSelf: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.pill }}>
              <Text style={{ color: COLORS.primaryRed, fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.bold }}>
                Learn More
              </Text>
            </TouchableOpacity>
          </View>
        </WidgetCard>

        {/* Online Friends */}
        <WidgetCard delay={240}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.primaryRed }}>
              Online Friends
            </Text>
            <TouchableOpacity>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, fontWeight: FONT_WEIGHT.medium }}>More ›</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
            {(onlineFriends.length > 0 ? onlineFriends : Array.from({ length: 5 })).map((f: any, i) => (
              <View key={f?.id || i} style={{ position: 'relative' }}>
                {f?.photoURL ? (
                  <Image source={{ uri: f.photoURL }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                ) : (
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryRed, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.caption }}>
                      {(f?.fullName || 'U')[0]}
                    </Text>
                  </View>
                )}
                <View style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success, borderWidth: 2, borderColor: COLORS.white }} />
              </View>
            ))}
          </View>
        </WidgetCard>

      </ScrollView>
    </View>
  );
}