import React, { useState, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { auth, firebaseConfig } from '../utils/firebase';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import * as Location from 'expo-location';
import { MapPin, ArrowRight, ShieldCheck } from 'lucide-react-native';

export default function RegisterScreen({ navigation }) {
  const recaptchaVerifier = React.useRef(null);
  const [verificationId, setVerificationId] = useState(null);
  const { login } = useContext(AuthContext);

  // Step wizard state
  const [step, setStep] = useState(1);
  const [isLocating, setIsLocating] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('GIRL');
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);

  React.useEffect(() => {
    let interval;
    if (otpSent && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  // Auto-fill mock for Google Login (since GCP Client IDs aren't set up yet)
  const handleGoogleSignupMock = () => {
    setFullName('Aniket Sharma'); // Example auto-fill
    setEmail('aniket.sharma@example.com');
    Alert.alert('Google Sync', 'Successfully fetched profile from Google!');
  };

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permission to auto-fill address.');
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
        const formattedAddress = [place.name, place.street, place.city, place.region].filter(Boolean).join(', ');
        setAddress(formattedAddress);
      }
    } catch (error) {
      Alert.alert('Location Error', 'Unable to fetch your live location right now.');
    }
    setIsLocating(false);
  };

  const proceedToStep2 = () => {
    if (!fullName || !email || !address) {
      Alert.alert('Error', 'Please fill all basic details before proceeding!');
      return;
    }
    setStep(2);
  };

  const handleSendOTP = async () => {
    if (phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid mobile number');
      return;
    }

    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const vId = await phoneProvider.verifyPhoneNumber(formattedPhone, recaptchaVerifier.current);
      
      setVerificationId(vId);
      setOtpSent(true);
      setTimer(60);
      Alert.alert('Success', 'Security OTP Sent to your Phone!');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  const handleFinalRegister = async () => {
    if (!otp) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    try {
      // 1. Verify SMS OTP natively using Firebase
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await signInWithCredential(auth, credential);

      // 2. Alert Node.js Backend to permanently store the Verified User
      const response = await api.post('/auth/register', { 
        phone, 
        email,
        password,
        fullName, 
        address, 
        gender 
      });

      if (response.data.success) {
        await login(response.data.token, response.data.user);
      }
    } catch (error) {
      if (error.response) {
        Alert.alert('Registration Failed', error.response.data.message);
      } else {
        Alert.alert('SMS Error', error.message);
      }
    }
  };

  return (
    <LinearGradient colors={['#fff', '#fee0f4', '#fce3eb']} style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            
            {/* Conditional Rendering for Steps */}
            {step === 1 ? (
              // ================= STEP 1: PROFILE DETAILS =================
              <View style={styles.stepContainer}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Step 1: Your Profile Details</Text>

                <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignupMock}>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR FILL MANUALLY</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your full name"
                    placeholderTextColor="#999"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your.email@example.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Create a strong password"
                    placeholderTextColor="#999"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.addressHeaderRow}>
                    <Text style={styles.label}>Home Address</Text>
                    <TouchableOpacity style={styles.liveLocationBadge} onPress={handleLocateMe}>
                      {isLocating ? <ActivityIndicator size="small" color="#d63384" /> : <MapPin color="#d63384" size={14} />}
                      <Text style={styles.liveLocationText}>Auto Locate</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
                    placeholder="Enter your complete address physically or use Auto Locate"
                    placeholderTextColor="#999"
                    value={address}
                    onChangeText={setAddress}
                    multiline
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

                <TouchableOpacity style={styles.primaryButton} onPress={proceedToStep2}>
                  <LinearGradient colors={['#f92b7c', '#791880']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.gradientButtonRow}>
                    <Text style={styles.primaryButtonText}>Next Step</Text>
                    <ArrowRight color="white" size={20} style={{marginLeft: 10}}/>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.bottomTextContainer}>
                  <Text style={styles.bottomText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.linkText}>Log In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // ================= STEP 2: SECURITY & OTP =================
              <View style={styles.stepContainer}>
                <TouchableOpacity onPress={() => setStep(1)} style={{ marginBottom: 20 }}>
                  <Text style={styles.backText}>← Back to Profile</Text>
                </TouchableOpacity>

                <ShieldCheck color="#d63384" size={50} style={{ alignSelf: 'center', marginBottom: 10 }} />
                <Text style={[styles.title, { textAlign: 'center' }]}>Security Check</Text>
                <Text style={[styles.subtitle, { textAlign: 'center' }]}>Link your mobile number for emergency SOS tracking</Text>

                <View style={[styles.inputContainer, { marginTop: 30 }]}>
                  <Text style={styles.label}>Mobile Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 00000 00000"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                    editable={!otpSent}
                  />
                </View>

                {!otpSent ? (
                  <TouchableOpacity 
                    style={[styles.primaryButton, phone.length !== 10 && { opacity: 0.5 }]} 
                    onPress={handleSendOTP}
                    disabled={phone.length !== 10}
                  >
                    <LinearGradient colors={['#f92b7c', '#791880']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.gradientButton}>
                      <Text style={styles.primaryButtonText}>Send Security OTP</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Enter 6-Digit OTP</Text>
                      
                      <View style={styles.otpContainer}>
                        {[...Array(6)].map((_, i) => (
                          <View key={i} style={[styles.otpBox, otp.length === i && styles.otpBoxActive]}>
                            <Text style={styles.otpText}>{otp[i] || ''}</Text>
                          </View>
                        ))}
                        <TextInput
                          style={styles.hiddenOtpInput}
                          value={otp}
                          onChangeText={setOtp}
                          keyboardType="number-pad"
                          maxLength={6}
                          autoFocus={true}
                        />
                      </View>

                      {timer > 0 ? (
                        <Text style={styles.timerText}>Resend OTP in <Text style={{color: '#d63384'}}>{timer}s</Text></Text>
                      ) : (
                        <TouchableOpacity onPress={handleSendOTP} style={styles.resendButton}>
                          <Text style={styles.resendText}>Didn't receive code? Resend OTP</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleFinalRegister}>
                      <LinearGradient colors={['#2bb24c', '#156b2b']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.gradientButton}>
                        <Text style={styles.primaryButtonText}>Verify & Create Account</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 30, paddingBottom: 50 },
  stepContainer: { flex: 1, marginTop: 10 },
  title: { fontSize: 30, fontWeight: '900', color: '#d63384', marginBottom: 5 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 30, fontWeight: '600' },
  backText: { color: '#999', fontSize: 15, fontWeight: 'bold' },
  
  googleButton: {
    flexDirection: 'row',
    height: 55,
    backgroundColor: '#fff',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d63384',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 20,
  },
  googleIcon: { fontSize: 20, fontWeight: 'bold', color: '#DB4437', marginRight: 10 },
  googleButtonText: { fontSize: 16, fontWeight: '800', color: '#d63384' },

  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { marginHorizontal: 15, color: '#999', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },

  inputContainer: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '800', color: '#4B0082', marginBottom: 8, letterSpacing: 0.5 },
  
  addressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  liveLocationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffebeb', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  liveLocationText: { fontSize: 11, fontWeight: 'bold', color: '#d63384', marginLeft: 4 },

  input: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 15,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#fce3eb',
    shadowColor: '#d63384',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },

  genderRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  genderBtn: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fce3eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  genderBtnActive: { borderColor: '#d63384', backgroundColor: '#ffebeb' },
  genderText: { fontSize: 15, color: '#999', fontWeight: '700' },
  genderTextActive: { color: '#d63384', fontWeight: '900' },
  
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, position: 'relative' },
  otpBox: { width: 45, height: 55, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fce3eb', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#d63384', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  otpBoxActive: { borderColor: '#d63384', backgroundColor: '#fff5f9' },
  otpText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  hiddenOtpInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0 },
  
  timerText: { textAlign: 'right', marginTop: 15, fontSize: 13, color: '#999', fontWeight: 'bold' },
  resendButton: { alignSelf: 'flex-end', marginTop: 15 },
  resendText: { color: '#d63384', fontWeight: 'bold', fontSize: 13 },
  
  gradientButton: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 15 },
  gradientButtonRow: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 15 },
  primaryButton: {
    height: 60,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: '#791880',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  bottomTextContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  bottomText: { color: '#666', fontSize: 14 },
  linkText: { color: '#d63384', fontSize: 14, fontWeight: 'bold' },
});
