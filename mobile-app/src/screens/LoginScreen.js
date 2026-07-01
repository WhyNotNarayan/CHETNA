import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { Phone, Lock, LogIn } from 'lucide-react-native';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('Error', 'Please enter both mobile number and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { phone, password });
      
      if (response.data.success) {
        await login(response.data.token, response.data.user);
      }
    } catch (error) {
      console.error('Login Error:', error);
      let msg = 'Login failed.';

      if (error.response) {
        msg = error.response.data.message || msg;
      } else if (error.request) {
        msg = 'Network Error: Cannot connect to server. Ensure phone and laptop are on same Wi-Fi (IP: 192.168.1.103)';
      } else {
        msg = error.message;
      }
      
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#fff', '#fee0f4', '#fce3eb']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your Chetna account</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mobile Number</Text>
            <View style={styles.inputWrapper}>
              <Phone size={18} color="#d63384" />
              <TextInput
                style={styles.input}
                placeholder="10-digit number"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color="#d63384" />
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.primaryButton, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <LinearGradient 
              colors={['#f92b7c', '#791880']} 
              start={{x: 0, y: 0}} end={{x: 1, y: 0}}
              style={styles.gradientButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Log In</Text>
                  <LogIn size={20} color="#fff" style={{ marginLeft: 10 }} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomTextContainer}>
            <Text style={styles.bottomText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.adminLink}
            onPress={() => navigation.navigate('AdminLogin')}
          >
            <Text style={styles.adminText}>Admin Access</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, padding: 30, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#d63384', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 40, fontWeight: '500' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '800', color: '#4B0082', marginBottom: 8, letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#fce3eb', paddingHorizontal: 15 },
  input: { flex: 1, height: 55, color: '#333', fontSize: 16, marginLeft: 10 },
  primaryButton: { height: 55, borderRadius: 15, marginTop: 10, overflow: 'hidden' },
  gradientButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  bottomTextContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  bottomText: { color: '#666', fontSize: 14 },
  linkText: { color: '#d63384', fontSize: 14, fontWeight: 'bold' },
  adminLink: { marginTop: 30, alignSelf: 'center' },
  adminText: { color: '#999', fontSize: 12, fontWeight: 'bold', textDecorationLine: 'underline' }
});
