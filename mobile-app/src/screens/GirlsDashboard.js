import React, { useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Alert, Platform, ActivityIndicator, Modal, TextInput, Linking, Animated, useWindowDimensions } from 'react-native';
import { Shield, Navigation, Newspaper, Mic, Camera, LogOut, Volume2, AlertTriangle, Users, User, Phone, Heart, Zap } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Camera as ExpoCamera } from 'expo-camera';
import { Audio, Video, ResizeMode } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafetyMonitor } from '../hooks/useSafetyMonitor';
import { useVolumeSOS } from '../hooks/useVolumeSOS';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../utils/api';
import { ensurePermission, PERMISSIONS } from '../utils/permissionHelper';

const { width: screenWidth } = Dimensions.get('window');

export default function GirlsDashboard({ navigation }) {
  const { width, height } = useWindowDimensions();
  const { currentZone } = useSafetyMonitor();
  const { logout, userData, setUserData } = useContext(AuthContext);
  const { isMicActive, voicePrompt } = useVolumeSOS(navigation, userData);
  const [news, setNews] = useState([]);
  const [isSOSLoading, setIsSOSLoading] = useState(false);

  // Animation for Mic
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnimation = useRef(null);

  useEffect(() => {
    if (isMicActive) {
      pulseAnimation.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
        ])
      );
      pulseAnimation.current.start();
    } else {
      if (pulseAnimation.current) {
        pulseAnimation.current.stop();
        pulseAnimation.current = null;
      }
      pulseAnim.setValue(1);
    }
  }, [isMicActive]);

  // Evidence state
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceAlerts, setEvidenceAlerts] = useState([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [showEvidencePasswordModal, setShowEvidencePasswordModal] = useState(false);
  const [evidencePassword, setEvidencePassword] = useState('');
  const [verifyingEvidencePassword, setVerifyingEvidencePassword] = useState(false);

  // Media Player modal state
  const [mediaPlayerUrl, setMediaPlayerUrl] = useState(null);
  const [mediaPlayerType, setMediaPlayerType] = useState(null); // 'VIDEO' or 'AUDIO'
  const [showMediaPlayer, setShowMediaPlayer] = useState(false);

  // Gallery save state
  const [galleryPermission, setGalleryPermission] = useState(null);
  const [savingToGallery, setSavingToGallery] = useState(false);

  // Check gallery permission on mount
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.getPermissionsAsync();
      setGalleryPermission(status === 'granted');
    })();
  }, []);

  const requestGalleryPermission = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    setGalleryPermission(status === 'granted');
    if (status !== 'granted') {
      Alert.alert(
        'Gallery Permission Required',
        'Please grant gallery permission in Settings to save evidence recordings to your device.',
        [{ text: 'OK' }]
      );
    }
    return status === 'granted';
  };

  const saveToGallery = async (fileUrl, fileType) => {
    try {
      // Request permission if not granted
      let hasPermission = galleryPermission;
      if (!hasPermission) {
        hasPermission = await requestGalleryPermission();
        if (!hasPermission) return;
      }

      setSavingToGallery(true);

      const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
      const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${baseUrl}${fileUrl}`;

      const ext = fileType === 'VIDEO' ? 'mp4' : 'm4a';
      const fileName = `Chetna_${fileType}_${Date.now()}.${ext}`;
      const localUri = FileSystem.cacheDirectory + fileName;

      console.log('[GirlsDashboard] Downloading file:', fullUrl);
      const downloadRes = await FileSystem.downloadAsync(fullUrl, localUri);

      if (!downloadRes.uri) {
        Alert.alert('Error', 'Failed to download file');
        setSavingToGallery(false);
        return;
      }

      console.log('[GirlsDashboard] Saving to gallery:', downloadRes.uri);
      const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);

      // Try to add to Chetna Evidence album
      try {
        const albums = await MediaLibrary.getAlbumsAsync();
        const chetnaAlbum = albums.find(a => a.title === 'Chetna Evidence');
        if (chetnaAlbum) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], chetnaAlbum, false);
        } else {
          await MediaLibrary.createAlbumAsync('Chetna Evidence', asset, false);
        }
      } catch (albumErr) {
        console.warn('[GirlsDashboard] Album error (asset still saved):', albumErr.message);
      }

      // Cleanup cache
      try { await FileSystem.deleteAsync(localUri, { idempotent: true }); } catch (e) {}

      Alert.alert('Saved!', `${fileType} evidence saved to your gallery under "Chetna Evidence" album.`);
    } catch (err) {
      console.error('[GirlsDashboard] Save to gallery failed:', err);
      Alert.alert('Error', 'Failed to save to gallery. Please try again.');
    } finally {
      setSavingToGallery(false);
    }
  };

  // Link Parent state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentRelation, setParentRelation] = useState('father');
  const [parentSecondaryPhone, setParentSecondaryPhone] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await api.get('/news/latest');
        if (response.data?.success) setNews(response.data.news || []);
      } catch (e) {}
    };
    fetchNews();
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const refreshProfile = async () => {
      try {
        const res = await api.get(`/auth/profile/${userData.id}`);
        if (res.data?.success) setUserData(res.data.user);
      } catch (e) {}
    };
    if (userData?.id) refreshProfile();
  }, [userData?.id]);

  useEffect(() => {
    if (userData?.contacts && userData.contacts.length > 0) {
      const parent = userData.contacts[0];
      setParentName(parent.name || '');
      setParentPhone(parent.phone || '');
      setParentRelation(parent.relationship || 'father');
      setParentSecondaryPhone(parent.secondaryPhone || '');
    }
  }, [userData]);

  const fetchMyEvidence = async () => {
    setEvidenceLoading(true);
    try {
      const res = await api.get('/alerts/my-evidence');
      if (res.data?.success) setEvidenceAlerts(res.data.alerts || []);
    } catch (e) {
      console.log('Fetch evidence error:', e.message);
    } finally {
      setEvidenceLoading(false);
    }
  };

  const verifyEvidencePassword = async () => {
    if (!evidencePassword) {
      Alert.alert('Required', 'Please enter your password to verify access.');
      return;
    }
    setVerifyingEvidencePassword(true);
    try {
      const res = await api.post('/auth/verify-password', { password: evidencePassword });
      if (res.data?.success) {
        setShowEvidencePasswordModal(false);
        setShowEvidenceModal(true);
        fetchMyEvidence();
        setEvidencePassword('');
      } else {
        Alert.alert('Error', 'Incorrect password.');
      }
    } catch (e) {
      Alert.alert('Error', 'Password verification failed.');
    } finally {
      setVerifyingEvidencePassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Logout', style: 'destructive', onPress: logout }
    ]);
  };

  const handleSOS = async () => {
    if (isSOSLoading) return;

    // 🛡️ PRO PERMISSION CHECK
    const hasLoc = await ensurePermission(PERMISSIONS.LOCATION);
    if (!hasLoc) return;

    const hasCam = await ensurePermission(PERMISSIONS.CAMERA);
    if (!hasCam) return;

    const hasMic = await ensurePermission(PERMISSIONS.MICROPHONE);
    if (!hasMic) return;

    setIsSOSLoading(true);
    try {
      console.log('--- SOS TRIGGER START ---');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const response = await api.post('/alerts/trigger', {
        userId: userData?.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        voiceTrigger: false
      });
      if (response.data?.success) {
        navigation.navigate('SOSTracking', { 
          alertId: response.data.alertId,
          evidenceUrl: response.data.evidenceUrl
        });
      }
    } catch (e) {
      Alert.alert('SOS Error', 'Unable to trigger emergency alert.');
    } finally {
      setIsSOSLoading(false);
    }
  };

  const handleLinkParent = async () => {
    if (!parentName || !parentPhone || !parentRelation) {
      Alert.alert('Required Fields', 'Please fill Parent Name, Mobile and Relationship.');
      return;
    }
    setSavingLink(true);
    try {
      const res = await api.post('/auth/link-parent', {
        name: parentName, phone: parentPhone, relationship: parentRelation, secondaryPhone: parentSecondaryPhone || null
      });
      if (res.data?.success) {
        Alert.alert('Linked ✅', 'Parent linked successfully!');
        setShowLinkModal(false);
      }
    } catch (err) {
      Alert.alert('Link Failed', err.response?.data?.message || 'Failed to update parent details.');
    } finally {
      setSavingLink(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.dashboardHeader}>
        <View>
          <Text style={styles.headerWelcome}>Hello, {userData?.fullName?.split(' ')[0] || 'User'}</Text>
          <Text style={styles.headerTagline}>Sindhudurg Safety Hub</Text>
        </View>
        <TouchableOpacity style={styles.logoutIconButton} onPress={handleLogout}>
          <LogOut color="#FF4444" size={24} />
        </TouchableOpacity>
      </View>

      {isMicActive && (
        <View style={styles.micBanner}>
          <LinearGradient colors={['#FF1744', '#FF6D00']} style={styles.micGradient} start={{x:0, y:0}} end={{x:1, y:0}}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Mic color="#FFF" size={20} />
            </Animated.View>
            <View style={styles.micTextContent}>
              <Text style={styles.micTitle}>MIC ACTIVE</Text>
              <Text style={styles.micSubtitle}>{voicePrompt || 'Say "Help Me" to trigger SOS'}</Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {currentZone && (
        <TouchableOpacity style={styles.dangerBanner} activeOpacity={0.9}>
          <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.dangerGradient} start={{x:0, y:0}} end={{x:1, y:0}}>
            <AlertTriangle color="#FFF" size={20} />
            <View style={styles.dangerTextContent}>
              <Text style={styles.dangerTitle}>{currentZone.name?.toUpperCase() || 'DANGER'}</Text>
              <Text style={styles.dangerSubTitle}>{currentZone.warningMessage || 'Entering High Risk Area'}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 🤖 AI SAFETY INSIGHT CARD */}
        <View style={styles.aiInsightCard}>
          <LinearGradient colors={['#6200ee', '#791880']} style={styles.aiGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
            <View style={styles.aiHeader}>
              <Zap color="#FFF" size={14} fill="#FFF" />
              <Text style={styles.aiTitle}>AI SAFETY INSIGHT</Text>
            </View>
            <View style={styles.aiMeterRow}>
               <View style={styles.meterInfo}>
                  <Text style={styles.meterValue}>{currentZone ? '65%' : '98%'}</Text>
                  <Text style={styles.meterLabel}>Area Safety Score</Text>
               </View>
               <View style={styles.aiAdvice}>
                  <Text style={styles.adviceText}>
                    {currentZone
                      ? "Risk detected. AI recommends staying in well-lit areas and keeping SOS ready."
                      : "Environment looks safe. 5 verified rescuers are active within 2km of you."}
                  </Text>
               </View>
            </View>
          </LinearGradient>
        </View>

        <View style={[styles.statusCard, currentZone ? styles.dangerCard : styles.safeCard]}>
          <Shield color={currentZone ? "#ff4d4d" : "#4CAF50"} size={32} />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>{currentZone ? 'DANGER ZONE' : 'YOU ARE SAFE'}</Text>
            <Text style={styles.statusSubtitle}>{currentZone ? `Entering ${currentZone.name}` : 'Scanning your surroundings...'}</Text>
          </View>
        </View>

        <View style={styles.sosContainer}>
          <TouchableOpacity style={[styles.sosButton, { width: Math.min(width * 0.45, 200), height: Math.min(width * 0.45, 200), borderRadius: Math.min(width * 0.225, 100) }]} activeOpacity={0.8} onPress={handleSOS} disabled={isSOSLoading}>
            <View style={[styles.sosOuterRing, { width: Math.min(width * 0.4, 180), height: Math.min(width * 0.4, 180), borderRadius: Math.min(width * 0.2, 90) }]}>
              <View style={[styles.sosInnerCircle, { width: Math.min(width * 0.32, 140), height: Math.min(width * 0.32, 140), borderRadius: Math.min(width * 0.16, 70) }]}>
                {isSOSLoading ? <ActivityIndicator size="large" color="#FFF" /> : <Text style={styles.sosText}>SOS</Text>}
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.sosInstruction}>Tap once, or say "Help Me"</Text>
        </View>

        <View style={styles.actionsGrid}>
          <ActionItem icon={<Navigation color="#6200ee" />} label="Safe Route" onPress={() => navigation.navigate('AINavigator')} />
          <ActionItem icon={<Newspaper color="#6200ee" />} label="Local News" />
          <ActionItem icon={<Users color="#6200ee" />} label="Link Parent" onPress={() => setShowLinkModal(true)} />
          <ActionItem
            icon={<Camera color="#6200ee" />}
            label="Evidence"
            onPress={async () => {
              const hasCam = await ensurePermission(PERMISSIONS.CAMERA);
              if (hasCam) setShowEvidencePasswordModal(true);
            }}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Safety Updates</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newsScroll}>
          {news.map(item => (
            <NewsCard key={item.id} title={item.title} content={item.content} time={item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'} type={item.type} />
          ))}
        </ScrollView>
      </ScrollView>

      {/* Modals */}
      <Modal visible={showLinkModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Link Parent/Guardian</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Parent Name</Text>
              <TextInput style={styles.input} placeholder="Name" value={parentName} onChangeText={setParentName} />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Parent Mobile</Text>
              <TextInput style={styles.input} placeholder="10-digit number" keyboardType="phone-pad" value={parentPhone} onChangeText={setParentPhone} />
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleLinkParent} disabled={savingLink}>
              {savingLink ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>LINK NOW</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLinkModal(false)}><Text style={styles.cancelTextLink}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* In-App Media Player Modal */}
      <Modal visible={showMediaPlayer} transparent animationType="fade" onRequestClose={() => setShowMediaPlayer(false)}>
        <View style={styles.mediaPlayerOverlay}>
          <View style={styles.mediaPlayerContainer}>
            <View style={styles.mediaPlayerHeader}>
              <Text style={styles.mediaPlayerTitle}>{mediaPlayerType === 'VIDEO' ? '🎥 Video Evidence' : '🎙️ Audio Evidence'}</Text>
              <TouchableOpacity onPress={() => setShowMediaPlayer(false)} style={styles.mediaPlayerClose}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {mediaPlayerType === 'VIDEO' ? (
              <Video
                source={{ uri: mediaPlayerUrl }}
                style={styles.videoPlayer}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                onError={(e) => {
                  console.log('[VideoPlayer] Error:', e);
                  Alert.alert('Playback Error', 'Could not play this video. The file may still be uploading or is corrupted.');
                  setShowMediaPlayer(false);
                }}
              />
            ) : (
              <View style={styles.audioPlayerBox}>
                <Text style={{ color: '#fff', textAlign: 'center', marginBottom: 16, fontSize: 16 }}>🎙️ Playing Audio Evidence...</Text>
                <Video
                  source={{ uri: mediaPlayerUrl }}
                  style={{ width: 0, height: 0 }}
                  useNativeControls={false}
                  shouldPlay
                  onError={() => Alert.alert('Playback Error', 'Could not play this audio.')}
                />
              </View>
            )}

            <TouchableOpacity style={styles.mediaPlayerCloseBtn} onPress={() => setShowMediaPlayer(false)}>
              <Text style={styles.mediaPlayerCloseBtnText}>CLOSE PLAYER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEvidencePasswordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify Access</Text>
            <Text style={styles.modalSub}>Enter your registration password to view evidence recordings.</Text>
            <TextInput style={styles.input} placeholder="Password" secureTextEntry value={evidencePassword} onChangeText={setEvidencePassword} />
            <TouchableOpacity style={styles.saveBtn} onPress={verifyEvidencePassword} disabled={verifyingEvidencePassword}>
              {verifyingEvidencePassword ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>VERIFY & OPEN</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowEvidencePasswordModal(false)}><Text style={styles.cancelTextLink}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showEvidenceModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.vaultHeader}>
              <Heart size={24} color="#6200ee" fill="#6200ee" />
              <Text style={styles.modalTitle}>Private Evidence Vault</Text>
            </View>
            <Text style={styles.modalSub}>Secure audio and video recordings from your emergency alerts.</Text>

            {evidenceLoading ? (
              <ActivityIndicator size="large" color="#6200ee" style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                {evidenceAlerts.length === 0 ? (
                  <View style={styles.emptyVault}>
                    <Shield color="#eee" size={80} />
                    <Text style={{ textAlign: 'center', color: '#999', marginTop: 10 }}>No recordings found in your vault.</Text>
                  </View>
                ) : (
                  evidenceAlerts.map((alert) => (
                    <View key={alert.id} style={styles.alertGroup}>
                      <View style={styles.alertGroupHeader}>
                        <Text style={styles.alertGroupDate}>{new Date(alert.createdAt).toLocaleString()}</Text>
                        <View style={[styles.statusBadge, { backgroundColor: alert.status === 'ACTIVE' ? '#FFEBEB' : '#E6F4EA' }]}>
                          <Text style={[styles.statusBadgeText, { color: alert.status === 'ACTIVE' ? '#FF4444' : '#1E8E3E' }]}>
                            {alert.status === 'ACTIVE' ? 'LIVE SOS' : 'RESOLVED'}
                          </Text>
                        </View>
                      </View>

                      {alert.evidence && alert.evidence.length > 0 ? (
                        <View style={styles.evidenceGrid}>
                          {alert.evidence.map((file, idx) => (
                            <View key={idx} style={styles.evidenceClipCard}>
                              <TouchableOpacity
                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                                onPress={() => {
                                  const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
                                  const fullUrl = file.fileUrl.startsWith('http') ? file.fileUrl : `${baseUrl}${file.fileUrl}`;
                                  setMediaPlayerUrl(fullUrl);
                                  setMediaPlayerType(file.fileType);
                                  setShowMediaPlayer(true);
                                }}
                              >
                                <View style={[styles.clipIcon, { backgroundColor: file.fileType === 'VIDEO' ? '#6200ee10' : '#FF174410' }]}>
                                  {file.fileType === 'VIDEO' ? <Camera color="#6200ee" size={20} /> : <Mic color="#FF1744" size={20} />}
                                </View>
                                <View style={styles.clipInfo}>
                                  <Text style={styles.clipTitle}>{file.fileType} Clip #{idx+1}</Text>
                                  <Text style={styles.clipTime}>{new Date(file.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                                </View>
                                <Volume2 color="#6200ee" size={16} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.saveToGalleryBtn, savingToGallery && styles.saveBtnDisabled]}
                                onPress={() => saveToGallery(file.fileUrl, file.fileType)}
                                disabled={savingToGallery}
                              >
                                <Text style={styles.saveToGalleryText}>
                                  {savingToGallery ? '...' : '⬇ Save'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.noMediaText}>No media recorded for this alert.</Text>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            <TouchableOpacity style={styles.closeVaultBtn} onPress={() => setShowEvidenceModal(false)}>
              <Text style={styles.closeVaultText}>EXIT VAULT</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const ActionItem = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress}>
    <View style={styles.actionIcon}>{icon}</View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const NewsCard = ({ title, content, time, type }) => (
  <View style={[styles.newsCard, type === 'ACCIDENT' && { borderColor: '#FF4444', borderWidth: 1 }]}>
    <View style={[styles.newsTagContainer, { backgroundColor: type === 'ACCIDENT' ? '#FF4444' : '#6200ee' }]}>
       <Text style={styles.newsTagWhite}>{type || 'NEWS'}</Text>
    </View>
    <Text style={styles.newsTitle}>{title}</Text>
    <Text style={styles.newsContent} numberOfLines={2}>{content}</Text>
    <Text style={styles.newsTime}>{time}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  dashboardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerWelcome: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  headerTagline: { fontSize: 12, color: '#888', marginTop: 2 },
  logoutIconButton: { padding: 8, backgroundColor: 'rgba(255, 68, 68, 0.05)', borderRadius: 12 },
  scrollContent: { padding: 20 },
  statusCard: { flexDirection: 'row', padding: 20, borderRadius: 20, alignItems: 'center', marginBottom: 30, backgroundColor: 'white', elevation: 4 },
  safeCard: { borderLeftWidth: 8, borderLeftColor: '#4CAF50' },
  dangerCard: { borderLeftWidth: 8, borderLeftColor: '#ff4d4d' },
  statusTextContainer: { marginLeft: 15 },
  statusTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  statusSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  sosContainer: { alignItems: 'center', marginBottom: 40 },
  sosButton: { width: 200, height: 200, borderRadius: 100, justifyContent: 'center', alignItems: 'center' },
  sosOuterRing: { width: 180, height: 180, borderRadius: 90, backgroundColor: '#ffebeb', justifyContent: 'center', alignItems: 'center' },
  sosInnerCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#ff4d4d', justifyContent: 'center', alignItems: 'center', elevation: 8 },
  sosText: { color: 'white', fontSize: 36, fontWeight: '900' },
  sosInstruction: { marginTop: 15, color: '#666', fontWeight: '500' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', marginBottom: 30, gap: 15 },
  actionItem: { width: '47%', backgroundColor: 'white', padding: 20, borderRadius: 20, alignItems: 'center', elevation: 2 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 15 },
  newsScroll: { marginBottom: 20 },
  newsCard: { width: 250, backgroundColor: 'white', padding: 15, borderRadius: 15, marginRight: 15, elevation: 2 },
  newsTagContainer: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginBottom: 8 },
  newsTagWhite: { color: 'white', fontSize: 9, fontWeight: '800' },
  newsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 5 },
  newsContent: { fontSize: 13, color: '#666', lineHeight: 18 },
  newsTime: { fontSize: 11, color: '#999', marginTop: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 25, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#6200ee' },
  modalSub: { fontSize: 13, color: '#666', marginBottom: 15 },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#6200ee', marginBottom: 5 },
  input: { backgroundColor: '#f0f0f5', height: 50, borderRadius: 12, paddingHorizontal: 15, color: '#333' },
  saveBtn: { height: 55, backgroundColor: '#6200ee', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cancelTextLink: { textAlign: 'center', color: '#999', fontSize: 14, marginTop: 15, fontWeight: 'bold' },
  dangerBanner: { marginHorizontal: 20, marginTop: 10, borderRadius: 15, overflow: 'hidden' },
  dangerGradient: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  dangerTextContent: { flex: 1 },
  dangerTitle: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  dangerSubTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },

  // AI Card Styles
  aiInsightCard: { marginBottom: 20, borderRadius: 20, overflow: 'hidden', elevation: 8 },
  aiGradient: { padding: 20 },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 },
  aiTitle: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  aiMeterRow: { flexDirection: 'row', alignItems: 'center' },
  meterInfo: { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.2)', paddingRight: 20, marginRight: 20 },
  meterValue: { color: '#FFF', fontSize: 32, fontWeight: '900' },
  meterLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 'bold' },
  aiAdvice: { flex: 1 },
  adviceText: { color: '#FFF', fontSize: 12, fontWeight: '600', lineHeight: 18 },

  // Vault Styles
  vaultHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  emptyVault: { padding: 40, alignItems: 'center' },
  alertGroup: { marginBottom: 20, backgroundColor: '#f8f9fa', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#eee' },
  alertGroupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  alertGroupDate: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusBadgeText: { fontSize: 10, fontWeight: '900' },
  evidenceGrid: { gap: 10 },
  evidenceClipCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 15, elevation: 1 },
  clipIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  clipInfo: { flex: 1 },
  clipTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  clipTime: { fontSize: 11, color: '#888', marginTop: 2 },
  noMediaText: { fontSize: 12, color: '#999', textAlign: 'center', padding: 10 },
  saveToGalleryBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  saveToGalleryText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  saveBtnDisabled: { backgroundColor: '#999' },
  closeVaultBtn: { backgroundColor: '#6200ee', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  closeVaultText: { color: '#FFF', fontWeight: 'bold', letterSpacing: 1 },

  // Media Player Styles
  mediaPlayerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  mediaPlayerContainer: { width: '100%', backgroundColor: '#1a1a2e', borderRadius: 24, overflow: 'hidden' },
  mediaPlayerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  mediaPlayerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  mediaPlayerClose: { padding: 4 },
  videoPlayer: { width: '100%', height: 250, backgroundColor: '#000' },
  audioPlayerBox: { padding: 40, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  mediaPlayerCloseBtn: { margin: 16, backgroundColor: '#6200ee', height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  mediaPlayerCloseBtnText: { color: '#FFF', fontWeight: 'bold', letterSpacing: 1 },
});
