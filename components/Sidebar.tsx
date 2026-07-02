
import { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Image, ScrollView,
  Animated, useWindowDimensions, Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS,
  DESKTOP_BREAKPOINT, LEFT_SIDEBAR_WIDTH,
} from '../constants/theme';

// ── Desktop nav links ──────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'Home', icon: 'home', iconOut: 'home-outline', path: '/(tabs)' },
  { label: 'Messages', icon: 'chatbubble', iconOut: 'chatbubble-outline', path: '/(tabs)/messages' },
  { label: 'Marketplace', icon: 'storefront', iconOut: 'storefront-outline', path: '/(tabs)/marketplace' },
  { label: 'Groups', icon: 'people', iconOut: 'people-outline', path: '/(tabs)/groups' },
  { label: 'Videos', icon: 'play-circle', iconOut: 'play-circle-outline', path: '/(tabs)/videos' },
  { label: 'Events', icon: 'calendar', iconOut: 'calendar-outline', path: '/(tabs)' },
];

const SHORTCUTS = [
  { label: 'Book Store', icon: 'book-outline', path: '/(tabs)/marketplace' },
  { label: 'Tutoring Services', icon: 'school-outline', path: '/(tabs)/groups' },
  { label: 'Pay School Fees', icon: 'card-outline', path: '/(tabs)' },
];

// ── Mobile bottom tabs ──────────────────────────────────────────────────────
const MOBILE_TABS = [
  { label: 'Home', icon: 'home', iconOut: 'home-outline', path: '/(tabs)' },
  { label: 'Ads', icon: 'megaphone', iconOut: 'megaphone-outline', path: '/(tabs)/marketplace' },
  { label: 'Betting', icon: 'trophy', iconOut: 'trophy-outline', path: '/(tabs)' },
  { label: 'Profile', icon: 'person', iconOut: 'person-outline', path: '/(tabs)/profile' },
];

function PulsingDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        position: 'absolute', top: -3, right: -3, width: 10, height: 10,
        borderRadius: 5, backgroundColor: COLORS.goldBadge,
        transform: [{ scale }],
      }}
    />
  );
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const navigate = (item: { path: string; params?: any }) => {
    if (item.params) router.push({ pathname: item.path as any, params: item.params });
    else router.push(item.path as any);
  };

  // ── MOBILE: fixed bottom tab bar ──────────────────────────────────────────
  if (!isDesktop) {
    return (
      <View
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 70, backgroundColor: COLORS.primaryRed,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
          paddingBottom: Platform.OS === 'ios' ? 18 : 8,
          shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.12, shadowRadius: 8, elevation: 12,
        }}>
        {MOBILE_TABS.map(tab => {
          const isActive = pathname === tab.path;
          return (
            <TouchableOpacity
              key={tab.label}
              activeOpacity={0.75}
              onPress={() => navigate(tab)}
              style={{ alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44, gap: 3 }}>
              <View
                style={{
                  width: 34, height: 34, borderRadius: 17,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isActive ? COLORS.white : 'transparent',
                }}>
                <Ionicons
                  name={(isActive ? tab.icon : tab.iconOut) as any}
                  size={20}
                  color={isActive ? COLORS.primaryRed : COLORS.white}
                />
              </View>
              <Text
                style={{
                  fontSize: FONT_SIZE.caption - 1,
                  fontWeight: isActive ? FONT_WEIGHT.bold : FONT_WEIGHT.medium,
                  color: COLORS.white,
                }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── DESKTOP: full left sidebar ────────────────────────────────────────────
  return (
    <View
      style={{
        width: LEFT_SIDEBAR_WIDTH,
        backgroundColor: COLORS.white,
        borderRightWidth: 1,
        borderRightColor: COLORS.border,
      }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Profile section */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/(tabs)/profile')}
          style={{
            backgroundColor: COLORS.primaryRed,
            alignItems: 'center',
            paddingVertical: SPACING.xl,
            paddingHorizontal: SPACING.md,
          }}>
          {profile?.photoURL ? (
            <Image
              source={{ uri: profile.photoURL }}
              style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' }}
            />
          ) : (
            <View
              style={{
                width: 84, height: 84, borderRadius: 42,
                backgroundColor: 'rgba(255,255,255,0.22)',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
              }}>
              <Text style={{ color: COLORS.white, fontSize: 30, fontWeight: FONT_WEIGHT.bold }}>
                {(profile?.fullName || 'U')[0]}
              </Text>
            </View>
          )}
          <Text style={{ color: COLORS.white, fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.sm }}>
            {profile?.fullName || 'User'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: FONT_SIZE.caption, marginTop: 2 }}>
            {profile?.department || ''}
          </Text>
        </TouchableOpacity>

        {/* Nav links */}
        <View style={{ paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm }}>
          {NAV_LINKS.map(item => {
            const isActive = pathname === item.path;
            const hasNotif = item.label === 'Messages' && unreadCount > 0;
            return (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.8}
                onPress={() => navigate(item)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
                  paddingVertical: 12, paddingHorizontal: SPACING.md,
                  borderRadius: RADIUS.sm, marginBottom: 2,
                  backgroundColor: isActive ? COLORS.primaryRed : 'transparent',
                }}>
                <View style={{ width: 22 }}>
                  <Ionicons
                    name={(isActive ? item.icon : item.iconOut) as any}
                    size={20}
                    color={isActive ? COLORS.white : COLORS.textLight}
                  />
                  {hasNotif && <PulsingDot />}
                </View>
                <Text
                  style={{
                    flex: 1, fontSize: FONT_SIZE.body,
                    fontWeight: isActive ? FONT_WEIGHT.semiBold : FONT_WEIGHT.medium,
                    color: isActive ? COLORS.white : COLORS.textDark,
                  }}>
                  {item.label}
                </Text>
                {hasNotif && (
                  <View style={{ backgroundColor: isActive ? COLORS.white : COLORS.primaryRed, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                    <Text style={{ color: isActive ? COLORS.primaryRed : COLORS.white, fontSize: 10, fontWeight: FONT_WEIGHT.bold }}>
                      {unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Shortcuts */}
        <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl }}>
          <Text
            style={{
              fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.bold,
              color: COLORS.textLight, textTransform: 'uppercase',
              letterSpacing: 0.5, marginBottom: SPACING.sm, marginTop: SPACING.sm,
            }}>
            Shortcuts
          </Text>
          {SHORTCUTS.map(item => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.8}
              onPress={() => navigate(item)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 10 }}>
              <Ionicons name={item.icon as any} size={18} color={COLORS.primaryRed} />
              <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textDark, fontWeight: FONT_WEIGHT.medium }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={logout}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
            paddingVertical: 14, paddingHorizontal: SPACING.md,
            borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: SPACING.sm,
          }}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.primaryRed} />
          <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.primaryRed, fontWeight: FONT_WEIGHT.semiBold }}>
            Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}