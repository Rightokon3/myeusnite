
import { useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, SafeAreaView,
  useWindowDimensions, TextInput, Image, Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useNotifications } from '../hooks/useNotifications';
import { AppNotification } from '../hooks/useNotifications';
import Sidebar from '../components/Sidebar';
import FadeInView from '../components/FadeInView';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW, DESKTOP_BREAKPOINT,
} from '../constants/theme';

// ── Filter tabs ──────────────────────────────────────────────────────────────
type FilterTab = 'all' | 'unread' | 'social' | 'groups' | 'marketplace' | 'events' | 'academic' | 'system';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',         label: 'All'         },
  { key: 'unread',      label: 'Unread'      },
  { key: 'social',      label: 'Social'      },
  { key: 'groups',      label: 'Groups'      },
  { key: 'marketplace', label: 'Marketplace' },
  { key: 'events',      label: 'Events'      },
  { key: 'academic',    label: 'Academic'    },
  { key: 'system',      label: 'System'      },
];

// Map each notification type to a filter bucket
const TYPE_BUCKET: Record<string, FilterTab> = {
  post_like: 'social', video_like: 'social', new_post: 'social',
  new_video: 'social', new_comment: 'social', comment_reply: 'social',
  mention: 'social', new_follower: 'social',
  group_invite: 'groups', group_post: 'groups', group_event: 'groups',
  group_message: 'groups',
  marketplace: 'marketplace', new_message: 'marketplace',
  event_reminder: 'events', event_invite: 'events', rsvp: 'events',
  announcement: 'academic', department_notice: 'academic',
  faculty_notice: 'academic', scholarship: 'academic',
  system: 'system', security: 'system', verification: 'system',
  admin_broadcast: 'system',
};

// ── Per-type visual config ────────────────────────────────────────────────────
interface TypeConfig {
  icon: any;
  color: string;
  bg: string;
  badge: string;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  post_like:         { icon: 'heart',              color: '#E30613', bg: '#FEE2E2', badge: 'Like'         },
  video_like:        { icon: 'heart',              color: '#E30613', bg: '#FEE2E2', badge: 'Like'         },
  new_comment:       { icon: 'chatbubble',         color: '#3B82F6', bg: '#DBEAFE', badge: 'Comment'      },
  comment_reply:     { icon: 'return-down-forward',color: '#8B5CF6', bg: '#EDE9FE', badge: 'Reply'        },
  mention:           { icon: 'at',                 color: '#10B981', bg: '#D1FAE5', badge: 'Mention'      },
  new_follower:      { icon: 'person-add',         color: '#F59E0B', bg: '#FEF3C7', badge: 'Follow'       },
  new_post:          { icon: 'document-text',      color: '#6366F1', bg: '#E0E7FF', badge: 'Post'         },
  new_video:         { icon: 'videocam',           color: '#EC4899', bg: '#FCE7F3', badge: 'Video'        },
  group_invite:      { icon: 'people',             color: '#059669', bg: '#D1FAE5', badge: 'Group'        },
  group_post:        { icon: 'people',             color: '#059669', bg: '#D1FAE5', badge: 'Group'        },
  group_message:     { icon: 'chatbubbles',        color: '#0EA5E9', bg: '#E0F2FE', badge: 'Group'        },
  marketplace:       { icon: 'storefront',         color: '#D97706', bg: '#FEF3C7', badge: 'Market'       },
  new_message:       { icon: 'chatbubble-ellipses',color: '#E30613', bg: '#FEE2E2', badge: 'Message'      },
  event_reminder:    { icon: 'calendar',           color: '#7C3AED', bg: '#EDE9FE', badge: 'Event'        },
  event_invite:      { icon: 'calendar-outline',   color: '#7C3AED', bg: '#EDE9FE', badge: 'Invite'       },
  rsvp:              { icon: 'checkmark-circle',   color: '#10B981', bg: '#D1FAE5', badge: 'RSVP'         },
  announcement:      { icon: 'megaphone',          color: '#E30613', bg: '#FEE2E2', badge: 'Campus'       },
  department_notice: { icon: 'school',             color: '#2563EB', bg: '#DBEAFE', badge: 'Dept'         },
  faculty_notice:    { icon: 'library',            color: '#7C3AED', bg: '#EDE9FE', badge: 'Faculty'      },
  scholarship:       { icon: 'ribbon',             color: '#F59E0B', bg: '#FEF3C7', badge: 'Scholar'      },
  system:            { icon: 'settings',           color: '#6B7280', bg: '#F3F4F6', badge: 'System'       },
  security:          { icon: 'shield-checkmark',   color: '#EF4444', bg: '#FEE2E2', badge: 'Security'     },
  admin_broadcast:   { icon: 'notifications',      color: '#E30613', bg: '#FEE2E2', badge: 'Admin'        },
  default:           { icon: 'notifications',      color: COLORS.textLight, bg: COLORS.background, badge: 'Info' },
};

