// app/customer-care.tsx
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BRAND, CARD } from '../../constants/Colors';

// ⚠️ Replace this with the Firebase UID of your support team account
const SUPPORT_UID = 'SUPPORT_TEAM_UID_HERE';

const FAQ = [
  'How do I pay school fees?',
  'How do I reset my password?',
  'How to join or create a group?',
  'How do I list an item on marketplace?',
  'How to post a video reel?',
  'I found a bug — how do I report it?',
];

export default function CustomerCareScreen() {
  const router = useRouter();

  const openSupportChat = (preText?: string) => {
    router.push({
      pathname: '/chat',
      params: {
        recipientId: SUPPORT_UID,
        recipientName: 'ESUT Support Team',
      },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f4f4' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Customer Care</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {/* Hero card */}
        <View style={s.heroCard}>
          <View style={s.supportIcon}>
            <Ionicons name="headset" size={44} color={BRAND} />
          </View>
          <Text style={s.heroTitle}>ESUT Support Team</Text>
          <Text style={s.heroDesc}>
            Our support team is available Monday–Friday, 8am–6pm WAT. We're happy to help with any issue you're experiencing on MyEusnite.
          </Text>
          <View style={s.statusRow}>
            <View style={s.statusDot} />
            <Text style={s.statusTxt}>Support agents online</Text>
          </View>
          <TouchableOpacity style={s.chatBtn} onPress={() => openSupportChat()}>
            <Ionicons name="chatbubble" size={20} color="#fff" />
            <Text style={s.chatBtnTxt}>Start Live Chat</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ */}
        <View style={s.faqCard}>
          <Text style={s.faqTitle}>Frequently Asked Questions</Text>
          <Text style={s.faqSub}>Tap a question to chat with support about it</Text>
          {FAQ.map((q, i) => (
            <TouchableOpacity
              key={q}
              style={[s.faqRow, i < FAQ.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' }]}
              onPress={() => openSupportChat(q)}>
              <Ionicons name="help-circle-outline" size={20} color={BRAND} />
              <Text style={s.faqTxt}>{q}</Text>
              <Ionicons name="chevron-forward" size={14} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: BRAND, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 14, paddingTop: 50,
  },
  headerTitle: { color: '#fff', fontWeight: '800', fontSize: 20 },
  heroCard: {
    backgroundColor: CARD, borderRadius: 18, padding: 24,
    alignItems: 'center', gap: 10, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  supportIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontWeight: '800', fontSize: 20, color: '#1a1a1a' },
  heroDesc: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22C55E' },
  statusTxt: { fontSize: 13, color: '#22C55E', fontWeight: '700' },
  chatBtn: {
    backgroundColor: BRAND, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 4,
    shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  chatBtnTxt: { color: '#fff', fontWeight: '800', fontSize: 16 },
  faqCard: {
    backgroundColor: CARD, borderRadius: 18, padding: 18, elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
  },
  faqTitle: { fontWeight: '800', fontSize: 16, color: '#1a1a1a', marginBottom: 2 },
  faqSub: { fontSize: 12, color: '#aaa', marginBottom: 14 },
  faqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  faqTxt: { flex: 1, fontSize: 14, color: '#333' },
});
