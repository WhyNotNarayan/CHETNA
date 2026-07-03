import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Modal, TextInput, Alert, ActivityIndicator, Share, Dimensions } from 'react-native';
import { Shield, Users, Clock, CheckCircle, XCircle, Share2, MapPin, Camera as CameraIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import { queueLocation, queueMedia, attemptSync } from '../utils/offlineSync';

const { width } = Dimensions.get('window');

export default function SOSTrackingScreen({ route, navigation }) {
  const { alertId, evidenceUrl } = route.params;
  const { userData } = useContext(AuthContext);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(false);
  const [password, setPassword] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [elapsed, setElapsed] = useState('00:00');

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef(null);
  const isTracking = useRef(true);

  const fetchStats = async () => {
    try {
      const res = await api.get(`/alerts/stats/${alertId}`);
      if (res.data.success) {
        setStats(res.data);
        if (res.data.status === 'RESOLVED') {
          stopAllTracking();
          navigation.goBack();
          Alert.alert("SOS Resolved", "Your emergency alert has been closed.");
        }
      }
    } catch (e) {
      console.log('Stats Fetch Error');
    } finally {
      setLoading(false);
    }
  };

  const stopAllTracking = () => {
    isTracking.current = false;
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  // Continuous Video Recording Loop
  const startContinuousVideo = async () => {
    if (!isTracking.current) return;
    
    if (cameraRef.current && cameraPermission?.granted && micPermission?.granted) {
      try {
        console.log('[SOS] Starting video clip...');
        setIsRecording(true);

        const video = await cameraRef.current.recordAsync({
          maxDuration: 28, // Use slightly less than 30 to be safe
          videoQuality: '480p',
          // Note: expo-camera recordAsync doesn't expose muxer options directly
          // The output is typically fragmented MP4 which needs remuxing for browser playback
        });

        console.log('[SOS] Video clip finished:', video.uri);
        setIsRecording(false);

        if (video && video.uri) {
          // CRITICAL: Wait for file to be fully written to disk
          await waitForFileReady(video.uri);
          await queueMedia(alertId, video.uri, 'VIDEO');
        }

        // Add a small 2-second delay before restarting to allow hardware to reset
        if (isTracking.current) {
          setTimeout(startContinuousVideo, 2000);
        }
      } catch (err) {
        console.error('[SOS] Video recording error:', err.message);
        setIsRecording(false);
        if (isTracking.current) {
          setTimeout(startContinuousVideo, 5000);
        }
      }
    } else {
      console.log('[SOS] Camera or Mic permission not granted, or ref missing');
      setTimeout(startContinuousVideo, 2000);
    }
  };

  // Ensure file is fully written before uploading
  const waitForFileReady = async (uri) => {
    // Simple delay — expo-camera recordAsync promise resolves when recording stops,
    // but the OS may still be flushing the file. 3 seconds is safe for 28s clips.
    console.log('[SOS] Waiting for file to flush to disk...');
    await new Promise(r => setTimeout(r, 3000));
    console.log('[SOS] File should be ready:', uri);
  };

  // Continuous Audio Recording Loop
  const startContinuousAudio = async () => {
    if (!isTracking.current) return;

    try {
      console.log('[SOS] Starting 30s audio clip...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      // Record for 30 seconds
      await new Promise(resolve => setTimeout(resolve, 30000));

      if (recording) {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        console.log('[SOS] Audio clip finished:', uri);
        if (uri) {
          await queueMedia(alertId, uri, 'AUDIO');
          attemptSync();
        }
      }

      if (isTracking.current) {
        startContinuousAudio();
      }
    } catch (err) {
      console.error('[SOS] Audio recording error:', err.message);
      if (isTracking.current) {
        setTimeout(startContinuousAudio, 5000);
      }
    }
  };

  // Location Tracking Loop
  const startLocationLoop = async () => {
    if (!isTracking.current) return;

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await queueLocation(alertId, loc.coords.latitude, loc.coords.longitude);
    } catch (e) {
      console.log('Location update failed');
    }

    if (isTracking.current) {
      setTimeout(startLocationLoop, 10000); // Update location every 10s
    }
  };

  useEffect(() => {
    const getPerms = async () => {
      if (!cameraPermission?.granted) await requestCameraPermission();
      if (!micPermission?.granted) await requestMicPermission();
    };
    getPerms();

    isTracking.current = true;
    fetchStats();
    startLocationLoop();
    startContinuousAudio();

    const statsInterval = setInterval(fetchStats, 5000);
    const syncInterval = setInterval(attemptSync, 15000); // Attempt sync every 15s

    return () => {
      stopAllTracking();
      clearInterval(statsInterval);
      clearInterval(syncInterval);
    };
  }, []);

  useEffect(() => {
    if (!stats) return;
    const timer = setInterval(() => {
      const start = new Date(stats.createdAt);
      const now = new Date();
      const diff = Math.floor((now - start) / 1000);
      const mins = Math.floor(diff / 60).toString().padStart(2, '0');
      const secs = (diff % 60).toString().padStart(2, '0');
      setElapsed(`${mins}:${secs}`);
    }, 1000);
    return () => clearInterval(timer);
  }, [stats]);

  const handleCancel = async () => {
    if (!password) return Alert.alert("Required", "Please enter password to verify cancellation.");
    setCancelling(true);
    try {
      const res = await api.post('/alerts/resolve', { alertId, password });
      if (res.data.success) {
        stopAllTracking();
        setCancelModal(false);
        navigation.goBack();
        Alert.alert("SOS Cancelled", "Stay safe!");
      }
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Verification failed");
    } finally {
      setCancelling(false);
    }
  };

  const handleShareLink = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${loc.coords.latitude},${loc.coords.longitude}`;
      await Share.share({
        message: `I am in an emergency! My live location: ${mapsUrl}`,
      });
    } catch (err) {
      console.log(err);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#FF4444" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#FF4B2B', '#FF416C']} style={styles.header}>
        <View style={styles.headerTop}>
          <Shield color="#FFF" size={32} />
          <Text style={styles.headerTitle}>SOS ACTIVE</Text>
        </View>
        <Text style={styles.timerText}>{elapsed}</Text>
        <Text style={styles.timerSub}>Time since activation</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Continuous Camera Feed (Used for recording) */}
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            mode="video"
            onCameraReady={() => {
              console.log('[SOS] Camera Ready. Starting loop...');
              startContinuousVideo();
            }}
          />
          <View style={styles.recBadge}>
            <View style={styles.recDot} />
            <Text style={styles.recText}>RECORDING EVIDENCE</Text>
          </View>
        </View>

        <View style={styles.statGrid}>
          <StatBox icon={<Users color="#FF4444" />} label="Notified" value={stats?.notifiedCount} />
          <StatBox icon={<CheckCircle color="#10B981" />} label="Responders" value={stats?.acceptedCount} />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Privacy Protection</Text>
          <Text style={styles.infoText}>
            Continuous 30s video clips are being saved to your private Evidence Vault.
            Parents and responders can only see your location, not your recordings.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Live Status</Text>
        {stats?.responders?.length > 0 ? (
          stats.responders.map((r, i) => (
            <View key={i} style={styles.responderCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(r.name || 'Volunteer')[0]}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.responderName}>{r.name}</Text>
                <Text style={styles.responderStatus}>Accepted • Heading to you</Text>
              </View>
              <Clock size={16} color="#666" />
              <Text style={styles.etaText}>~5 min</Text>
            </View>
          ))
        ) : (
          <View style={styles.searchingBox}>
            <ActivityIndicator color="#FF4444" />
            <Text style={styles.searchingText}>Waiting for nearby Secret Cops to accept...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShareLink}>
          <Share2 color="#666" size={20} />
          <Text style={styles.shareBtnText}>Share Location Link</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => setCancelModal(true)}>
          <XCircle color="#FF4444" size={20} />
          <Text style={styles.cancelBtnText}>CANCEL SOS</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={cancelModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Emergency?</Text>
            <Text style={styles.modalSub}>Enter your registered password to confirm you are safe.</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity style={styles.confirmBtn} onPress={handleCancel} disabled={cancelling}>
              {cancelling ? <ActivityIndicator color="#FFF" /> : <Text style={styles.confirmText}>VERIFY & CANCEL</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setCancelModal(false)}>
              <Text style={styles.backLink}>Back to Safety Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const StatBox = ({ icon, label, value }) => (
  <View style={styles.statBox}>
    {icon}
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { padding: 40, alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
  timerText: { color: '#FFF', fontSize: Math.min(width * 0.12, 48), fontWeight: 'bold' },
  timerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  scrollContent: { padding: 20 },
  cameraContainer: { width: '100%', height: 200, backgroundColor: '#000', borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  camera: { flex: 1 },
  recBadge: { position: 'absolute', top: 15, left: 15, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444' },
  recText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  statGrid: { flexDirection: 'row', gap: 15, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#F8F9FA', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  statValue: { fontSize: 24, fontWeight: 'bold', marginVertical: 5 },
  statLabel: { fontSize: 11, color: '#666', fontWeight: 'bold' },
  infoCard: { backgroundColor: '#F0F7FF', padding: 15, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#D0E5FF' },
  infoTitle: { fontSize: 14, fontWeight: 'bold', color: '#0056B3', marginBottom: 5 },
  infoText: { fontSize: 12, color: '#444', lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  responderCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: '#EEE' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FF444420', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FF4444', fontWeight: 'bold' },
  responderName: { fontWeight: 'bold', fontSize: 15 },
  responderStatus: { color: '#10B981', fontSize: 12 },
  etaText: { marginLeft: 5, fontWeight: 'bold', color: '#666' },
  searchingBox: { padding: 30, alignItems: 'center', gap: 10 },
  searchingText: { color: '#888', textAlign: 'center' },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#EEE', gap: 10 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 50, borderRadius: 15, backgroundColor: '#F0F0F0' },
  shareBtnText: { color: '#666', fontWeight: 'bold' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 55, borderRadius: 15, borderWidth: 2, borderColor: '#FF4444' },
  cancelBtnText: { color: '#FF4444', fontWeight: '900' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 25 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 25, padding: 30, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  modalSub: { textAlign: 'center', color: '#666', marginBottom: 20 },
  input: { width: '100%', height: 55, backgroundColor: '#F0F0F0', borderRadius: 12, paddingHorizontal: 20, marginBottom: 20 },
  confirmBtn: { width: '100%', height: 55, backgroundColor: '#FF4444', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  confirmText: { color: '#FFF', fontWeight: 'bold' },
  backLink: { color: '#888', fontWeight: '600' }
});
