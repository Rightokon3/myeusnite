// app/(auth)/register.tsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

const DEPARTMENTS = [
  'Computer Science', 'Engineering', 'Medicine', 'Law',
  'Business', 'Education', 'Sciences', 'Arts & Humanities',
];

export default function RegisterScreen() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirm: '', department: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    if (!form.fullName || !form.email || !form.password || !form.department)
      return Alert.alert('Missing Fields', 'Please fill in all required fields');
    if (form.password !== form.confirm) return Alert.alert('Error', 'Passwords do not match');
    if (form.password.length < 6) return Alert.alert('Weak Password', 'Minimum 6 characters');
    setLoading(true);
    try {
      await register(form.email.trim().toLowerCase(), form.password, form.fullName.trim(), form.department);
    } catch (e: any) {
      Alert.alert('Error', e.code === 'auth/email-already-in-use' ? 'Email already registered' : e.message);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View className="bg-[#C0392B] pt-14 pb-8 px-6 items-center">
            <View className="w-16 h-16 rounded-full bg-white/20 items-center justify-center mb-3 border-4 border-white/30">
              <Ionicons name="shield-checkmark" size={32} color="white" />
            </View>
            <Text className="text-white text-2xl font-black tracking-wider">MyEusnite</Text>
            <Text className="text-white/80 text-xs mt-1">Create your campus account</Text>
          </View>

          <View className="px-6 pt-6 pb-10">
            <Text className="text-xl font-black text-gray-900 mb-1">Join the Community</Text>
            <Text className="text-gray-400 text-sm mb-6">Fill in your details below</Text>

            {[
              { key: 'fullName', label: 'Full Name', placeholder: 'e.g. Ejike Emmanuel', icon: 'person-outline', caps: 'words' as const },
              { key: 'email', label: 'Email Address', placeholder: 'you@esut.edu.ng', icon: 'mail-outline', keyboard: 'email-address' as const, caps: 'none' as const },
              { key: 'password', label: 'Password', placeholder: 'Min 6 characters', icon: 'lock-closed-outline', secure: true, caps: 'none' as const },
              { key: 'confirm', label: 'Confirm Password', placeholder: 'Repeat password', icon: 'lock-closed-outline', secure: true, caps: 'none' as const },
            ].map(f => (
              <View key={f.key}>
                <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">{f.label}</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 mb-4">
                  <Ionicons name={f.icon as any} size={18} color="#aaa" />
                  <TextInput
                    className="flex-1 py-4 px-3 text-sm text-gray-800"
                    placeholder={f.placeholder} placeholderTextColor="#bbb"
                    value={form[f.key as keyof typeof form]}
                    onChangeText={v => set(f.key, v)}
                    secureTextEntry={f.secure}
                    keyboardType={f.keyboard || 'default'}
                    autoCapitalize={f.caps || 'sentences'}
                  />
                </View>
              </View>
            ))}

            <Text className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Department</Text>
            <View className="flex-row flex-wrap gap-2 mb-8">
              {DEPARTMENTS.map(d => (
                <TouchableOpacity
                  key={d}
                  className={`px-4 py-2 rounded-full border-2 ${form.department === d ? 'bg-[#C0392B] border-[#C0392B]' : 'bg-white border-gray-200'}`}
                  onPress={() => set('department', d)}>
                  <Text className={`text-xs font-bold ${form.department === d ? 'text-white' : 'text-gray-500'}`}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              className="bg-[#C0392B] rounded-xl py-4 items-center mb-4"
              style={{ elevation: 4, shadowColor: '#C0392B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 }}
              onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base tracking-widest">CREATE ACCOUNT</Text>}
            </TouchableOpacity>

            <TouchableOpacity className="flex-row justify-center" onPress={() => router.back()}>
              <Text className="text-gray-500 text-sm">Already have an account? </Text>
              <Text className="text-[#C0392B] font-black text-sm">Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}