import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
  Animated,
  Linking,
  Platform,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import {
  ShieldAlert,
  Map as MapIcon,
  User,
  MessageSquare,
  ShieldCheck,
  Shield,
  Navigation,
  PlusCircle,
  MapPin,
  Eye,
  AlertTriangle,
  BellRing,
  Newspaper,
  Zap,
  Activity,
  Home,
  Search,
  Heart,
  PlusSquare,
  MoreVertical,
  Phone,
  Home as HomeIcon,
  CheckCircle,
  Lock,
  ChevronRight,
  Globe,
  Bell,
  Settings,
  Edit2,
  Award,
  Trophy,
  LocateFixed,
  RotateCcw,
  Navigation2,
  ChevronLeft,
  Clock,
  Volume2,
  Play
} from 'lucide-react-native';
import MapView, { Marker, Polyline } from '../components/MapWrapper';
import * as Location from 'expo-location';
import { Camera as ExpoCamera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { useSafetyMonitor } from '../hooks/useSafetyMonitor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ensurePermission, PERMISSIONS } from '../utils/permissionHelper';

const { width, height } = Dimensions.get('window');

const suggestions = [
  'Sharp Turn',
  'No Street Lights',
  'High Crime Rate',
  'Deep Potholes',
  'Isolated Area',
  'Wild Animal Area',
  'Deep Water'
];

export default function BoysDashboard({ navigation }) {
  const { logout, userData } = useContext(AuthContext);
  const { t, lang, changeLanguage } = useContext(LanguageContext);
  const { theme, toggleTheme, themeMode } = useContext(ThemeContext);
  const { currentZone } = useSafetyMonitor();
  const insets = useSafeAreaInsets();

  const [news, setNews] = useState([]);
  const [isSOSLoading, setIsSOSLoading] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [sosPopup, setSosPopup] = useState(null);
  const notifiedAlerts = useRef(new Set());
  const [activeTab, setActiveTab] = useState('home');
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [hasNewNews, setHasNewNews] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: userData?.fullName || 'Secret Cop',
    mobile: userData?.mobile || '91XXXXXX78',
    address: userData?.address || 'Sindhudurg, Maharashtra'
  });

  const [showEvidencePasswordModal, setShowEvidencePasswordModal] = useState(false);
  const [evidencePassword, setEvidencePassword] = useState('');
  const [verifyingEvidencePassword, setVerifyingEvidencePassword] = useState(false);

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

  // Gallery save state
  const [galleryPermission, setGalleryPermission] = useState(null);
  const [savingToGallery, setSavingToGallery] = useState(false);

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
        'Please grant gallery permission in Settings to save evidence recordings.',
        [{ text: 'OK' }]
      );
    }
    return status === 'granted';
  };

  const saveToGallery = async (fileUrl, fileType) => {
    try {
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

      const downloadRes = await FileSystem.downloadAsync(fullUrl, localUri);
      if (!downloadRes.uri) {
        Alert.alert('Error', 'Failed to download file');
        setSavingToGallery(false);
        return;
      }

      const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);

      try {
        const albums = await MediaLibrary.getAlbumsAsync();
        const chetnaAlbum = albums.find(a => a.title === 'Chetna Evidence');
        if (chetnaAlbum) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], chetnaAlbum, false);
        } else {
          await MediaLibrary.createAlbumAsync('Chetna Evidence', asset, false);
        }
      } catch (albumErr) {
        console.warn('[BoysDashboard] Album error:', albumErr.message);
      }

      try { await FileSystem.deleteAsync(localUri, { idempotent: true }); } catch (e) {}

      Alert.alert('Saved!', `${fileType} evidence saved to your gallery under "Chetna Evidence" album.`);
    } catch (err) {
      console.error('[BoysDashboard] Save to gallery failed:', err);
      Alert.alert('Error', 'Failed to save to gallery.');
    } finally {
      setSavingToGallery(false);
    }
  };

  // Reporting States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('safe');
  const [reportReason, setReportReason] = useState('');
  const [locationType, setLocationType] = useState('live');
  const [userRank, setUserRank] = useState({ level: 5, awards: 12, points: 450 });

  // Map Picking & Recording
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [recordedPath, setRecordedPath] = useState([]); // Array of {lat, lng}
  const [isRecording, setIsRecording] = useState(false);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('06:00');
  const [caseCount, setCaseCount] = useState('0');
  const [selectedTags, setSelectedTags] = useState([]);
  const [mapRegion, setMapRegion] = useState({
    latitude: 16.0361,
    longitude: 73.5042,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  // 🔊 LIVE PATH RECORDER
  useEffect(() => {
    let recordWatcher;

    const startWatcher = async () => {
      if (isRecording) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        recordWatcher = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
          (l) => setRecordedPath(p => [...p, { latitude: l.coords.latitude, longitude: l.coords.longitude }])
        );
      }
    };

    startWatcher();
    return () => {
      recordWatcher && recordWatcher.remove();
    };
  }, [isRecording]);

  const smartSnap = async () => {
    if (recordedPath.length < 2) return;
    const start = recordedPath[0];
    const end = recordedPath[recordedPath.length - 1];

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(c => ({
          latitude: c[1],
          longitude: c[0]
        }));
        setRecordedPath(coords);
      }
    } catch (error) {
      console.log('Snap error:', error);
    }
  };

  useEffect(() => {
    if (!isRecording && recordedPath.length >= 2 && reportType === 'crime') {
      smartSnap();
    }
  }, [isRecording, recordedPath.length]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    let watchId;
    const startWatching = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      setMapRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      watchId = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (loc) => {
          const { latitude, longitude } = loc.coords;
          setMapRegion(prev => ({
            ...prev,
            latitude,
            longitude,
          }));

          // 📡 Update Live Radar for other users
          api.post('/safety/update-location', { latitude, longitude })
            .catch(e => console.log('Live Radar Sync Error:', e));
        }
      );
    };

    startWatching();
    return () => watchId && watchId.remove();
  }, []);

  const [leaderboard, setLeaderboard] = useState([]);
  const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);
  const [isLinkedParent, setIsLinkedParent] = useState(false);
  const [daughters, setDaughters] = useState([]);
  const [parentNotifications, setParentNotifications] = useState([]);
  const [pendingLinkRequests, setPendingLinkRequests] = useState([]);
  const [activeLinkPopup, setActiveLinkPopup] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userData?.id) return;
      try {
        const newsRes = await api.get('/news/latest').catch(() => null);
        if (newsRes?.data?.success) setNews(newsRes.data.news);

        const alertRes = await api.get('/alerts/nearby').catch(() => null);
        if (alertRes?.data?.success && Array.isArray(alertRes.data.alerts)) {
          const enriched = alertRes.data.alerts.map(a => ({
            ...a,
            location: `Lat: ${a.latitude?.toFixed(2) || '0'}, Lng: ${a.longitude?.toFixed(2) || '0'}`,
            distance: calculateDistance(mapRegion.latitude, mapRegion.longitude, a.latitude, a.longitude)
          }));
          setActiveAlerts(enriched);

          // 🚨 High Priority Popup for NEW alerts within 5km
          const newAlert = enriched.find(a => !notifiedAlerts.current.has(a.id) && a.distance <= 5);
          if (newAlert) {
            notifiedAlerts.current.add(newAlert.id);
            setSosPopup(newAlert);
          }
        }

        const leaderRes = await api.get('/admin/leaderboard').catch(() => null);
        if (leaderRes?.data?.success) setLeaderboard(leaderRes.data.leaderboard);

        const userRes = await api.get(`/auth/profile/${userData.id}`).catch(() => null);
        if (userRes?.data?.success) {
          setUserRank({
            level: userRes.data.user.level || 1,
            awards: userRes.data.user.awards || 0,
            points: userRes.data.user.points || 0
          });
          const linked = userRes.data.user.isLinkedParent || false;
          setIsLinkedParent(linked);
          setDaughters(userRes.data.user.daughters || []);
          const pendingReqs = userRes.data.user.pendingLinkRequests || [];
          setPendingLinkRequests(pendingReqs);

          // Pop-up pending confirmation modal if parent is online/opens dashboard
          if (pendingReqs.length > 0 && !activeLinkPopup) {
            setActiveLinkPopup(pendingReqs[0]);
          }

          if (linked) {
            const notifsRes = await api.get('/alerts/parent-notifications').catch(() => null);
            if (notifsRes?.data?.success) {
              const newNotifs = notifsRes.data.notifications || [];
              setParentNotifications(newNotifs);

              // 🚨 High Priority Pop-up Alert if any linked daughter has active SOS
              const activeSosNotif = newNotifs.find(n => n.alert && n.alert.status === 'ACTIVE');
              if (activeSosNotif) {
                if (!notifiedAlerts.current.has(activeSosNotif.alertId)) {
                  notifiedAlerts.current.add(activeSosNotif.alertId);
                  Alert.alert(
                    "🚨 DAUGHTER EMERGENCY!",
                    `Your linked daughter ${activeSosNotif.alert.user?.fullName} has triggered an SOS!`,
                    [
                      {
                        text: "TRACK NOW",
                        onPress: () => {
                          navigation.navigate('AINavigator', {
                            rescueMission: true,
                            targetCoords: {
                              latitude: activeSosNotif.alert.latitude,
                              longitude: activeSosNotif.alert.longitude,
                              name: activeSosNotif.alert.user?.fullName || 'Daughter'
                            }
                          });
                        }
                      },
                      { text: "Dismiss", style: "cancel" }
                    ]
                  );
                }
              }
            }
          }
        }
      } catch (e) {
        console.log("Sync Error:", e.message);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [userData?.id]);

  const handleRespondLink = async (request, action) => {
    try {
      const res = await api.post('/auth/respond-link-request', {
        contactId: request.id,
        action: action
      });

      if (res.data?.success) {
        Alert.alert("Link Request", res.data.message);
        setActiveLinkPopup(null);
        
        // Refresh profile immediately
        const userRes = await api.get(`/auth/profile/${userData.id}`).catch(() => null);
        if (userRes?.data?.success) {
          setIsLinkedParent(userRes.data.user.isLinkedParent || false);
          setDaughters(userRes.data.user.daughters || []);
          const pendingReqs = userRes.data.user.pendingLinkRequests || [];
          setPendingLinkRequests(pendingReqs);
        }
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Failed to process link request.");
    }
  };

  const handleManualSOS = async () => {
    if (isSOSLoading) return;
    setIsSOSLoading(true);

    try {
      console.log('--- SOS TRIGGER START ---');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to send SOS.');
        setIsSOSLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      console.log('Location captured:', location.coords.latitude, location.coords.longitude);

      const response = await api.post('/alerts/trigger', {
        userId: userData?.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        voiceTrigger: false
      });

      console.log('Server Response:', response.data);

      if (response.data?.success) {
        navigation.navigate('SOSTracking', { alertId: response.data.alertId });
      } else {
        throw new Error(response.data?.message || 'Server error');
      }
    } catch (e) {
      console.error('SOS Trigger Error:', e);
      Alert.alert('SOS Error', 'Unable to trigger emergency alert. Check your network.');
    } finally {
      setIsSOSLoading(false);
    }
  };

  const handleMapPress = (e) => {
    const coord = e.nativeEvent.coordinate;
    if (reportType === 'safe') {
      setSelectedPoint(coord);
    } else {
      // Add point to path
      setRecordedPath(prev => [...prev, coord]);
    }
  };

  const clearPath = () => {
    setRecordedPath([]);
    setSelectedPoint(null);
  };

  const handleReportSubmit = async () => {
    try {
      // 🛡️ PRO PERMISSION CHECK
      const hasLoc = await ensurePermission(PERMISSIONS.LOCATION);
      if (!hasLoc) return;

      let finalLat, finalLng, finalDestLat, finalDestLng;

      if (locationType === 'live') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeout: 5000
        });
        finalLat = location.coords.latitude;
        finalLng = location.coords.longitude;
      } else {
        if (reportType === 'crime' && recordedPath.length < 2) {
          Alert.alert("Missing Path", "Please record a path or mark points on the map.");
          return;
        }
        if (reportType === 'safe' && !selectedPoint) {
          Alert.alert("Missing Point", "Please tap on the map to mark the safe location.");
          return;
        }
        finalLat = reportType === 'crime' ? recordedPath[0].latitude : selectedPoint.latitude;
        finalLng = reportType === 'crime' ? recordedPath[0].longitude : selectedPoint.longitude;
        finalDestLat = reportType === 'crime' ? recordedPath[recordedPath.length - 1].latitude : null;
        finalDestLng = reportType === 'crime' ? recordedPath[recordedPath.length - 1].longitude : null;
      }

      const selectedType = selectedTags.includes('Sharp Turn') ? 'SHARP_TURN' :
                           selectedTags.includes('Wild Animal Area') ? 'ANIMAL_ZONE' :
                           selectedTags.includes('Deep Water') ? 'DEEP_WATER' :
                           selectedTags.includes('No Street Lights') ? 'DARK_AREA' : 'CRIME';

      const res = await api.post('/safety/suggest-hazard', {
        userId: userData.id,
        name: reportType === 'safe' ? 'Safe Location' : (selectedTags[0] || 'Danger Road'),
        latitude: finalLat,
        longitude: finalLng,
        destLatitude: finalDestLat,
        destLongitude: finalDestLng,
        pathData: reportType === 'crime' ? recordedPath : null,
        startTime,
        endTime,
        type: reportType === 'safe' ? 'SAFE_ZONE' : selectedType,
        description: reportReason,
        caseCount: caseCount
      });

      if (res.data.success) {
        Alert.alert("Success", res.data.message, [
          {
            text: "OK", onPress: () => {
              setShowReportModal(false);
              setReportReason('');
              setSelectedPoint(null);
              setRecordedPath([]);
              setCaseCount('0');
              setSelectedTags([]);
            }
          }
        ]);
      }
    } catch (error) {
      console.error('Report Submit Error:', error);
      if (error.response) {
        // Server responded with an error (e.g. 500, 404)
        Alert.alert("Server Error", error.response.data?.message || "Internal server error. Please try again.");
      } else if (error.request) {
        // No response from server (Network issue)
        Alert.alert("Network Error", "No response from server. Check your internet connection.");
      } else {
        // Location or logic error
        Alert.alert("Report Error", error.message || "Failed to submit report. Please check GPS permissions.");
      }
    }
  };

  const handleSharpTurn = async () => {
    try {
      const hasLoc = await ensurePermission(PERMISSIONS.LOCATION);
      if (!hasLoc) return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 5000
      });

      const res = await api.post('/safety/suggest-hazard', {
        userId: userData.id,
        name: 'Sharp Turn',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        type: 'SHARP_TURN',
        description: 'Auto-reported sharp turn with live location',
        caseCount: '0'
      });

      if (res.data.success) {
        Alert.alert("Captured 🛰️", "Sharp Turn live location sent for Admin verification!");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to report sharp turn. Check your GPS.");
    }
  };


  const handleRescue = async (alert) => {
    try {
      const res = await api.post('/alerts/respond', {
        alertId: alert.id,
        helperId: userData.id,
        status: 'ACCEPTED'
      });

      if (res.data.success) {
        setSosPopup(null);
        // Open AINavigator with victim coordinates
        navigation.navigate('AINavigator', {
           rescueMission: true,
           targetCoords: { latitude: alert.latitude, longitude: alert.longitude, name: alert.user?.fullName || 'Victim' }
        });
      }
    } catch (e) {
      Alert.alert("Rescue Error", "Could not accept rescue request.");
    }
  };

  const handleProfileUpdate = () => {
    setShowOtpModal(true);
    // In real app, call API to send OTP here
  };

  const verifyOtpAndSave = () => {
    setShowOtpModal(false);
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully!');
  };

  const renderParentEmergencySection = () => {
    if (!isLinkedParent) return null;

    return (
      <View style={[styles.parentPortalCard, { backgroundColor: theme.card, borderColor: '#FF416C' }]}>
        <LinearGradient colors={['#FF416C', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.parentHeaderGrad}>
          <Heart color="#FFF" size={20} fill="#FFF" />
          <Text style={styles.parentPortalTitle}>Parent Emergency Portal</Text>
        </LinearGradient>

        <View style={styles.parentPortalContent}>
          <Text style={[styles.daughtersListText, { color: theme.text }]}>
            Linked Daughters: {daughters.map(d => `${d.fullName} (${d.relationship})`).join(', ') || 'None'}
          </Text>

          {/* Active / Pending SOS Alerts */}
          {parentNotifications.length > 0 ? (
            parentNotifications.map((notif, idx) => {
              const alert = notif.alert;
              if (!alert) return null;
              const isAlertActive = alert.status === 'ACTIVE';

              return (
                <View key={idx} style={[styles.daughterAlertCard, { borderColor: isAlertActive ? '#FF3B30' : theme.border }]}>
                  <View style={styles.daughterHeader}>
                    <Text style={[styles.daughterName, { color: theme.text }]}>{alert.user?.fullName}</Text>
                    <View style={[styles.statusIndicator, { backgroundColor: isAlertActive ? '#FF3B30' : '#4CAF50' }]}>
                      <Text style={styles.statusIndicatorText}>{alert.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.alertDetailTime}>Triggered: {new Date(alert.createdAt).toLocaleString()}</Text>

                  {/* If active, show button to monitor live */}
                  {isAlertActive && (
                    <TouchableOpacity
                      style={styles.monitorBtn}
                      onPress={() => {
                        navigation.navigate('AINavigator', {
                          rescueMission: true,
                          targetCoords: {
                            latitude: alert.latitude,
                            longitude: alert.longitude,
                            name: alert.user?.fullName || 'Daughter'
                          }
                        });
                      }}
                    >
                      <Navigation2 size={16} color="#FFF" />
                      <Text style={styles.monitorBtnText}>Track Live GPS Map</Text>
                    </TouchableOpacity>
                  )}

                  {/* Evidence Viewer if any uploads exist */}
                  {alert.evidence && alert.evidence.length > 0 && (
                    <View style={styles.mediaEvidenceSection}>
                      <Text style={[styles.evidenceSectionTitle, { color: theme.text }]}>Private Media Evidence ({alert.evidence.length})</Text>
                      {alert.evidence.map((file, fIdx) => (
                        <View key={fIdx} style={styles.evidenceFileItem}>
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}
                            onPress={() => {
                              const baseUrl = api.defaults.baseURL.replace('/api', '');
                              const fullUrl = `${baseUrl}${file.fileUrl}`;
                              Linking.openURL(fullUrl);
                            }}
                          >
                            <Play color="#6200ee" size={14} fill="#6200ee" />
                            <Text style={styles.evidenceFileText}>Play {file.fileType} recording</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.saveToGalleryBtn, savingToGallery && { backgroundColor: '#999' }]}
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
                  )}
                </View>
              );
            })
          ) : (
            <Text style={styles.noDaughterAlertsText}>No emergency history recorded.</Text>
          )}
        </View>
      </View>
    );
  };

  // --- SUB-VIEWS ---

  const renderHome = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* Parent Emergency Portal */}
      {renderParentEmergencySection()}

      {/* SOS & Map Buttons */}
      <View style={{ marginTop: 10 }}>
        <TouchableOpacity style={styles.bigSos} onPress={handleManualSOS} disabled={isSOSLoading}>
          <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.sosGradient}>
            <ShieldAlert color="#FFF" size={40} />
            <Text style={styles.sosMainText}>{t('manual_sos')}</Text>
            <Text style={styles.sosSubText}>{t('emergency_alert')}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mapBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => navigation.navigate('AdminRedZones')}
        >
          <View style={[styles.mapIconBox, { backgroundColor: '#3B82F620' }]}>
            <MapPin color="#3B82F6" size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.mapBtnTitle, { color: theme.text }]}>{t('live_map')}</Text>
            <Text style={styles.mapBtnSub}>{t('active_zones')}</Text>
          </View>
          <Zap color={theme.primary} size={20} />
        </TouchableOpacity>

        {/* 💎 GLASS ALERT CONTAINER */}
        <View style={[styles.glassContainer, { backgroundColor: theme.card + '90', borderColor: theme.border }]}>
          {activeAlerts.length > 0 ? (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.criticalTitle}>{t('nearby_alerts')}</Text>
                <Activity color="#EF4444" size={16} />
              </View>
               {activeAlerts.map((alert, i) => (
                 <TouchableOpacity key={i} style={[styles.criticalCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                   <View style={styles.alertHeader}>
                     <View style={styles.alertUser}>
                       <View style={styles.alertDot} />
                       <Text style={[styles.alertUserName, { color: theme.text }]}>
                         {alert.user?.fullName || 'Someone'} {lang === 'mr' ? 'मदत हवी आहे' : 'NEEDS HELP'}
                       </Text>
                     </View>
                     <Text style={styles.alertTime}>{lang === 'mr' ? 'आता' : 'NOW'}</Text>
                   </View>
                   <Text style={styles.alertLoc}>
                     <MapPin size={12} color="#EF4444" /> {alert.location} ({alert.distance ? (alert.distance < 1 ? `${(alert.distance * 1000).toFixed(0)}m` : `${alert.distance.toFixed(1)}km`) : '...'} away)
                   </Text>
                   <TouchableOpacity style={styles.actionBtn} onPress={() => handleRescue(alert)}><Text style={styles.actionBtnText}>{t('rescue')}</Text></TouchableOpacity>
                 </TouchableOpacity>
               ))}
            </View>
          ) : (
            <View style={styles.emptyGlass}>
              <BellRing size={20} color={theme.subtext} />
              <Text style={styles.emptyGlassText}>{t('no_alerts')}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const [nearbyCops, setNearbyCops] = useState([]);
  const [loadingRadar, setLoadingRadar] = useState(false);

  const fetchNearbyCops = async () => {
    try {
      setLoadingRadar(true);
      const res = await api.get('/admin/verified-secret-cops'); // Reuse the admin endpoint for now
      if (res.data.success) {
        setNearbyCops(res.data.users.filter(u => u.id !== userData?.id));
      }
    } catch (e) {
      console.log('Radar Fetch Error:', e);
    } finally {
      setLoadingRadar(false);
    }
  };

  useEffect(() => {
    let interval;
    if (activeTab === 'search') {
      fetchNearbyCops();
      interval = setInterval(fetchNearbyCops, 10000); // Update radar every 10 seconds
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  const renderRadar = () => (
    <View style={styles.tabView}>
      <View style={styles.radarHeader}>
        <View>
          <Text style={[styles.tabTitle, { color: theme.text }]}>{t('radar')}</Text>
          <Text style={styles.tabSub}>{t('nearby_helpers')}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchNearbyCops}>
          <RotateCcw size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.radarMapContainer}>
        <MapView
          style={styles.radarMap}
          initialRegion={mapRegion}
          theme={themeMode === 'dark' ? 'dark' : 'light'}
        >
          {/* Current User */}
          <Marker
            coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }}
            title={t('you')}
          >
            <View style={[styles.copMarker, styles.myMarker]}>
              <User size={14} color="#000" />
            </View>
          </Marker>

          {/* Other Cops */}
          {nearbyCops.filter(u => u.latitude && u.longitude).map(cop => (
            <Marker
              key={cop.id}
              coordinate={{ 
                latitude: parseFloat(cop.latitude), 
                longitude: parseFloat(cop.longitude) 
              }}
              title={cop.fullName}
              description={`${cop.profession} • ${cop.status === 'LIVE' ? '📡 LIVE' : '🏠 BASE'}`}
            >
              <View style={[
                styles.copMarker, 
                { backgroundColor: cop.status === 'LIVE' ? '#10B981' : '#3B82F6' }
              ]}>
                <User size={14} color="#FFF" />
              </View>
            </Marker>
          ))}
        </MapView>
        
        <View style={styles.radarOverlay}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.primary }]}>{nearbyCops.length}</Text>
              <Text style={styles.statLabel}>{t('nearby_helpers')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#EF4444' }]}>{activeAlerts.length}</Text>
              <Text style={styles.statLabel}>{t('active_alerts')}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPlus = () => (
    <ScrollView style={styles.tabView} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>{t('intel_hub')}</Text>
      <Text style={styles.tabSub}>{t('rank_warning')}</Text>

      <TouchableOpacity
        style={styles.reportCard}
        onPress={() => { setReportType('safe'); setShowReportModal(true); }}
      >
        <LinearGradient colors={['#10B981', '#059669']} style={styles.reportGradient}>
          <ShieldCheck color="#FFF" size={24} />
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={styles.reportTitle}>{t('report_safe')}</Text>
            <Text style={styles.reportSub}>{lang === 'mr' ? 'इतरांना सुरक्षित ठिकाणे शोधण्यात मदत करा' : 'Help others find safety points'}</Text>
          </View>
          <ChevronRight color="#FFF" size={20} />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.reportCard}
        onPress={() => { setReportType('crime'); setShowReportModal(true); }}
      >
        <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.reportGradient}>
          <AlertTriangle color="#FFF" size={24} />
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={styles.reportTitle}>{t('report_crime')}</Text>
            <Text style={styles.reportSub}>{lang === 'mr' ? 'मॅपिंगसाठी धोक्याचे रस्ते चिन्हांकित करा' : 'Trace danger roads for mapping'}</Text>
          </View>
          <ChevronRight color="#FFF" size={20} />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.reportCard}
        onPress={handleSharpTurn}
      >
        <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.reportGradient}>
          <RotateCcw color="#FFF" size={24} />
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={styles.reportTitle}>{t('quick_turn')}</Text>
            <Text style={styles.reportSub}>{lang === 'mr' ? 'धोकादायक वळणाची त्वरित नोंद करा' : 'Report dangerous turn instantly'}</Text>
          </View>
          <Zap color="#FFF" size={20} />
        </LinearGradient>
      </TouchableOpacity>

      {/* RANK CARD */}
      <View style={[styles.rankHub, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.rankItem}>
          <Award color={theme.primary} size={24} />
          <Text style={[styles.rankVal, { color: theme.text }]}>{userRank.level}</Text>
          <Text style={styles.rankLab}>{t('level')}</Text>
        </View>
        <View style={styles.rankDivider} />
        <View style={styles.rankItem}>
          <Trophy color="#F59E0B" size={24} />
          <Text style={[styles.rankVal, { color: theme.text }]}>{userRank.points}</Text>
          <Text style={styles.rankLab}>{t('points_label')}</Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderProfile = () => (
    <ScrollView style={styles.tabView} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        {userData?.isVerified ? (
          <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.honorBadge}>
            <ShieldCheck color="#FFF" size={14} />
            <Text style={styles.honorText}>VERIFIED SECRET COP</Text>
          </LinearGradient>
        ) : userData?.isSecretCopPending ? (
          <View style={[styles.honorBadge, { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}>
            <Clock color="#F59E0B" size={14} />
            <Text style={[styles.honorText, { color: '#F59E0B' }]}>PENDING VERIFICATION</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.honorBadge, { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }]}
            onPress={() => navigation.navigate('SecretCopRegister')}
          >
            <Shield color="#3B82F6" size={14} />
            <Text style={[styles.honorText, { color: '#3B82F6' }]}>APPLY FOR SECRET COP</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.bigAvatar, { backgroundColor: theme.primary }]}>
          <Text style={styles.avatarInitial}>{userData?.fullName?.[0] || 'C'}</Text>
        </View>
        <Text style={[styles.profileName, { color: theme.text }]}>{profileForm.fullName}</Text>
      </View>

      {/* 🏆 REWARDS & RANK */}
      <View style={[styles.rankHub, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.rankItem}>
          <Award color="#F59E0B" size={24} />
          <Text style={[styles.rankVal, { color: theme.text }]}>{userRank.level}</Text>
          <Text style={styles.rankLab}>LEVEL</Text>
        </View>
        <View style={styles.rankDivider} />
        <View style={styles.rankItem}>
          <Trophy color="#8B5CF6" size={24} />
          <Text style={[styles.rankVal, { color: theme.text }]}>{userRank.awards}</Text>
          <Text style={styles.rankLab}>AWARDS</Text>
        </View>
      </View>

      {/* 🏁 LEADERBOARD PREVIEW */}
      <TouchableOpacity 
        style={styles.leaderboardBox} 
        onPress={() => setShowFullLeaderboard(true)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <Text style={styles.hubTitle}>TOP SECRET COPS</Text>
          <Text style={{ fontSize: 10, color: theme.primary, fontWeight: 'bold' }}>VIEW ALL</Text>
        </View>
        
        {leaderboard.slice(0, 3).map((cop, idx) => (
          <View key={cop.id} style={styles.leaderRow}>
            <Text style={[styles.leaderRank, { color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : '#CD7F32' }]}>
              #{idx + 1}
            </Text>
            <Text style={[styles.leaderName, { color: theme.text }]}>{cop.fullName}</Text>
            <View style={styles.leaderStats}>
              <Text style={styles.leaderLevel}>Lvl {cop.level}</Text>
              <Text style={styles.leaderPoints}>{cop.points} pts</Text>
            </View>
          </View>
        ))}

        {leaderboard.length === 0 && (
          <Text style={{ color: theme.subtext, fontSize: 12, textAlign: 'center' }}>No verified cops yet</Text>
        )}
      </TouchableOpacity>

      {/* FULL LEADERBOARD MODAL */}
      <Modal visible={showFullLeaderboard} animationType="slide">
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.navTop, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowFullLeaderboard(false)}>
              <ChevronLeft color={theme.text} size={28} />
            </TouchableOpacity>
            <Text style={[styles.logoText, { color: theme.text }]}>Hall of Fame</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={styles.leaderboardHeader}>
              <Trophy color="#F59E0B" size={40} />
              <Text style={[styles.leaderTitle, { color: theme.text }]}>Sindhudurg's Best</Text>
              <Text style={styles.leaderSub}>Ranked by bravery and reports</Text>
            </View>

            {leaderboard.map((cop, idx) => (
              <View key={cop.id} style={[styles.fullLeaderRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.rankBadge, { backgroundColor: idx < 3 ? '#F59E0B20' : 'transparent' }]}>
                  <Text style={[styles.rankText, { color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : theme.subtext }]}>
                    #{idx + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={[styles.fullLeaderName, { color: theme.text }]}>{cop.fullName}</Text>
                  <Text style={styles.fullLeaderLevel}>Veteran Secret Cop • Level {cop.level}</Text>
                </View>
                <View style={styles.pointsBadge}>
                  <Text style={styles.pointsText}>{cop.points} XP</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <View style={styles.profileForm}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{lang === 'mr' ? 'पूर्ण नाव' : 'FULL NAME'}</Text>
          <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <User size={18} color={theme.subtext} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={profileForm.fullName}
              editable={isEditing}
              onChangeText={(t) => setProfileForm({ ...profileForm, fullName: t })}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{lang === 'mr' ? 'मोबाईल नंबर' : 'MOBILE NUMBER'}</Text>
          <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Phone size={18} color={theme.subtext} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={profileForm.mobile}
              editable={isEditing}
              keyboardType="phone-pad"
              onChangeText={(t) => setProfileForm({ ...profileForm, mobile: t })}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{lang === 'mr' ? 'पत्ता' : 'ADDRESS'}</Text>
          <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <MapPin size={18} color={theme.subtext} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={profileForm.address}
              editable={isEditing}
              onChangeText={(t) => setProfileForm({ ...profileForm, address: t })}
            />
            {isEditing && (
              <TouchableOpacity 
                style={styles.gpsCaptureBtn} 
                onPress={async () => {
                  const loc = await Location.getCurrentPositionAsync({});
                  setProfileForm({ 
                    ...profileForm, 
                    latitude: loc.coords.latitude, 
                    longitude: loc.coords.longitude 
                  });
                  Alert.alert("📍 Location Captured", "Your current GPS coordinates are now set as your Home Base.");
                }}
              >
                <LocateFixed size={18} color={theme.primary} />
              </TouchableOpacity>
            )}
          </View>
          {profileForm.latitude && profileForm.longitude && (
            <Text style={{ fontSize: 10, color: '#10B981', marginTop: 5, fontWeight: 'bold' }}>
              🎯 GPS Locked: {profileForm.latitude.toFixed(4)}, {profileForm.longitude.toFixed(4)}
            </Text>
          )}
        </View>

        <View style={[styles.settingsHub, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={styles.hubTitle}>{t('settings')}</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.toggleBtn, lang === 'en' && { backgroundColor: theme.primary }]}
              onPress={() => changeLanguage('en')}
            >
              <Text style={[styles.toggleText, { color: lang === 'en' ? '#000' : theme.text }]}>English</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, lang === 'mr' && { backgroundColor: theme.primary }]}
              onPress={() => changeLanguage('mr')}
            >
              <Text style={[styles.toggleText, { color: lang === 'mr' ? '#000' : theme.text }]}>मराठी</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, lang === 'hi' && { backgroundColor: theme.primary }]}
              onPress={() => changeLanguage('hi')}
            >
              <Text style={[styles.toggleText, { color: lang === 'hi' ? '#000' : theme.text }]}>हिन्दी</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.settingRow, { marginTop: 20 }]} onPress={toggleTheme}>
            <View style={styles.settingIcon}><Zap size={18} color={theme.primary} /></View>
            <Text style={[styles.settingText, { color: theme.text }]}>{t('dark_mode')}: {themeMode.toUpperCase()}</Text>
            <ChevronRight size={16} color={theme.subtext} />
          </TouchableOpacity>
        </View>

        {!isEditing ? (
          <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.primary }]} onPress={() => setIsEditing(true)}>
            <Edit2 color="#000" size={20} />
            <Text style={styles.editBtnText}>{lang === 'mr' ? 'प्रोफाइल संपादित करा' : 'Edit Profile'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.saveBtn} onPress={handleProfileUpdate}>
            <CheckCircle color="#FFF" size={20} />
            <Text style={styles.saveBtnText}>{lang === 'mr' ? 'बदल जतन करा' : 'Save Changes'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>{lang === 'mr' ? 'लॉगआउट' : 'Logout Session'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.navTop, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => { setShowNewsModal(true); setHasNewNews(false); }} style={styles.newsBtn}>
          <Newspaper color={theme.text} size={24} />
          {hasNewNews && (
            <LinearGradient
              colors={['#FF00FF', '#EF4444', '#8B5CF6', '#000000']}
              style={styles.newsBadge}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
          )}
        </TouchableOpacity>
        <Text style={[styles.logoText, { color: theme.text }]}>Chetna</Text>
        <TouchableOpacity onPress={() => setActiveTab('profile')}><User color={theme.primary} size={24} /></TouchableOpacity>
      </View>

      {/* 🚨 SOS RESCUE POPUP MODAL */}
      <Modal visible={!!sosPopup} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#FF4B2B', '#FF416C']} style={styles.sosPopupBox}>
            <ShieldAlert color="#FFF" size={50} style={{ alignSelf: 'center' }} />
            <Text style={styles.sosPopupTitle}>EMERGENCY ALERT!</Text>
            <Text style={styles.sosPopupName}>{sosPopup?.user?.fullName || 'Someone'} needs immediate help.</Text>
            <View style={styles.sosPopupInfo}>
              <MapPin color="#FFF" size={16} />
              <Text style={styles.sosPopupDist}>Located {sosPopup?.distance?.toFixed(1)}km away</Text>
            </View>

            <TouchableOpacity style={styles.rescueBtn} onPress={() => handleRescue(sosPopup)}>
              <Text style={styles.rescueBtnText}>ACCEPT RESCUE MISSION</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setSosPopup(null)}>
              <Text style={styles.ignoreLink}>IGNORE (Not available)</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* 🔗 LINK CONFIRMATION POPUP MODAL */}
      <Modal visible={!!activeLinkPopup} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.sosPopupBox}>
            <User color="#FFF" size={50} style={{ alignSelf: 'center' }} />
            <Text style={styles.sosPopupTitle}>LINK REQUEST</Text>
            <Text style={styles.sosPopupName}>
              Girl {activeLinkPopup?.daughterName} is trying to link her account with you as {activeLinkPopup?.relationship}.
            </Text>
            <Text style={{ color: '#FFF', fontSize: 12, textAlign: 'center', opacity: 0.8, marginTop: 10 }}>
              This allows her to share live location and audio/video files with you during emergencies.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 25 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#FFF', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                onPress={() => handleRespondLink(activeLinkPopup, 'approve')}
              >
                <Text style={{ color: '#6D28D9', fontWeight: '900', fontSize: 14 }}>AGREE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' }}
                onPress={() => handleRespondLink(activeLinkPopup, 'reject')}
              >
                <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14 }}>DENY</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* ⚠️ LIVE DANGER ZONE BANNER */}
      {currentZone && (
        <TouchableOpacity
          style={styles.dangerBanner}
          activeOpacity={0.9}
          onPress={() => Alert.alert(currentZone.name, currentZone.description || currentZone.warningMessage)}
        >
          <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.dangerGradient} start={{x:0, y:0}} end={{x:1, y:0}}>
            <AlertTriangle color="#FFF" size={20} />
            <View style={styles.dangerTextContent}>
              <Text style={styles.dangerTitle}>{currentZone.name.toUpperCase()}</Text>
              <Text style={styles.dangerSubTitle}>{currentZone.warningMessage || 'Entering High Risk Area'}</Text>
            </View>
            <Volume2 color="#FFF" size={20} />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* 🚀 Tab Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && renderHome()}
        {activeTab === 'search' && renderRadar()}
        {activeTab === 'plus' && renderPlus()}
        {activeTab === 'profile' && renderProfile()}
      </View>

      {/* 🧭 Bottom Nav */}
      <View style={[styles.bottomNav, { backgroundColor: themeMode === 'dark' ? '#1a1a2e' : '#FFFFFF', borderTopColor: theme.border, bottom: insets.bottom > 0 ? insets.bottom : 0, paddingBottom: 10 }]}>
        <TouchableOpacity onPress={() => setActiveTab('home')} style={styles.navItem}>
          <HomeIcon color={activeTab === 'home' ? theme.primary : theme.subtext} size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('search')} style={styles.navItem}>
          <Eye color={activeTab === 'search' ? theme.primary : theme.subtext} size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('plus')} style={styles.navItem}>
          <PlusSquare color={activeTab === 'plus' ? theme.primary : theme.subtext} size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('AINavigator')} style={styles.navItem}>
          <Navigation color={theme.subtext} size={24} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('profile')} style={styles.navItem}>
          <User color={activeTab === 'profile' ? theme.primary : theme.subtext} size={24} />
        </TouchableOpacity>
      </View>

      {/* 📝 REPORT MODAL */}
      <Modal visible={showReportModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={{ width: '100%', height: '100%' }}>
            <View style={[styles.modalHeader, { backgroundColor: theme.card }]}>
              <TouchableOpacity onPress={() => setShowReportModal(false)} style={styles.backBtn}>
                <ChevronLeft color={theme.text} size={28} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {reportType === 'safe' ? t('report_safe') : t('report_crime')}
              </Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
              style={{ backgroundColor: theme.background }}
            >
              <Text style={[styles.modalSub, { textAlign: 'left', marginBottom: 20 }]}>{t('rank_warning')}</Text>

              {/* LOCATION SELECTOR */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>{lang === 'mr' ? 'स्थान निवडा' : 'SELECT LOCATION'}</Text>
                <View style={styles.locationToggle}>
                  <TouchableOpacity
                    style={[styles.toggleBtn, locationType === 'live' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => setLocationType('live')}
                  >
                    <LocateFixed color={locationType === 'live' ? '#000' : theme.subtext} size={18} />
                    <Text style={[styles.toggleText, { color: locationType === 'live' ? '#000' : theme.subtext }]}>{lang === 'mr' ? 'थेट स्थान' : 'Live GPS'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.toggleBtn, locationType === 'manual' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => { setLocationType('manual'); setShowMapPicker(true); }}
                  >
                    <MapIcon color={locationType === 'manual' ? '#000' : theme.subtext} size={18} />
                    <Text style={[styles.toggleText, { color: locationType === 'manual' ? '#000' : theme.subtext }]}>{lang === 'mr' ? 'नकाशावरून' : 'Map Select'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {locationType === 'manual' && (
                <View style={[styles.inputGroup, { marginTop: 10 }]}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>{t('visual_mapping')}</Text>
                  {reportType === 'safe' ? (
                    <TouchableOpacity style={styles.mapSelector} onPress={() => setShowMapPicker(true)}>
                      <View style={styles.mapPreviewInfo}>
                        <MapPin size={22} color={selectedPoint ? '#EF4444' : theme.subtext} />
                        <View style={{ marginLeft: 15 }}>
                          <Text style={[styles.coordinateText, { color: theme.text }]}>
                            {selectedPoint?.latitude && selectedPoint?.longitude ? `${selectedPoint.latitude.toFixed(4)}, ${selectedPoint.longitude.toFixed(4)}` : (lang === 'mr' ? 'क्षेत्र निवडलेले नाही' : 'No Area Selected')}
                          </Text>
                          <Text style={styles.coordinateSubText}>{lang === 'mr' ? 'असुरक्षित केंद्र सेट करण्यासाठी टॅप करा' : 'Tap to set unsafe center'}</Text>
                        </View>
                      </View>
                      <ChevronRight size={20} color={theme.subtext} />
                    </TouchableOpacity>
                  ) : (
                    <View style={{ gap: 12 }}>
                      <TouchableOpacity style={styles.mapSelector} onPress={() => setShowMapPicker(true)}>
                        <View style={styles.mapPreviewInfo}>
                          <View style={[styles.pointDot, { backgroundColor: recordedPath.length > 0 ? '#F59E0B' : theme.subtext }]} />
                          <View style={{ marginLeft: 15 }}>
                            <Text style={[styles.coordinateText, { color: theme.text }]}>
                              {recordedPath.length > 0 && recordedPath[0]?.latitude ? (lang === 'mr' ? 'सुरुवात बिंदू' : 'Start Point') : (lang === 'mr' ? 'सुरुवात बिंदू नाही' : 'No Start Point')}
                            </Text>
                            <Text style={styles.coordinateSubText}>{recordedPath.length > 0 && recordedPath[0]?.latitude ? `${recordedPath[0].latitude.toFixed(4)}, ${recordedPath[0].longitude.toFixed(4)}` : (lang === 'mr' ? 'सुरुवात करण्यासाठी टॅप करा' : 'Tap to set start')}</Text>
                          </View>
                        </View>
                        <ChevronRight size={20} color={theme.subtext} />
                      </TouchableOpacity>

                      <TouchableOpacity style={styles.mapSelector} onPress={() => setShowMapPicker(true)}>
                        <View style={styles.mapPreviewInfo}>
                          <View style={[styles.pointDot, { backgroundColor: recordedPath.length > 1 ? '#EF4444' : theme.subtext }]} />
                          <View style={{ marginLeft: 15 }}>
                            <Text style={[styles.coordinateText, { color: theme.text }]}>
                              {recordedPath.length > 1 && recordedPath[recordedPath.length - 1]?.latitude ? (lang === 'mr' ? 'अंतिम बिंदू' : 'End Point') : (lang === 'mr' ? 'अंतिम बिंदू नाही' : 'No End Point')}
                            </Text>
                            <Text style={styles.coordinateSubText}>{recordedPath.length > 1 && recordedPath[recordedPath.length - 1]?.latitude ? `${recordedPath[recordedPath.length - 1].latitude.toFixed(4)}, ${recordedPath[recordedPath.length - 1].longitude.toFixed(4)}` : (lang === 'mr' ? 'पूर्ण रस्ता चिन्हांकित करा' : 'Trace full road')}</Text>
                          </View>
                        </View>
                        <ChevronRight size={20} color={theme.subtext} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.timeSection}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>{lang === 'mr' ? 'धोक्याची वेळ (पर्यायी)' : 'DANGER TIMING (OPTIONAL)'}</Text>
                <View style={styles.timeRow}>
                  <View style={[styles.timeInputGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Clock size={16} color={theme.primary} />
                    <TextInput
                      style={[styles.timeInput, { color: theme.text }]}
                      placeholder="10 PM"
                      placeholderTextColor={theme.subtext}
                      value={startTime}
                      onChangeText={setStartTime}
                    />
                  </View>
                  <Text style={{ color: theme.subtext, fontWeight: 'bold' }}>-</Text>
                  <View style={[styles.timeInputGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Clock size={16} color={theme.primary} />
                    <TextInput
                      style={[styles.timeInput, { color: theme.text }]}
                      placeholder="4 AM"
                      placeholderTextColor={theme.subtext}
                      value={endTime}
                      onChangeText={setEndTime}
                    />
                  </View>
                </View>
              </View>

              {/* CASES FILED & LEGEND */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>{t('cases_filed')}</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <AlertTriangle size={20} color={theme.primary} />
                  <TextInput
                    style={[styles.input, { color: theme.text, fontSize: 18, fontWeight: 'bold' }]}
                    placeholder="0"
                    placeholderTextColor={theme.subtext}
                    keyboardType="numeric"
                    value={caseCount}
                    onChangeText={setCaseCount}
                  />
                </View>

                {/* DYNAMIC RISK LEGEND DIRECTLY BELOW */}
                <View style={[styles.riskLegendBox, { backgroundColor: theme.card + '50', borderColor: theme.border }]}>
                  <View style={styles.riskItem}>
                    <View style={[styles.riskDot, { backgroundColor: '#10B981' }]} />
                    <Text style={[styles.riskText, { color: '#10B981' }]}>0-10: {lang === 'mr' ? 'सुरक्षित (हिरवा)' : 'SAFE AREA (GREEN)'}</Text>
                  </View>
                  <View style={styles.riskItem}>
                    <View style={[styles.riskDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.riskText, { color: '#F59E0B' }]}>11-20: {lang === 'mr' ? 'चेतावणी (नारिंगी)' : 'WARNING (ORANGE)'}</Text>
                  </View>
                  <View style={styles.riskItem}>
                    <View style={[styles.riskDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={[styles.riskText, { color: '#EF4444' }]}>21+: {lang === 'mr' ? 'धोकादायक (लाल)' : 'DANGER ZONE (RED)'}</Text>
                  </View>
                </View>
              </View>

              <View style={{ marginTop: 10 }}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>{lang === 'mr' ? 'त्वरीत सूचना' : 'QUICK SUGGESTIONS'}</Text>
                <View style={styles.suggestRow}>
                  {['Sharp Turn', 'No Street Lights', 'High Crime Rate', 'Deep Potholes', 'Isolated Area', 'Wild Animal Area', 'Deep Water'].map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.suggestTag, selectedTags.includes(s) && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                      onPress={() => {
                        setSelectedTags(prev => {
                          const newTags = prev.includes(s) ? prev.filter(t => t !== s) : [...prev, s];
                          setReportReason(newTags.join(', '));
                          return newTags;
                        });
                      }}
                    >
                      <Text style={[styles.suggestTagText, selectedTags.includes(s) && { color: '#000' }]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.text }]}>{lang === 'mr' ? 'तपशीलवार वर्णन' : 'DETAILED DESCRIPTION'}</Text>
                <TextInput
                  style={[styles.reasonInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                  placeholder={lang === 'mr' ? 'येथे लिहा...' : 'Explain the danger here...'}
                  placeholderTextColor={theme.subtext}
                  multiline
                  value={reportReason}
                  onChangeText={setReportReason}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                onPress={handleReportSubmit}
              >
                <Text style={styles.submitBtnText}>{t('submit_admin')}</Text>
                <ChevronRight size={20} color="#000" />
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* 🗺️ MAP PICKER MODAL */}
      <Modal visible={showMapPicker} animationType="fade">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setShowMapPicker(false)} style={styles.mapBackBtn}>
              <ChevronLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.mapTitle}>
              {reportType === 'safe' ? 'Pin Safe Spot' : 'Map Crime Road'}
            </Text>
            <TouchableOpacity onPress={() => setShowMapPicker(false)} style={styles.doneBtn}>
              <Text style={styles.doneText}>DONE</Text>
            </TouchableOpacity>
          </View>

          <MapView
            style={{ flex: 1 }}
            initialRegion={mapRegion}
            onPress={handleMapPress}
            showsUserLocation
            theme="dark"
          >
            {reportType === 'safe' && selectedPoint && (
              <Marker coordinate={selectedPoint} pinColor="#10B981" title="Safe Location" />
            )}

            {reportType === 'crime' && recordedPath.map((p, i) => (
              <Marker
                key={i}
                coordinate={p}
                pinColor={i === 0 ? "#10B981" : i === recordedPath.length - 1 ? "#EF4444" : "#FFD700"}
                scaleX={0.5} scaleY={0.5}
              />
            ))}

            {reportType === 'crime' && recordedPath.length > 1 && (
              <Polyline
                coordinates={recordedPath}
                strokeColor="#EF4444"
                strokeWidth={5}
              />
            )}
          </MapView>

          <View style={styles.mapInstruct}>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              {reportType === 'crime' && (
                <TouchableOpacity
                  style={[styles.recordBtn, { backgroundColor: isRecording ? '#EF4444' : '#3B82F6' }]}
                  onPress={() => setIsRecording(!isRecording)}
                >
                  <Text style={styles.recordBtnText}>
                    {isRecording ? '⏹️ STOP TRACKER' : '🛰️ START LIVE GPS'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.clearBtn} onPress={clearPath}>
                <Text style={styles.clearBtnText}>🗑️ CLEAR</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.instructText}>
              {reportType === 'safe'
                ? 'Tap once to mark the safe area.'
                : isRecording ? 'Riding... Path is being saved live!' : 'Tap multiple points on the map to draw the road.'}
            </Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* 🔑 OTP MODAL */}
      <Modal visible={showOtpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.card }]}>
            <Lock color={theme.primary} size={40} style={{ alignSelf: 'center', marginBottom: 15 }} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Verify Mobile</Text>
            <Text style={styles.modalSub}>Enter the 4-digit OTP sent to your phone to save changes.</Text>
            <TextInput
              style={[styles.otpInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="0 0 0 0"
              keyboardType="number-pad"
              maxLength={4}
            />
            <TouchableOpacity style={[styles.verifyBtn, { backgroundColor: theme.primary }]} onPress={verifyOtpAndSave}>
              <Text style={styles.verifyBtnText}>Verify & Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowOtpModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 📰 NEWS MODAL (SAFETY BULLETIN) */}
      <Modal visible={showNewsModal} animationType="slide">
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={[styles.navTop, { borderBottomColor: theme.border }]}>
            <Text style={[styles.logoText, { color: theme.text }]}>Safety Bulletin</Text>
            <TouchableOpacity onPress={() => setShowNewsModal(false)}>
              <Text style={{ color: theme.primary, fontWeight: '900' }}>Close</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {news.map(item => (
              <View key={item.id} style={[styles.newsRow, { backgroundColor: theme.card, borderLeftColor: item.type === 'ACCIDENT' ? '#EF4444' : '#3B82F6' }]}>
                <View style={styles.newsInfo}>
                  <Text style={[styles.newsType, { color: item.type === 'ACCIDENT' ? '#EF4444' : '#3B82F6' }]}>{item.type}</Text>
                  <Text style={[styles.newsHeading, { color: theme.text }]}>{item.title}</Text>
                  <Text style={styles.newsText}>{item.content}</Text>
                  <Text style={styles.newsTime}>Updated Just Now</Text>
                </View>
              </View>
            ))}
            {news.length === 0 && (
              <View style={{ alignItems: 'center', marginTop: 50 }}>
                <BellRing size={50} color={theme.border} />
                <Text style={{ color: theme.subtext, marginTop: 10 }}>No new alerts in Sindhudurg</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: Platform.OS === 'ios' ? 100 : 85,
    paddingTop: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 10,
    borderBottomWidth: 0.5
  },
  logoText: { fontSize: 22, fontWeight: 'bold' },
  dangerBanner: { marginHorizontal: 20, marginTop: 10, borderRadius: 15, overflow: 'hidden', elevation: 5 },
  dangerGradient: { flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  dangerTextContent: { flex: 1 },
  dangerTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  dangerSubTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginTop: 2 },
  newsBtn: { padding: 5, position: 'relative' },
  newsBadge: { position: 'absolute', top: 5, right: 5, width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#FFF' },
  scrollContent: { padding: 20, paddingBottom: 120 },

  // HOME
  criticalSection: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 15 },
  criticalTitle: { color: '#EF4444', fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  criticalCard: { padding: 15, borderRadius: 16, borderLeftWidth: 5, marginBottom: 10 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  alertUser: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  alertUserName: { fontWeight: '800', fontSize: 14 },
  alertTime: { color: '#EF4444', fontSize: 10, fontWeight: 'bold' },
  alertLoc: { color: '#8E8E8E', fontSize: 12, marginBottom: 12 },
  actionBtn: { backgroundColor: '#EF4444', padding: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12 },

  bigSos: { borderRadius: 30, overflow: 'hidden', elevation: 10, marginBottom: 20 },
  sosGradient: { padding: 30, alignItems: 'center', justifyContent: 'center' },
  sosMainText: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 10 },
  sosSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700' },

  mapBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 15 },
  mapIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  mapBtnTitle: { fontSize: 16, fontWeight: '800' },
  mapBtnSub: { color: '#8E8E8E', fontSize: 12 },

  glassContainer: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 25,
    minHeight: 100,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3
  },
  emptyGlass: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyGlassText: { color: '#8E8E8E', fontSize: 13, fontWeight: '600' },

  newsRow: { padding: 15, borderRadius: 16, borderLeftWidth: 4, marginBottom: 15, flexDirection: 'row', alignItems: 'center' },
  newsInfo: { flex: 1 },
  newsType: { fontSize: 10, fontWeight: '900', marginBottom: 4 },
  newsHeading: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  newsText: { fontSize: 12, color: '#8E8E8E', lineHeight: 18 },
  newsTime: { fontSize: 10, color: '#8E8E8E', marginTop: 8, fontStyle: 'italic' },

  // TAB VIEWS
  tabView: { flex: 1, padding: 25 },
  radarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  refreshBtn: { padding: 8, borderRadius: 10, backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  tabTitle: { fontSize: 24, fontWeight: '900' },
  tabSub: { color: '#8E8E8E', fontSize: 14 },

  radarMapContainer: { flex: 1, height: height * 0.5, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#333', backgroundColor: '#000', marginTop: 10 },
  radarMap: { width: '100%', height: '100%' },
  radarOverlay: { position: 'absolute', bottom: 15, left: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#333' },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 9, color: '#888', marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: 1, height: 25, backgroundColor: '#333' },
  copMarker: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 5 },
  myMarker: { backgroundColor: '#F59E0B', scaleX: 1.2, scaleY: 1.2, borderWidth: 3 },

  reportCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 15 },
  reportGradient: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  reportTitle: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  reportSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

  // PROFILE
  profileHeader: { alignItems: 'center', marginBottom: 25 },
  honorBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, gap: 6, marginBottom: 15 },
  honorText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  bigAvatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 5 },
  avatarInitial: { fontSize: 40, fontWeight: 'bold', color: '#FFF' },
  profileName: { fontSize: 22, fontWeight: '900' },

  settingsHub: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 25 },
  hubTitle: { fontSize: 11, fontWeight: '900', color: '#8E8E8E', marginBottom: 15, letterSpacing: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#3B82F615', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingText: { flex: 1, fontSize: 14, fontWeight: '700' },

  profileForm: { marginTop: 10, paddingBottom: 100 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 11, fontWeight: '900', color: '#8E8E8E', marginBottom: 8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, height: 50 },
  input: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '600' },
  gpsCaptureBtn: { padding: 8, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 8, marginLeft: 5 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 55, borderRadius: 14, gap: 10, marginTop: 10 },
  editBtnText: { fontWeight: '900', fontSize: 16 },
  saveBtn: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 55, borderRadius: 14, gap: 10, marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  logoutBtn: { marginTop: 20, padding: 15, alignItems: 'center' },
  logoutText: { color: '#EF4444', fontWeight: '800' },

  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, flexDirection: 'row',
    justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 0.5, paddingBottom: 10,
    elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8
  },
  navItem: { padding: 10 },

  // MODALS & HUB
  rankHub: { flexDirection: 'row', padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  rankItem: { flex: 1, alignItems: 'center' },
  rankVal: { fontSize: 24, fontWeight: '900', marginTop: 5 },
  rankLab: { fontSize: 10, fontWeight: '800', color: '#8E8E8E' },
  rankDivider: { width: 1, height: '100%', backgroundColor: '#8E8E8E33' },

  leaderboardBox: { padding: 20, borderRadius: 20, backgroundColor: '#3B82F610', marginBottom: 25, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  leaderRank: { width: 35, fontSize: 16, fontWeight: '900' },
  leaderName: { flex: 1, fontSize: 15, fontWeight: '700' },
  leaderStats: { alignItems: 'flex-end' },
  leaderLevel: { fontSize: 12, fontWeight: '800', color: '#8E8E8E' },
  leaderPoints: { fontSize: 10, color: '#3B82F6', fontWeight: 'bold' },

  // FULL LEADERBOARD
  leaderboardHeader: { alignItems: 'center', marginVertical: 30 },
  leaderTitle: { fontSize: 24, fontWeight: '900', marginTop: 10 },
  leaderSub: { color: '#8E8E8E', fontSize: 14 },
  fullLeaderRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 18, borderWidth: 1, marginBottom: 12 },
  rankBadge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontSize: 18, fontWeight: '900' },
  fullLeaderName: { fontSize: 16, fontWeight: '800' },
  fullLeaderLevel: { fontSize: 12, color: '#8E8E8E', marginTop: 2 },
  pointsBadge: { backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  pointsText: { color: '#3B82F6', fontWeight: '900', fontSize: 12 },

  infoBox: { padding: 15, borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 20 },
  infoText: { flex: 1, fontSize: 12, fontStyle: 'italic' },

  locationToggle: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 15 },
  toggleBtn: { flex: 1, height: 45, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#8E8E8E44' },
  toggleText: { fontSize: 13, fontWeight: '700' },

  timeSection: { width: '100%', marginBottom: 15 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  timeInputGroup: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 45, borderRadius: 12, borderWidth: 1, borderColor: '#8E8E8E33' },
  timeInput: { flex: 1, marginLeft: 8, fontSize: 13, fontWeight: '600' },

  reasonInput: { width: '100%', height: 80, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 15, textAlignVertical: 'top' },
  suggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 25 },
  suggestTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#3B82F620' },
  suggestTagText: { fontSize: 11, color: '#3B82F6', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '85%', padding: 30, borderRadius: 24, alignItems: 'center' },
  modalSub: { textAlign: 'center', color: '#8E8E8E', fontSize: 13, marginTop: 8, marginBottom: 20 },
  otpInput: { width: '100%', height: 60, borderWidth: 2, borderRadius: 14, textAlign: 'center', fontSize: 24, fontWeight: '900', marginBottom: 20, backgroundColor: 'transparent' },
  verifyBtn: { width: '100%', height: 55, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  verifyBtnText: { color: '#000', fontWeight: '900', fontSize: 16 },
  cancelText: { color: '#8E8E8E', fontWeight: '700' },

  // MAP PICKER
  mapHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#111' },
  mapBackBtn: { padding: 5 },
  mapTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  doneBtn: { backgroundColor: '#FFD700', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  doneText: { color: '#000', fontWeight: 'bold', fontSize: 12 },
  mapInstruct: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.85)', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#333', width: '90%' },
  instructText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  recordBtn: { flex: 2, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recordBtnText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  clearBtn: { flex: 1, backgroundColor: '#333', paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  clearBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },

  // NEW MODAL STYLES
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  riskLegendBox: { marginTop: 15, padding: 15, borderRadius: 12, borderWidth: 1, gap: 10 },
  riskItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riskDot: { width: 10, height: 10, borderRadius: 5 },
  riskText: { fontSize: 12, fontWeight: 'bold' },
  submitBtn: { width: '100%', height: 60, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 },
  submitBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },

  // SOS POPUP STYLES
  sosPopupBox: { width: '85%', padding: 30, borderRadius: 30, elevation: 20 },
  sosPopupTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 15 },
  sosPopupName: { color: '#FFF', fontSize: 16, fontWeight: '700', textAlign: 'center', marginTop: 10, opacity: 0.9 },
  sosPopupInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 15 },
  sosPopupDist: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  rescueBtn: { backgroundColor: '#FFF', height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 25 },
  rescueBtnText: { color: '#FF416C', fontWeight: '900', fontSize: 16 },
  ignoreLink: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 20, fontWeight: 'bold', textDecorationLine: 'underline' },

  // Parent Emergency Portal Styles
  parentPortalCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, marginBottom: 20, elevation: 4 },
  parentHeaderGrad: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 10 },
  parentPortalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  parentPortalContent: { padding: 20 },
  daughtersListText: { fontSize: 13, fontWeight: '700', marginBottom: 15 },
  daughterAlertCard: { padding: 15, borderRadius: 16, borderLeftWidth: 6, borderStyle: 'solid', borderWidth: 1, marginBottom: 15, backgroundColor: 'rgba(255, 65, 108, 0.03)' },
  daughterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  daughterName: { fontSize: 16, fontWeight: 'bold' },
  statusIndicator: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  statusIndicatorText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  alertDetailTime: { fontSize: 12, color: '#888', marginTop: 5, marginBottom: 15 },
  monitorBtn: { flexDirection: 'row', height: 48, backgroundColor: '#FF416C', borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
  monitorBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  mediaEvidenceSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)', paddingTop: 15 },
  evidenceSectionTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 10 },
  evidenceFileItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  evidenceFileText: { fontSize: 12, color: '#6200ee', fontWeight: 'bold' },
  saveToGalleryBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  saveToGalleryText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  noDaughterAlertsText: { fontSize: 12, color: '#888', textAlign: 'center', marginVertical: 10 }
});
