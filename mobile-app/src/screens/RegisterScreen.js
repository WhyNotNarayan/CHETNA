import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import * as Location from 'expo-location';
import { MapPin, User, Mail, Lock, Phone, ArrowRight } from 'lucide-react-native';

export default function RegisterScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('GIRL');

  // Guardian states (Girls only)
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianRelationship, setGuardianRelationship] = useState('father'); // mother, father, brother, sister, or guardian
  const [guardianSecondaryPhone, setGuardianSecondaryPhone] = useState('');

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Enable location to auto-fill address.');
        setIsLocating(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let reverse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (reverse.length > 0) {
        const place = reverse[0];
        const street = place.street || place.name || '';
        const city = place.city || place.subregion || '';
        const formattedAddress = [street, city].filter(Boolean).join(', ');
        setAddress(formattedAddress);
      }
    } catch (error) {
      Alert.alert('Error', 'Unable to fetch location.');
    }
    setIsLocating(false);
  };

  const handleRegister = async () => {
    console.log('--- FRONTEND REGISTRATION START ---');
    console.log('Data:', { fullName, email, phone, password, address, gender });

    if (!fullName || !email || !phone || !password || !address) {
      Alert.alert('Missing Info', 'Please fill in ALL fields including address.');
      return;
    }

    if (phone.length < 10) {
      Alert.alert('Invalid Mobile', 'Mobile number must be at least 10 digits.');
      return;
    }

    const payload = {
      phone, 
      email,
      password,
      fullName, 
      address, 
      gender 
    };

    if (gender === 'GIRL') {
      if (!guardianName || !guardianPhone || !guardianRelationship) {
        Alert.alert('Guardian Info Required', 'For safety, please enter your parent or guardian details.');
        return;
      }
      if (guardianPhone.length < 10) {
        Alert.alert('Invalid Mobile', 'Guardian mobile number must be at least 10 digits.');
        return;
      }
      payload.guardian = {
        name: guardianName,
        phone: guardianPhone,
        relationship: guardianRelationship,
        secondaryPhone: guardianSecondaryPhone || null
      };
    }

    setLoading(true);
    try {
      console.log('Sending request to:', api.defaults.baseURL + '/auth/register');
      const response = await api.post('/auth/register', payload);

      console.log('Response Received:', response.data);

      if (response.data.success) {
        Alert.alert('Success ✅', 'Account created successfully!', [
          { text: 'Login Now', onPress: () => login(response.data.token, response.data.user) }
        ]);
      }
    } catch (error) {
      console.log('Detailed Error:', error);

      let errorTitle = 'Registration Failed';
      let errorMsg = 'Unknown error occurred.';

      if (error.response) {
        errorMsg = error.response.data?.message || `Server Error (${error.response.status})`;
        console.log('Server Error Data:', error.response.data);
      } else if (error.request) {
        errorTitle = 'Network Connection Error';
        errorMsg = `Cannot connect to your laptop.
1. Check if Laptop and Phone are on SAME Wi-Fi.
2. Check if IP in api.js is correct: 192.168.1.103
3. Ensure Backend is running.`;
      } else {
        errorMsg = error.message;
      }

      Alert.alert(errorTitle, errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#fff', '#fee0f4', '#fce3eb']} style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Chetna for a safer Sindhudurg</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputWrapper}>
                <User size={18} color="#d63384" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Mail size={18} color="#d63384" />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

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
                  placeholder="Min. 6 characters"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.label}>Home Address</Text>
                <TouchableOpacity style={styles.locateBtn} onPress={handleLocateMe}>
                  {isLocating ? <ActivityIndicator size="small" color="#d63384" /> : <MapPin color="#d63384" size={14} />}
                  <Text style={styles.locateText}>Auto Locate</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter complete address"
                multiline
                value={address}
                onChangeText={setAddress}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>I am a...</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'GIRL' && styles.genderBtnActive]}
                  onPress={() => setGender('GIRL')}
                >
                  <Text style={[styles.genderText, gender === 'GIRL' && styles.genderTextActive]}>Female</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === 'BOY' && styles.genderBtnActive]}
                  onPress={() => setGender('BOY')}
                >
                  <Text style={[styles.genderText, gender === 'BOY' && styles.genderTextActive]}>Male</Text>
                </TouchableOpacity>
              </View>
            </View>

            {gender === 'GIRL' && (
              <View style={{ marginTop: 15, padding: 15, backgroundColor: 'rgba(214, 51, 132, 0.04)', borderRadius: 20, borderWidth: 1, borderColor: '#fce3eb', marginBottom: 15 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#d63384', marginBottom: 15 }}>Parent / Guardian Contact</Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Guardian Name</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#d63384" />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter guardian's full name"
                      value={guardianName}
                      onChangeText={setGuardianName}
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Guardian Mobile Number</Text>
                  <View style={styles.inputWrapper}>
                    <Phone size={18} color="#d63384" />
                    <TextInput
                      style={styles.input}
                      placeholder="10-digit mobile number"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={guardianPhone}
                      onChangeText={setGuardianPhone}
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Relationship</Text>
                  <View style={styles.genderRow}>
                    {['father', 'mother', 'brother', 'sister', 'guardian'].map(r => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.genderBtn, { height: 40, paddingHorizontal: 5 }, guardianRelationship === r && styles.genderBtnActive]}
                        onPress={() => setGuardianRelationship(r)}
                      >
                        <Text style={[{ fontSize: 10, color: '#999', fontWeight: '700', textTransform: 'capitalize' }, guardianRelationship === r && styles.genderTextActive]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Secondary Emergency Contact (Optional)</Text>
                  <View style={styles.inputWrapper}>
                    <Phone size={18} color="#d63384" />
                    <TextInput
                      style={styles.input}
                      placeholder="Second mobile number (Optional)"
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={guardianSecondaryPhone}
                      onChangeText={setGuardianSecondaryPhone}
                      placeholderTextColor="#999"
                    />
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.primaryButton} onPress={handleRegister} disabled={loading}>
              <LinearGradient colors={['#f92b7c', '#791880']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.gradientButton}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.bottomText}>
              <Text style={{ color: '#666' }}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Log In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 30, paddingBottom: 50 },
  title: { fontSize: 32, fontWeight: '900', color: '#d63384' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 30, fontWeight: '500' },
  inputContainer: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '800', color: '#4B0082', marginBottom: 8, letterSpacing: 0.5 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#fce3eb', paddingHorizontal: 15 },
  input: { flex: 1, height: 50, color: '#333', fontSize: 15, marginLeft: 10 },
  textArea: { height: 70, paddingTop: 12, textAlignVertical: 'top', backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#fce3eb', paddingHorizontal: 15 },
  locateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebeb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  locateText: { fontSize: 11, fontWeight: 'bold', color: '#d63384', marginLeft: 4 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderBtn: { flex: 1, backgroundColor: '#fff', height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fce3eb' },
  genderBtnActive: { borderColor: '#d63384', backgroundColor: '#ffebeb' },
  genderText: { fontSize: 14, color: '#999', fontWeight: '700' },
  genderTextActive: { color: '#d63384', fontWeight: '900' },
  primaryButton: { height: 55, borderRadius: 15, marginTop: 10, overflow: 'hidden' },
  gradientButton: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  bottomText: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  linkText: { color: '#d63384', fontWeight: 'bold' }
});
