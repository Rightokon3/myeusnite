// app/(tabs)/settings.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BRAND, CARD, GOLD, TEXT, TEXT_MUTED } from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';

export default function SettingsScreen() {
  const { user, profile, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const rows = [
    { icon: 'person-outline', label: 'Edit Profile', sub: 'Update your info', action: () => {} },
    { icon: 'notifications-outline', label: 'Notifications', sub: 'Manage alerts', action: () => router.push('/notifications') },
    { icon: 'lock-closed-outline', label: 'Privacy & Security', sub: 'Control your data', action: () => {} },
    { icon: 'headset-outline', label: 'Customer Support', sub: 'Get help from the team', action: () => router.push('/customer-care') },
    { icon: 'information-circle-outline', label: 'About MyEusnite', sub: 'App version & info', action: () => {} },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f4f4f4' }}>
      <ScrollView>
        {/* Profile Header */}
        <View style={s.header}>
          <View style={s.avatarLarge}>
            <Text style={s.avatarTxt}>{(profile?.fullName || 'U')[0]}</Text>
          </View>
          <Text style={s.name}>{profile?.fullName}</Text>
          <Text style={s.dept}>{profile?.department}</Text>
          <Text style={s.email}>{user?.email}</Text>
          {profile?.isPremium && (
            <View style={s.premiumBadge}>
              <Ionicons name="star" size={12} color="#fff" />
              <Text style={s.premiumTxt}>Premium Member</Text>
            </View>
          )}
        </View>

        {/* Menu rows */}
        <View style={s.section}>
          {rows.map((row, i) => (
            <TouchableOpacity
              key={row.label}
              style={[s.row, i < rows.length - 1 && s.rowBorder]}
              onPress={row.action}>
              <View style={s.rowIcon}>
                <Ionicons name={row.icon as any} size={20} color={BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{row.label}</Text>
                <Text style={s.rowSub}>{row.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={BRAND} />
          <Text style={s.logoutTxt}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={s.version}>MyEusnite v1.0.0 • ESUT Campus App</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: BRAND, alignItems: 'center',
    paddingTop: 48, paddingBottom: 36, paddingHorizontal: 20,
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarTxt: { color: '#fff', fontWeight: '800', fontSize: 32 },
  name: { color: '#fff', fontWeight: '800', fontSize: 20 },
  dept: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  email: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: GOLD, paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 14, marginTop: 10,
  },
  premiumTxt: { color: '#fff', fontWeight: '700', fontSize: 12 },
  section: {
    backgroundColor: CARD, margin: 16, borderRadius: 16,
    overflow: 'hidden', elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  rowBorder: { borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  rowIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: TEXT },
  rowSub: { fontSize: 12, color: TEXT_MUTED, marginTop: 1 },
  logoutBtn: {
    backgroundColor: CARD, marginHorizontal: 16, borderRadius: 16,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: '#FADBD8', elevation: 1,
  },
  logoutTxt: { color: BRAND, fontWeight: '700', fontSize: 15 },
  version: { textAlign: 'center', color: '#bbb', fontSize: 12, marginVertical: 20 },
});