function getConfig(type: string): TypeConfig {
  return TYPE_CONFIG[type] || TYPE_CONFIG.default;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(ts: any) {
  if (!ts?.seconds) return 'just now';
  const diff = Math.floor((Date.now() - ts.seconds * 1000) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Notification Card ────────────────────────────────────────────────────────
interface CardProps {
  item: AppNotification;
  onPress: () => void;
  onDismiss: () => void;
  index: number;
}

function NotificationCard({ item, onPress, onDismiss, index }: CardProps) {
  const cfg = getConfig(item.type);
  const slideX = useRef(new Animated.Value(0)).current;

  const handleDismiss = () => {
    Animated.timing(slideX, { toValue: -400, duration: 260, useNativeDriver: true }).start(() => onDismiss());
  };

  return (
    <FadeInView delay={Math.min(index, 10) * 30}>
      <Animated.View style={{ transform: [{ translateX: slideX }] }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPress}
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: SPACING.md,
            paddingHorizontal: SPACING.lg,
            paddingVertical: SPACING.md,
            backgroundColor: item.read ? COLORS.white : '#FEF2F2',
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}>

          {/* Avatar / icon */}
          <View style={{ position: 'relative' }}>
            {item.senderAvatar ? (
              <Image
                source={{ uri: item.senderAvatar }}
                style={{ width: 48, height: 48, borderRadius: 24 }}
              />
            ) : (
              <View style={{
                width: 48, height: 48, borderRadius: 24,
                backgroundColor: cfg.bg,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Ionicons name={cfg.icon} size={22} color={cfg.color} />
              </View>
            )}
            {/* Type badge overlaid on avatar */}
            {item.senderAvatar && (
              <View style={{
                position: 'absolute', bottom: -2, right: -2,
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: cfg.color,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: COLORS.white,
              }}>
                <Ionicons name={cfg.icon} size={10} color={COLORS.white} />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, flexWrap: 'wrap' }}>
              <View style={{
                backgroundColor: cfg.bg,
                borderRadius: RADIUS.pill,
                paddingHorizontal: 8, paddingVertical: 2,
              }}>
                <Text style={{ fontSize: 9, fontWeight: FONT_WEIGHT.bold, color: cfg.color, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {cfg.badge}
                </Text>
              </View>
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>
                {timeAgo(item.createdAt)}
              </Text>
            </View>

            <Text style={{
              fontSize: FONT_SIZE.body,
              fontWeight: item.read ? FONT_WEIGHT.regular : FONT_WEIGHT.semiBold,
              color: item.read ? COLORS.textLight : COLORS.textDark,
              lineHeight: 20,
            }}>
              {item.message}
            </Text>

            {item.senderName && (
              <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>
                from {item.senderName}
              </Text>
            )}
          </View>

          {/* Right side: unread dot + dismiss */}
          <View style={{ alignItems: 'center', gap: SPACING.sm }}>
            {!item.read && (
              <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.primaryRed }} />
            )}
            <TouchableOpacity onPress={handleDismiss} hitSlop={8}>
              <Ionicons name="close" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </FadeInView>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchText, setSearchText] = useState('');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismiss = useCallback((id: string) => {
    setDismissed(prev => new Set(prev).add(id));
    markRead(id);
  }, [markRead]);

  const handlePress = useCallback((item: AppNotification) => {
    markRead(item.id);
    // Route to the related content based on type
    if (item.type === 'new_message' && item.chatRoomId) {
      router.push({ pathname: '/chat', params: { roomId: item.chatRoomId } });
    } else if ((item.type === 'post_like' || item.type === 'new_comment') && item.postId) {
      router.push('/(tabs)');
    } else if ((item.type === 'video_like' || item.type === 'new_video') && item.videoId) {
      router.push('/(tabs)/videos');
    } else if (item.type === 'marketplace' && item.groupId) {
      router.push({ pathname: '/marketplace/[id]', params: { id: item.groupId } });
    } else if (item.type === 'group_invite' && item.groupId) {
      router.push('/(tabs)/groups');
    }
  }, [markRead, router]);

  const filtered = useMemo(() => {
    let result = notifications.filter(n => !dismissed.has(n.id));

    if (activeTab === 'unread') result = result.filter(n => !n.read);
    else if (activeTab !== 'all') {
      result = result.filter(n => TYPE_BUCKET[n.type] === activeTab);
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(n =>
        n.message?.toLowerCase().includes(q) ||
        n.senderName?.toLowerCase().includes(q) ||
        n.type?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [notifications, dismissed, activeTab, searchText]);

  const tabUnread = useCallback((tab: FilterTab) => {
    if (tab === 'all') return unreadCount;
    if (tab === 'unread') return unreadCount;
    return notifications.filter(n => !n.read && !dismissed.has(n.id) && TYPE_BUCKET[n.type] === tab).length;
  }, [notifications, dismissed, unreadCount]);

  const body = (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>

      {/* Header */}
      <View style={{
        backgroundColor: COLORS.primaryRed,
        paddingTop: isDesktop ? SPACING.md : 54,
        paddingBottom: SPACING.md,
        paddingHorizontal: SPACING.lg,
        ...SHADOW.header,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            {!isDesktop && (
              <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
                <Ionicons name="arrow-back" size={22} color={COLORS.white} />
              </TouchableOpacity>
            )}
            <View>
              <Text style={{ color: COLORS.white, fontSize: FONT_SIZE.header, fontWeight: FONT_WEIGHT.bold }}>
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: FONT_SIZE.caption }}>
                  {unreadCount} unread
                </Text>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={markAllRead}
                style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: 8 }}>
                <Text style={{ color: COLORS.white, fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.bold }}>
                  Mark all read
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              hitSlop={8}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="settings-outline" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
          backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: RADIUS.pill,
          paddingHorizontal: SPACING.md, height: 40, marginTop: SPACING.md,
        }}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search notifications..."
            placeholderTextColor="rgba(255,255,255,0.55)"
            style={{ flex: 1, fontSize: FONT_SIZE.body, color: COLORS.white }}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={15} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={{ backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm }}>
          {FILTER_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const count = tabUnread(tab.key);
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 5,
                  paddingHorizontal: SPACING.md, paddingVertical: 8,
                  borderRadius: RADIUS.pill,
                  backgroundColor: isActive ? COLORS.primaryRed : COLORS.background,
                  minHeight: 36,
                }}>
                <Text style={{
                  fontSize: FONT_SIZE.caption + 1,
                  fontWeight: isActive ? FONT_WEIGHT.bold : FONT_WEIGHT.medium,
                  color: isActive ? COLORS.white : COLORS.textLight,
                }}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : COLORS.primaryRed,
                    borderRadius: 8, minWidth: 16, height: 16,
                    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
                  }}>
                    <Text style={{ color: COLORS.white, fontSize: 9, fontWeight: FONT_WEIGHT.bold }}>
                      {count > 99 ? '99+' : count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification list */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item, index }) => (
          <NotificationCard
            item={item}
            onPress={() => handlePress(item)}
            onDismiss={() => dismiss(item.id)}
            index={index}
          />
        )}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: isDesktop ? SPACING.lg : 90 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, paddingHorizontal: 40 }}>
            <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="notifications-off-outline" size={44} color={COLORS.border} />
            </View>
            <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, textAlign: 'center' }}>
              {searchText ? `No results for "${searchText}"` : 'All caught up!'}
            </Text>
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textLight, textAlign: 'center', lineHeight: 22 }}>
              {searchText
                ? 'Try a different search term'
                : 'Join groups, post in the marketplace, and attend campus events to get notifications.'}
            </Text>
            {!searchText && (
              <View style={{ gap: SPACING.sm, width: '100%', marginTop: SPACING.sm }}>
                {[
                  { icon: 'people-outline' as const,    label: 'Join a group',          onPress: () => router.push('/(tabs)/groups') },
                  { icon: 'storefront-outline' as const, label: 'Browse marketplace',   onPress: () => router.push('/(tabs)/marketplace') },
                  { icon: 'videocam-outline' as const,  label: 'Watch videos',          onPress: () => router.push('/(tabs)/videos') },
                ].map(action => (
                  <TouchableOpacity
                    key={action.label}
                    onPress={action.onPress}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
                      backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md,
                      ...SHADOW.card,
                    }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={action.icon} size={18} color={COLORS.primaryRed} />
                    </View>
                    <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textDark, fontWeight: FONT_WEIGHT.medium }}>
                      {action.label}
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        }
      />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, flexDirection: 'row' }}>
      {isDesktop && <Sidebar />}
      {body}
      {!isDesktop && <Sidebar />}
    </SafeAreaView>
  );
}