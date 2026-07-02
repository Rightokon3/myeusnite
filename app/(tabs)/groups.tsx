
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  SafeAreaView, ScrollView, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, doc, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import Sidebar from '../../components/Sidebar';
import GroupCard from '../../components/groups/GroupCard';
import CreateGroupModal from '../../components/groups/CreateGroupModal';
import FadeInView from '../../components/FadeInView';
import { Group } from '../../hooks/useGroup';
import {
  COLORS, FONT_SIZE, FONT_WEIGHT, SPACING, RADIUS, SHADOW, DESKTOP_BREAKPOINT,
} from '../../constants/theme';

type HomeTab = 'discover' | 'myGroups';

export default function GroupsScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<HomeTab>('discover');
  const [searchText, setSearchText] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'groups'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap =>
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)))
    );
  }, []);

  const toggleJoin = useCallback(async (group: Group) => {
    if (!user) return;
    const isMember = group.members?.includes(user.uid);
    await updateDoc(doc(db, 'groups', group.id), {
      members: isMember ? arrayRemove(user.uid) : arrayUnion(user.uid),
      memberCount: Math.max(0, (group.memberCount || 0) + (isMember ? -1 : 1)),
    });
  }, [user]);

  const isMember = useCallback((g: Group) => g.members?.includes(user?.uid || '') ?? false, [user]);

  const myGroups = useMemo(() => groups.filter(g => isMember(g)), [groups, isMember]);

  const filtered = useMemo(() => {
    const source = activeTab === 'myGroups' ? myGroups : groups;
    if (!searchText.trim()) return source;
    const q = searchText.toLowerCase();
    return source.filter(g =>
      g.name?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      g.category?.toLowerCase().includes(q) ||
      g.department?.toLowerCase().includes(q)
    );
  }, [groups, myGroups, activeTab, searchText]);

  // For desktop: split into columns by category
  const popularGroups = useMemo(() =>
    [...groups].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0)).slice(0, 6),
    [groups]
  );

  const cardWidth = isDesktop ? 280 : (width - SPACING.md * 3) / 2;

  const Header = () => (
    <View style={{ backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
      {/* Top bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingTop: isDesktop ? SPACING.md : 50,
        paddingBottom: SPACING.sm,
      }}>
        <Text style={{ fontSize: FONT_SIZE.header, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark }}>Groups</Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primaryRed, paddingHorizontal: SPACING.md, paddingVertical: 9, borderRadius: RADIUS.pill }}>
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.caption + 1 }}>Create</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.background, borderRadius: RADIUS.pill,
        paddingHorizontal: SPACING.md, height: 44, marginHorizontal: SPACING.md, marginBottom: SPACING.sm,
      }}>
        <Ionicons name="search-outline" size={18} color={COLORS.textLight} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search groups, departments, categories..."
          placeholderTextColor={COLORS.textLight}
          style={{ flex: 1, fontSize: FONT_SIZE.body, color: COLORS.textDark }}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* My Groups / Discover tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm }}>
        {([['discover', 'Discover'], ['myGroups', 'My Groups']] as [HomeTab, string][]).map(([tab, label]) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{
              paddingHorizontal: SPACING.lg, paddingVertical: 9, borderRadius: RADIUS.pill,
              backgroundColor: activeTab === tab ? COLORS.primaryRed : COLORS.background,
            }}>
            <Text style={{
              fontSize: FONT_SIZE.caption + 1, fontWeight: FONT_WEIGHT.bold,
              color: activeTab === tab ? COLORS.white : COLORS.textLight,
            }}>
              {label}{tab === 'myGroups' && myGroups.length > 0 ? ` (${myGroups.length})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, flexDirection: 'row' }}>
      {isDesktop && <Sidebar />}

      <FlatList
        data={filtered}
        key={`${activeTab}-${isDesktop ? 'desktop' : 'mobile'}`}
        keyExtractor={g => g.id}
        numColumns={isDesktop ? 3 : 1}
        columnWrapperStyle={isDesktop ? { gap: SPACING.md, paddingHorizontal: SPACING.md } : undefined}
        contentContainerStyle={{
          gap: isDesktop ? SPACING.md : 0,
          paddingBottom: isDesktop ? SPACING.lg : 90,
          paddingVertical: isDesktop ? SPACING.md : 0,
        }}
        ListHeaderComponent={
          <>
            <Header />
            {/* Popular groups strip — only on discover tab without search */}
            {activeTab === 'discover' && !searchText && popularGroups.length > 0 && (
              <View style={{ paddingVertical: SPACING.md }}>
                <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, paddingHorizontal: SPACING.md, marginBottom: SPACING.sm }}>
                  Popular Groups
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.md }}>
                  {popularGroups.map(g => (
                    <FadeInView key={g.id} style={{ width: 200 }}>
                      <GroupCard
                        group={g}
                        isMember={isMember(g)}
                        onPress={() => router.push({ pathname: '/groups/[id]', params: { id: g.id } })}
                        onJoin={() => toggleJoin(g)}
                        layout="card"
                      />
                    </FadeInView>
                  ))}
                </ScrollView>
              </View>
            )}
            {filtered.length > 0 && (
              <Text style={{ fontSize: FONT_SIZE.sectionTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm }}>
                {activeTab === 'myGroups' ? 'My Groups' : searchText ? 'Search Results' : 'All Groups'}
              </Text>
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <FadeInView delay={Math.min(index, 8) * 35} style={isDesktop ? { flex: 1 } : { paddingHorizontal: SPACING.md, marginBottom: SPACING.sm }}>
            <GroupCard
              group={item}
              isMember={isMember(item)}
              onPress={() => router.push({ pathname: '/groups/[id]', params: { id: item.id } })}
              onJoin={() => toggleJoin(item)}
              layout={isDesktop ? 'card' : 'row'}
            />
          </FadeInView>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60, gap: SPACING.md, paddingHorizontal: 40 }}>
            <Ionicons name="people-outline" size={56} color={COLORS.border} />
            <Text style={{ fontSize: FONT_SIZE.cardTitle, fontWeight: FONT_WEIGHT.bold, color: COLORS.textDark, textAlign: 'center' }}>
              {activeTab === 'myGroups' ? "You haven't joined any groups yet" : 'No groups found'}
            </Text>
            <Text style={{ fontSize: FONT_SIZE.body, color: COLORS.textLight, textAlign: 'center' }}>
              {activeTab === 'myGroups' ? 'Discover and join groups to see them here' : 'Create the first group for your campus!'}
            </Text>
            <TouchableOpacity
              onPress={() => activeTab === 'myGroups' ? setActiveTab('discover') : setShowCreate(true)}
              style={{ backgroundColor: COLORS.primaryRed, borderRadius: RADIUS.pill, paddingHorizontal: SPACING.xl, paddingVertical: 12 }}>
              <Text style={{ color: COLORS.white, fontWeight: FONT_WEIGHT.bold }}>
                {activeTab === 'myGroups' ? 'Browse Groups' : 'Create Group'}
              </Text>
            </TouchableOpacity>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {!isDesktop && <Sidebar />}

      <CreateGroupModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={id => router.push({ pathname: '/groups/[id]', params: { id } })}
      />
    </SafeAreaView>
  );
}