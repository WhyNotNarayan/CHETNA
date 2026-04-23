import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { auth, firebaseConfig } from '../utils/firebase';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';

export default function LoginScreen({ navigation }) {
  const recaptchaVerifier = React.useRef(null);
  const [verificationId, setVerificationId] = useState(null);
  const { login } = useContext(AuthContext);
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
      Alert.alert('Success', 'OTP Sent to your Phone!');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    }
  };

  const handleVerify = async () => {
    if (otp.length < 6) {
      Alert.alert('Error', 'Please enter a valid 6 digit OTP');
      return;
    }
    
    try {
      // 1. Verify with Firebase directly over SMS
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await signInWithCredential(auth, credential);

      // 2. Alert Node.js Backend to generate secure session
      const response = await api.post('/auth/login', { phone });
      
      if (response.data.success) {
        await login(response.data.token, response.data.user);
      }
    } catch (error) {
      if (error.response) {
        Alert.alert('Login Failed', error.response.data.message);
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to access your safety dashboard</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 00000 00000"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              editable={!otpSent}
              placeholderTextColor="#999"
            />
          </View>

          {otpSent && (
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
          )}

          <TouchableOpacity 
            style={[styles.primaryButton, (!otpSent && phone.length !== 10) && { opacity: 0.5 }]}
            onPress={otpSent ? handleVerify : handleSendOTP}
            disabled={!otpSent && phone.length !== 10}
          >
            <LinearGradient 
              colors={['#f92b7c', '#791880']} 
              start={{x: 0, y: 0}} end={{x: 1, y: 0}}
              style={styles.gradientButton}
            >
              <Text style={styles.primaryButtonText}>{otpSent ? 'Verify & Login' : 'Send OTP'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomTextContainer}>
            <Text style={styles.bottomText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 30, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '900', color: '#d63384', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 40, fontWeight: '500' },
  
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#4B0082', marginBottom: 8, letterSpacing: 0.5 },
  input: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#fce3eb',
    shadowColor: '#d63384',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  
  otpContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, position: 'relative' },
  otpBox: { width: 45, height: 55, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#fce3eb', borderRadius: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#d63384', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  otpBoxActive: { borderColor: '#d63384', backgroundColor: '#fff5f9' },
  otpText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  hiddenOtpInput: { position: 'absolute', width: '100%', height: '100%', opacity: 0 },
  
  timerText: { textAlign: 'right', marginTop: 15, fontSize: 13, color: '#999', fontWeight: 'bold' },
  resendButton: { alignSelf: 'flex-end', marginTop: 15 },
  resendText: { color: '#d63384', fontWeight: 'bold', fontSize: 13 },
  
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  primaryButton: {
    height: 55,
    borderRadius: 15,
    marginTop: 10,
    shadowColor: '#791880',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },

  bottomTextContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40 },
  bottomText: { color: '#666', fontSize: 14 },
  linkText: { color: '#d63384', fontSize: 14, fontWeight: 'bold' },
});
