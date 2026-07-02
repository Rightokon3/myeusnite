// app/search.tsx
import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  SafeAreaView, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection, query, where, orderBy,
  getDocs, limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';

type ResultType = 'user' | 'group' | 'post';
interface Result { id: string; type: ResultType; title: string; subtitle?: string; photo?: string; }

export default function SearchScreen() {
  const router = useRouter();
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | ResultType>('all');

  useEffect(() => {
    if (!searchText.trim() || searchText.trim().length < 2) { setResults([]); return; }
    const timeout = setTimeout(() => doSearch(searchText.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchText]);

  const doSearch = async (text: string) => {
    setLoading(true);
    const lower = text.toLowerCase();
    const all: Result[] = [];
    try {
      // Search users
      const uSnap = await getDocs(query(collection(db, 'users'), limit(20)));
      uSnap.docs.forEach(d => {
        const u = d.data();
        if ((u.fullName || '').toLowerCase().includes(lower) || (u.department || '').toLowerCase().includes(lower)) {
          all.push({ id: d.id, type: 'user', title: u.fullName, subtitle: u.department, photo: u.photoURL });
        }
      });
      // Search groups
      const gSnap = await getDocs(query(collection(db, 'groups'), limit(20)));
      gSnap.docs.forEach(d => {
        const g = d.data();
        if ((g.name || '').toLowerCase().includes(lower)) {
          all.push({ id: d.id, type: 'group', title: g.name, subtitle: `${g.memberCount || 0} members` });
        }
      });
      // Search posts
      const pSnap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(30)));
      pSnap.docs.forEach(d => {
        const p = d.data();
        if ((p.text || '').toLowerCase().includes(lower)) {
          all.push({ id: d.id, type: 'post', title: p.text?.slice(0, 80), subtitle: `by ${p.authorName}` });
        }
      });
      setResults(all);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = activeFilter === 'all' ? results : results.filter(r => r.type === activeFilter);

  const handlePress = (item: Result) => {
    if (item.type === 'group') {
      router.push({ pathname: '/chat', params: { roomId: item.id, roomName: item.title } });
    } else if (item.type === 'user') {
      // Navigate to that user's profile (future feature)
    }
  };

  const typeIcon = (type: ResultType) => {
    if (type === 'user') return 'person-circle-outline';
    if (type === 'group') return 'people-outline';
    return 'document-text-outline';
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="bg-[#C0392B] pt-12 pb-4 px-4">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1 bg-white rounded-2xl flex-row items-center px-4 py-3 gap-2">
            <Ionicons name="search-outline" size={16} color="#aaa" />
            <TextInput
              className="flex-1 text-sm text-gray-800"
              placeholder="Search accounts, groups, posts..."
              placeholderTextColor="#bbb"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={16} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter chips */}
        <View className="flex-row gap-2 mt-3">
          {(['all', 'user', 'group', 'post'] as const).map(f => (
            <TouchableOpacity
              key={f}
              className={`px-4 py-1.5 rounded-full ${activeFilter === f ? 'bg-white' : 'bg-white/20'}`}
              onPress={() => setActiveFilter(f)}>
              <Text className={`text-xs font-bold capitalize ${activeFilter === f ? 'text-[#C0392B]' : 'text-white'}`}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && (
        <View className="py-8 items-center">
          <ActivityIndicator color="#C0392B" />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={i => `${i.type}-${i.id}`}
        contentContainerStyle={{ padding: 12, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="bg-white rounded-2xl p-4 flex-row items-center gap-3"
            style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 }}
            onPress={() => handlePress(item)}>
            {item.photo ? (
              <Image source={{ uri: item.photo }} className="w-11 h-11 rounded-full" />
            ) : (
              <View className="w-11 h-11 rounded-full bg-[#C0392B]/10 items-center justify-center">
                <Ionicons name={typeIcon(item.type) as any} size={22} color="#C0392B" />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-gray-900 font-bold text-sm" numberOfLines={2}>{item.title}</Text>
              {item.subtitle && <Text className="text-gray-400 text-xs mt-0.5">{item.subtitle}</Text>}
            </View>
            <View className={`px-2 py-0.5 rounded-full ${item.type === 'user' ? 'bg-blue-100' : item.type === 'group' ? 'bg-green-100' : 'bg-orange-100'}`}>
              <Text className={`text-[10px] font-bold capitalize ${item.type === 'user' ? 'text-blue-600' : item.type === 'group' ? 'text-green-600' : 'text-orange-600'}`}>{item.type}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center pt-16 gap-3">
              <Ionicons name="search-outline" size={52} color="#ddd" />
              <Text className="text-gray-300 text-base">
                {searchText.length < 2 ? 'Type to search...' : 'No results found'}
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}