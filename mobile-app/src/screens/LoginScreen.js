import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, Alert, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { auth, firebaseConfig } from '../utils/firebase';
import { 
  getAuth, 
  RecaptchaVerifier, 
  PhoneAuthProvider,
  signInWithPhoneNumber,
  signInWithCredential
} from 'firebase/auth';
import { io } from 'socket.io-client';
import { QRCodeSVG } from 'qrcode.react';

const SOCKET_URL = 'http://192.168.1.102:5000';

export default function LoginScreen({ navigation }) {
  const recaptchaVerifier = React.useRef(null);
  const { login } = useContext(AuthContext);
  const [verificationId, setVerificationId] = useState(null);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    let interval;
    if (otpSent && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  // --- QR LOGIN LOGIC (WEB ONLY) ---
  const [qrSessionId, setQrSessionId] = useState(null);

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;

    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('📡 Web Socket connected for QR Session');
      socket.emit('request-qr-session');
    });

    socket.on('qr-session-id', (id) => {
      setQrSessionId(id);
    });

    socket.on('qr-auth-success', async (data) => {
      console.log('✅ QR Auth Success!', data.user.fullName);
      await login(data.token, data.user);
    });

    return () => socket.disconnect();
  }, []);

  const handleSendOTP = async () => {
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    if (cleanPhone.length < 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
      return;
    }
    
    setLoading(true);
    try {
      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
      
      if (Platform.OS === 'web') {
        try {
          if (!recaptchaVerifier.current) {
            recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
              size: 'invisible' 
            });
            await recaptchaVerifier.current.render();
          }
        } catch (reErr) {
          console.error('ReCAPTCHA Init Error:', reErr);
          recaptchaVerifier.current = null;
          throw new Error('Security check (ReCAPTCHA) failed to load. Please refresh and try again.');
        }
      }

      if (Platform.OS === 'web') {
        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current);
        window.confirmationResult = confirmationResult;
        setVerificationId('WEB_FLOW');
      } else {
        const phoneProvider = new PhoneAuthProvider(auth);
        const vId = await phoneProvider.verifyPhoneNumber(formattedPhone, recaptchaVerifier.current);
        setVerificationId(vId);
      }
      
      setOtpSent(true);
      setTimer(60);
      Alert.alert('OTP Sent', 'A 6-digit code has been sent to your phone.');
    } catch (error) {
      console.error('Send OTP Error:', error);
      if (Platform.OS === 'web') recaptchaVerifier.current = null;
      
      let errorMessage = error.message || 'Could not send OTP.';
      if (error.code === 'auth/too-many-requests') errorMessage = 'Too many attempts. Please try again later.';
      
      Alert.alert('OTP Error', errorMessage);
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (otp.length < 6) {
      Alert.alert('Incomplete OTP', 'Please enter all 6 digits of the code.');
      return;
    }

    setLoading(true);
    try {
      if (Platform.OS === 'web' && window.confirmationResult) {
        // 1. Verify with Firebase using ConfirmationResult (WEB)
        await window.confirmationResult.confirm(otp);
      } else {
        // 1. Verify with Firebase using VerificationID (MOBILE)
        const credential = PhoneAuthProvider.credential(verificationId, otp);
        await signInWithCredential(auth, credential);
      }

      // 2. Auth with our Backend
      const response = await api.post('/auth/login', { phone });
      
      if (response.data.success) {
        await login(response.data.token, response.data.user);
      }
    } catch (error) {
      console.error('Verification Error:', error);
      let msg = 'Invalid OTP. Please try again.';
      if (error.code === 'auth/code-expired') msg = 'OTP has expired. Please request a new one.';
      if (error.code === 'auth/invalid-verification-code') msg = 'Incorrect OTP code. Please check and try again.';
      
      Alert.alert('Verification Failed', msg);
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={['#fff', '#fee0f4', '#fce3eb']} style={styles.container}>
      {Platform.OS !== 'web' ? (
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={firebaseConfig}
          attemptInvisibleVerification={true}
        />
      ) : (
        <View 
          nativeID="recaptcha-container" 
          style={Platform.OS === 'web' ? { height: 100, width: '100%', display: 'none' } : {}} 
        />
      )}
      
      <SafeAreaView style={[styles.safeArea, Platform.OS === 'web' && styles.webLayout]}>
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
                {Array.from({ length: 6 }).map((_, i) => (
                  <View key={i} style={[styles.otpBox, otp && otp.length === i && styles.otpBoxActive]}>
                    <Text style={styles.otpText}>{(otp && otp[i]) || ''}</Text>
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
            style={[styles.primaryButton, ((!otpSent && phone.length !== 10) || loading) && { opacity: 0.5 }]}
            onPress={otpSent ? handleVerify : handleSendOTP}
            disabled={(!otpSent && phone.length !== 10) || loading}
          >
            <LinearGradient 
              colors={['#f92b7c', '#791880']} 
              start={{x: 0, y: 0}} end={{x: 1, y: 0}}
              style={styles.gradientButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>{otpSent ? 'Verify & Login' : 'Send OTP'}</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <View style={styles.bottomTextContainer}>
            <Text style={styles.bottomText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>Sign Up</Text>
            </TouchableOpacity>
          </View>

        </KeyboardAvoidingView>

        {/* QR CODE SECTION FOR WEB (WHATSAPP STYLE) */}
        {Platform.OS === 'web' && qrSessionId && (
          <View style={styles.webQrSection}>
            <View style={styles.qrCard}>
              <Text style={styles.qrTitle}>Login with QR Code</Text>
              <Text style={styles.qrSub}>Scan this code with the Chetna Mobile App to log in instantly.</Text>
              
              <View style={styles.qrContainer}>
                <QRCodeSVG 
                  value={qrSessionId} 
                  size={200}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: "https://cdn-icons-png.flaticon.com/512/2092/2092663.png",
                    x: undefined,
                    y: undefined,
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </View>

              <View style={styles.qrSteps}>
                <Text style={styles.qrStep}>1. Open Chetna app on your phone</Text>
                <Text style={styles.qrStep}>2. Go to Dashboard {'>'} Link Laptop</Text>
                <Text style={styles.qrStep}>3. Point your camera at this screen</Text>
              </View>
            </View>
          </View>
        )}
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

  // WEB LAYOUT
  safeArea: { flex: 1 },
  webLayout: { flexDirection: 'row', alignItems: 'center', maxWidth: 1200, alignSelf: 'center', width: '100%' },
  
  webQrSection: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#fce3eb',
    display: Platform.OS === 'web' ? 'flex' : 'none'
  },
  qrCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#d63384',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    width: '100%',
    maxWidth: 400
  },
  qrTitle: { fontSize: 20, fontWeight: '900', color: '#4B0082', marginBottom: 10 },
  qrSub: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 18 },
  qrContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fce3eb',
    marginBottom: 25
  },
  qrSteps: { width: '100%', gap: 10 },
  qrStep: { fontSize: 13, color: '#333', fontWeight: '600' }
});
