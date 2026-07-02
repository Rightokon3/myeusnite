// app/(tabs)/settings.tsx
import {
  View, Text, TouchableOpacity, SafeAreaView,
  Alert, ScrollView, Image, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import Sidebar from '../components/Sidebar';

export default function SettingsScreen() {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const rows = [
    { icon: 'person-outline', label: 'Edit Profile', sub: 'Update your name, bio, photo', action: () => router.push('/(tabs)/profile') },
    { icon: 'notifications-outline', label: 'Notifications', sub: 'Manage your alerts', action: () => router.push('/notifications') },
    { icon: 'lock-closed-outline', label: 'Privacy & Security', sub: 'Control your data', action: () => {} },
    { icon: 'headset-outline', label: 'Customer Support', sub: 'Get help from the team', action: () => router.push('/customer-care') },
    { icon: 'information-circle-outline', label: 'About MyEusnite', sub: 'Version 1.0.0', action: () => {} },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-100" style={{ flexDirection: 'row' }}>
      <Sidebar />
      <View className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile header */}
          <View
            className="bg-[#C0392B] items-center pb-8 px-6"
            style={{ paddingTop: isDesktop ? 24 : 56 }}>
            <TouchableOpacity
              className="relative mb-3"
              onPress={() => router.push('/(tabs)/profile')}>
              {profile?.photoURL ? (
                <Image
                  source={{ uri: profile.photoURL }}
                  className="w-20 h-20 rounded-full border-4 border-white/40"
                />
              ) : (
                <View className="w-20 h-20 rounded-full bg-white/25 items-center justify-center border-4 border-white/40">
                  <Text className="text-white font-black text-3xl">
                    {(profile?.fullName || 'U')[0]}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-white rounded-full w-7 h-7 items-center justify-center"
                style={{ elevation: 2 }}>
                <Ionicons name="camera" size={14} color="#C0392B" />
              </View>
            </TouchableOpacity>

            <Text className="text-white font-black text-xl">{profile?.fullName}</Text>
            <Text className="text-white/75 text-sm mt-0.5">{profile?.department}</Text>
            <Text className="text-white/60 text-xs mt-0.5">{user?.email}</Text>

            {profile?.isPremium && (
              <View className="bg-yellow-400 rounded-full px-3 py-1 mt-2 flex-row items-center gap-1">
                <Ionicons name="star" size={11} color="white" />
                <Text className="text-white text-xs font-black">Premium Member</Text>
              </View>
            )}
          </View>

          {/* Menu */}
          <View
            className="bg-white mx-4 mt-4 rounded-2xl overflow-hidden"
            style={{ elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}>
            {rows.map((row, i) => (
              <TouchableOpacity
                key={row.label}
                className={`flex-row items-center px-4 py-4 gap-3 ${i < rows.length - 1 ? 'border-b border-gray-100' : ''}`}
                onPress={row.action}>
                <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
                  <Ionicons name={row.icon as any} size={20} color="#C0392B" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-bold text-sm">{row.label}</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">{row.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#ddd" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout */}
          <TouchableOpacity
            className="bg-white mx-4 mt-3 rounded-2xl px-4 py-4 flex-row items-center gap-3 border border-red-100"
            style={{ elevation: 1 }}
            onPress={handleLogout}>
            <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
              <Ionicons name="log-out-outline" size={20} color="#C0392B" />
            </View>
            <Text className="text-[#C0392B] font-black text-sm flex-1">Sign Out</Text>
            <Ionicons name="chevron-forward" size={16} color="#ddd" />
          </TouchableOpacity>

          <Text className="text-center text-gray-300 text-xs my-6">
            MyEusnite v1.0.0 • ESUT Campus App
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}