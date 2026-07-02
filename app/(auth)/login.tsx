
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) return Alert.alert('Error', 'Please fill in all fields');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.code === 'auth/invalid-credential' ? 'Invalid email or password' : e.message);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">

          {/* RED HEADER */}
          <View className="bg-[#C0392B] pt-16 pb-10 px-6 items-center">
            <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center mb-4 border-4 border-white/30">
              <Ionicons name="shield-checkmark" size={40} color="white" />
            </View>
            <Text className="text-white text-3xl font-black tracking-wider">MyEusnite</Text>
            <Text className="text-white/80 text-xs mt-1 text-center">
              Enugu State University of Science and Technology
            </Text>
          </View>

          <View className="flex-1 px-6 pt-8 pb-10">
            <Text className="text-2xl font-black text-gray-900 mb-1">Welcome Back!</Text>
            <Text className="text-gray-400 text-sm mb-8">Sign in to your campus account</Text>

            <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Email Address</Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 mb-5">
              <Ionicons name="mail-outline" size={18} color="#aaa" />
              <TextInput
                className="flex-1 py-4 px-3 text-sm text-gray-800"
                placeholder="you@esut.edu.ng"
                placeholderTextColor="#bbb"
                value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none"
              />
            </View>

            <Text className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Password</Text>
            <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-4 mb-8">
              <Ionicons name="lock-closed-outline" size={18} color="#aaa" />
              <TextInput
                className="flex-1 py-4 px-3 text-sm text-gray-800"
                placeholder="••••••••" placeholderTextColor="#bbb"
                value={password} onChangeText={setPassword}
                secureTextEntry={!showPw}
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color="#aaa" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="bg-[#C0392B] rounded-xl py-4 items-center mb-4"
              style={{ elevation: 4, shadowColor: '#C0392B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 }}
              onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-base tracking-widest">SIGN IN</Text>}
            </TouchableOpacity>

            <TouchableOpacity className="flex-row justify-center mt-2" onPress={() => router.push('/(auth)/register')}>
              <Text className="text-gray-500 text-sm">Don't have an account? </Text>
              <Text className="text-[#C0392B] font-black text-sm">Create Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}