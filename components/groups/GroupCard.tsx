
import { memo } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedPressable from '../AnimatedPressable';
import { Group } from '../../hooks/useGroup';
import { COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW } from '../../constants/theme';

interface Props {
  group: Group;
  isMember: boolean;
  onPress: () => void;
  onJoin: () => void;
  layout?: 'card' | 'row';
}

const CATEGORY_COLORS: Record<string, string> = {
  Department: '#2563EB', Faculty: '#7C3AED', Course: '#059669',
  Study: '#D97706', Project: '#DC2626', Sports: '#EA580C',
  Religious: '#0891B2', Club: '#DB2777', Marketplace: '#65A30D',
  Community: COLORS.primaryRed,
};

function GroupCard({ group, isMember, onPress, onJoin, layout = 'card' }: Props) {
  const catColor = CATEGORY_COLORS[group.category] || COLORS.primaryRed;

  if (layout === 'row') {
    return (
      <AnimatedPressable onPress={onPress} scaleTo={0.98} style={{
        flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
        backgroundColor: COLORS.white, borderRadius: RADIUS.md,
        padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card,
      }}>
        {/* Avatar */}
        {group.avatar ? (
          <Image source={{ uri: group.avatar }} style={{ width: 52, height: 52, borderRadius: 14 }} />
        ) : (
          <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: catColor + '22', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="people" size={24} color={catColor} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
            <Text style={{ fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, flex: 1 }} numberOfLines={1}>
              {group.name}
            </Text>
            {group.privacy === 'private' && (
              <Ionicons name="lock-closed" size={12} color={COLORS.textLight} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 2 }}>
            <View style={{ backgroundColor: catColor + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.pill }}>
              <Text style={{ fontSize: 10, color: catColor, fontWeight: FONT_WEIGHT.bold }}>{group.category}</Text>
            </View>
            <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>
              {group.memberCount || 0} members
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onJoin}
          style={{
            paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill,
            backgroundColor: isMember ? COLORS.background : COLORS.primaryRed,
            borderWidth: isMember ? 1 : 0, borderColor: COLORS.border,
          }}>
          <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.bold, color: isMember ? COLORS.textDark : COLORS.white }}>
            {isMember ? 'Joined' : 'Join'}
          </Text>
        </TouchableOpacity>
      </AnimatedPressable>
    );
  }

  // Card layout (grid)
  return (
    <AnimatedPressable onPress={onPress} scaleTo={0.97} style={{ backgroundColor: COLORS.white, borderRadius: RADIUS.md, overflow: 'hidden', ...SHADOW.card }}>
      {/* Cover */}
      <View style={{ height: 90, backgroundColor: catColor + '22' }}>
        {group.coverPhoto ? (
          <Image source={{ uri: group.coverPhoto }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="people" size={36} color={catColor + '88'} />
          </View>
        )}
        {/* Privacy badge */}
        <View style={{
          position: 'absolute', top: 8, right: 8,
          backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: RADIUS.pill,
          paddingHorizontal: 8, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 3,
        }}>
          <Ionicons name={group.privacy === 'private' ? 'lock-closed' : 'globe-outline'} size={10} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontSize: 9, fontWeight: FONT_WEIGHT.bold, textTransform: 'uppercase' }}>
            {group.privacy}
          </Text>
        </View>
      </View>

      {/* Avatar overlapping cover */}
      <View style={{ paddingHorizontal: SPACING.md, paddingBottom: SPACING.md, marginTop: -18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: SPACING.sm }}>
          {group.avatar ? (
            <Image source={{ uri: group.avatar }} style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 3, borderColor: COLORS.white }} />
          ) : (
            <View style={{ width: 44, height: 44, borderRadius: 12, borderWidth: 3, borderColor: COLORS.white, backgroundColor: catColor, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: 16 }}>{(group.name || 'G')[0]}</Text>
            </View>
          )}
          <TouchableOpacity
            onPress={onJoin}
            style={{
              paddingHorizontal: SPACING.md, paddingVertical: 7, borderRadius: RADIUS.pill,
              backgroundColor: isMember ? COLORS.background : COLORS.primaryRed,
              borderWidth: isMember ? 1 : 0, borderColor: COLORS.border,
            }}>
            <Text style={{ fontSize: FONT_SIZE.caption, fontWeight: FONT_WEIGHT.bold, color: isMember ? COLORS.textDark : COLORS.white }}>
              {isMember ? '✓ Joined' : '+ Join'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: FONT_SIZE.body, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }} numberOfLines={1}>{group.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: 3 }}>
          <View style={{ backgroundColor: catColor + '18', paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.pill }}>
            <Text style={{ fontSize: 10, color: catColor, fontWeight: FONT_WEIGHT.bold }}>{group.category}</Text>
          </View>
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight }}>
            {group.memberCount || 0} members
          </Text>
        </View>
        {!!group.description && (
          <Text style={{ fontSize: FONT_SIZE.caption, color: COLORS.textLight, marginTop: 4 }} numberOfLines={2}>{group.description}</Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

export default memo(GroupCard, (prev, next) =>
  prev.group.id === next.group.id &&
  prev.group.memberCount === next.group.memberCount &&
  prev.isMember === next.isMember
);