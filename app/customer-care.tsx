// app/customer-care.tsx
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Sidebar from '../components/Sidebar';

const SUPPORT_UID = 'SUPPORT_TEAM_UID_HERE'; // Replace with real support UID
const FAQ = ['How do I pay school fees?', 'How to reset my password?', 'How to join or create a group?', 'How to list on marketplace?', 'How to post a video reel?', 'I found a bug — how to report?'];

export default function CustomerCareScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <SafeAreaView className="flex-1 bg-gray-100" style={{ flexDirection: 'row' }}>
      {isDesktop && <Sidebar />}
      <View className="flex-1">
        <View className="bg-[#C0392B] flex-row items-center px-4 py-3 gap-3" style={{ paddingTop: isDesktop ? 16 : 48 }}>
          {!isDesktop && <TouchableOpacity onPress={() => router.back()} className="p-1"><Ionicons name="arrow-back" size={22} color="white" /></TouchableOpacity>}
          <Text className="text-white font-black text-xl flex-1">Customer Care</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          <View className="bg-white rounded-2xl p-6 items-center gap-3" style={{ elevation: 2 }}>
            <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center">
              <Ionicons name="headset" size={44} color="#C0392B" />
            </View>
            <Text className="font-black text-xl text-gray-900">ESUT Support Team</Text>
            <Text className="text-gray-400 text-sm text-center leading-5">Available Mon–Fri, 8am–6pm WAT. We're happy to help!</Text>
            <View className="flex-row items-center gap-2">
              <View className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <Text className="text-green-500 font-bold text-sm">Support agents online</Text>
            </View>
            <TouchableOpacity
              className="bg-[#C0392B] flex-row items-center gap-2 px-8 py-4 rounded-2xl mt-2"
              style={{ elevation: 4 }}
              onPress={() => router.push({ pathname: '/chat', params: { recipientId: SUPPORT_UID, recipientName: 'ESUT Support Team' } })}>
              <Ionicons name="chatbubble" size={20} color="white" />
              <Text className="text-white font-black text-base">Start Live Chat</Text>
            </TouchableOpacity>
          </View>
          <View className="bg-white rounded-2xl p-4" style={{ elevation: 1 }}>
            <Text className="font-black text-base text-gray-900 mb-1">Frequently Asked Questions</Text>
            <Text className="text-gray-400 text-xs mb-4">Tap to chat with support about it</Text>
            {FAQ.map((q, i) => (
              <TouchableOpacity key={q} className={`flex-row items-center py-3 gap-3 ${i < FAQ.length - 1 ? 'border-b border-gray-100' : ''}`}
                onPress={() => router.push({ pathname: '/chat', params: { recipientId: SUPPORT_UID, recipientName: 'ESUT Support Team' } })}>
                <Ionicons name="help-circle-outline" size={20} color="#C0392B" />
                <Text className="flex-1 text-sm text-gray-600">{q}</Text>
                <Ionicons name="chevron-forward" size={14} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}