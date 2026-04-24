import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image
} from 'react-native';
import { ShieldAlert, Lock, Mail, ChevronRight } from 'lucide-react-native';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminLoginScreen = ({ navigation }) => {
  const { login } = React.useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter your admin credentials');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/admin-login', { email, password });
      if (response.data.success) {
        // Use the centralized login function instead of manual navigation
        await login(response.data.token, response.data.user);
        // No need for navigation.replace('AdminDashboard') anymore!
        // The AuthContext update will cause App.js to switch navigators automatically.
      }
    } catch (error) {
      Alert.alert('Access Denied', error.response?.data?.message || 'Invalid Credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <ShieldAlert size={40} color="#FFD700" />
          </View>
          <Text style={styles.title}>CHETNA ADMIN</Text>
          <Text style={styles.subtitle}>Sindhudurg Command Center Control</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Admin Email</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter admin email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Control Key</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter master password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              {loading ? 'Authorizing...' : 'Authorize Entry'}
            </Text>
            {!loading && <ChevronRight size={20} color="#fff" />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.footer}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.footerText}>Back to User Login</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A', // Dark professional theme for admin
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  iconContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700', // Gold color for importance
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  form: {
    backgroundColor: '#151515',
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#AAA',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 5,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#FFD700',
    height: 55,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default AdminLoginScreen;
