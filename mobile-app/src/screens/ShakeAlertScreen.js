import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Dimensions, Vibration, TextInput, Alert, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { ThemeContext } from '../context/ThemeContext';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const { width } = Dimensions.get('window');
const COUNTDOWN_SECONDS = 15;

export default function ShakeAlertScreen({ navigation, route }) {
  const { theme } = useContext(ThemeContext);
  const { userData } = useContext(AuthContext);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          sendParentOnlyAlert();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync();
        if (newStatus !== 'granted') return null;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location.coords;
    } catch (e) {
      return null;
    }
  };

  const sendParentOnlyAlert = async () => {
    if (alertSent) return;
    setAlertSent(true);

    try {
      const coords = await getCurrentLocation();
      await api.post('/alerts/shake-alert', {
        userId: userData?.id,
        latitude: coords?.latitude || 0,
        longitude: coords?.longitude || 0,
      });
    } catch (e) {
      console.error('Shake alert error:', e);
    }
  };

  const handleSafe = async () => {
    if (!showPasswordInput) {
      setShowPasswordInput(true);
      return;
    }

    if (!password.trim()) {
      Alert.alert('Password Required', 'Enter your login password to cancel the alert.');
      return;
    }

    setIsSending(true);
    try {
      const res = await api.post('/auth/verify-password', { password });
      if (res.data.success) {
        if (timerRef.current) clearInterval(timerRef.current);
        Alert.alert('Alert Cancelled', 'You are marked as safe. No alert was sent.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Incorrect Password', 'Please try again.');
      }
    } catch (e) {
      Alert.alert('Verification Failed', 'Could not verify password. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleEmergency = async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const coords = await getCurrentLocation();
      const res = await api.post('/alerts/trigger', {
        userId: userData?.id,
        latitude: coords?.latitude || 0,
        longitude: coords?.longitude || 0,
        voiceTrigger: false,
      });
      if (res.data.success) {
        setAlertSent(true);
        navigation.replace('SOSTracking', { alertId: res.data.alertId });
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to trigger emergency alert.');
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
      <LinearGradient colors={['#1a0000', '#000000']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.warningIcon}>
            <Ionicons name="warning" size={60} color="#FF4444" />
          </View>

          <Text style={styles.title}>UNUSUAL MOVEMENT</Text>
          <Text style={styles.title}>DETECTED</Text>

          <Text style={styles.subtitle}>Are you safe?</Text>

          <View style={styles.timerContainer}>
            <Text style={[styles.timer, { color: secondsLeft <= 5 ? '#FF4444' : '#FFD700' }]}>
              {formatTime(secondsLeft)}
            </Text>
            <Text style={styles.timerLabel}>
              {alertSent ? 'Alert sent to parent' : `Auto-alert in ${secondsLeft}s`}
            </Text>
          </View>

          {showPasswordInput && (
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, { borderColor: '#FF4444', color: '#FFF', backgroundColor: '#1a1a1a' }]}
                placeholder="Enter login password"
                placeholderTextColor="#666"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoFocus
              />
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.safeButton}
              onPress={handleSafe}
              disabled={isSending || alertSent}
            >
              <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.safeGradient}>
                <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                <Text style={styles.safeButtonText}>
                  {showPasswordInput ? (isSending ? 'Verifying...' : 'Confirm Safe') : "I'm Safe"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emergencyButton}
              onPress={handleEmergency}
              disabled={alertSent}
            >
              <LinearGradient colors={['#CC0000', '#8B0000']} style={styles.emergencyGradient}>
                <Ionicons name="alert-circle" size={24} color="#FFF" />
                <Text style={styles.emergencyButtonText}>Emergency</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  warningIcon: {
    marginBottom: 20,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: '900',
    color: '#FF4444',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 18,
    color: '#AAA',
    marginTop: 15,
    marginBottom: 30,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timer: {
    fontSize: 60,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  passwordContainer: {
    width: '100%',
    marginBottom: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 15,
  },
  safeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  safeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  safeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  emergencyButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emergencyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  emergencyButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});
