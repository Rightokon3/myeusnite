
import { Tabs } from 'expo-router';
import { View, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../hooks/useNotifications';

function TabIcon({ name, color, size, badge }: { name: any; color: string; size: number; badge?: number }) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {!!badge && (
        <View className="absolute -top-1 -right-2 bg-yellow-400 rounded-full min-w-[15px] h-[15px] items-center justify-center px-0.5">
          <Text className="text-[#C0392B] text-[8px] font-black">{badge > 9 ? '9+' : badge}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { unreadCount } = useNotifications();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Desktop: hide bottom bar completely (sidebar is rendered inside screens)
        tabBarStyle: isDesktop
          ? { display: 'none' }
          : {
              backgroundColor: '#C0392B',
              borderTopWidth: 0,
              height: 65,
              paddingBottom: 10,
              paddingTop: 8,
            },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} size={24} badge={unreadCount} />
          ),
        }}
      />
      <Tabs.Screen
        name="videos"
        options={{
          title: 'Videos',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'play-circle' : 'play-circle-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'people' : 'people-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} size={24} />
          ),
        }}
      />
      {/* Hidden tabs — accessible via navigation */}
      <Tabs.Screen name="marketplace" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
    </Tabs>
  );
}