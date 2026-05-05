import React, { useState, useEffect, useContext } from 'react';
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
  Modal
} from 'react-native';
import { 
  ShieldAlert, 
  Map as MapIcon, 
  User, 
  MessageSquare, 
  ShieldCheck, 
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
  Navigation as NavIcon
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function BoysDashboard({ navigation }) {
  const { logout, userData } = useContext(AuthContext);
  const { t, lang } = useContext(LanguageContext);
  const { theme, toggleTheme, themeMode } = useContext(ThemeContext);
  
  const [news, setNews] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
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
  
  // Reporting States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('safe'); // safe, crime, sharp
  const [reportReason, setReportReason] = useState('');
  const [locationType, setLocationType] = useState('live'); // live, manual
  const [userRank, setUserRank] = useState({ level: 5, awards: 12, points: 450 });

  const suggestions = [
    "Isolated Area", "Poor Lighting", "Drunkards spotted", "Safe Haven", "Regular Patrol needed"
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const newsRes = await api.get('/news/latest');
        if (newsRes.data.success) setNews(newsRes.data.news);
        const alertRes = await api.get('/alerts/nearby');
        if (alertRes.data.success) {
          // Filter critical alerts (e.g. from girls/emergency)
          setActiveAlerts(alertRes.data.alerts);
        }
      } catch (e) {}
    };
    fetchData();
    const interval = setInterval(fetchData, 10000); // Fast refresh for critical alerts
    return () => clearInterval(interval);
  }, []);

  const handleManualSOS = () => {
    Alert.alert('🚨 EMERGENCY SOS', 'Alerting Sindhudurg Police and all Secret Cops...', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'SEND NOW', style: 'destructive', onPress: () => Alert.alert('Sent', 'Help is dispatched.') }
    ]);
  };

  const handleReportSubmit = () => {
    Alert.alert(
      "Report Submitted",
      "Your report is sent to Admin for verification. Once approved, you will Level UP!",
      [{ text: "OK", onPress: () => setShowReportModal(false) }]
    );
  };

  const handleSharpTurn = () => {
    Alert.alert(
      "Sharp Turn Reported",
      "Live Location captured. Sending to Admin for verification...",
      [{ text: "Done" }]
    );
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

  // --- SUB-VIEWS ---

  const renderHome = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* SOS & Map Buttons */}
      <View style={{ marginTop: 10 }}>
        <TouchableOpacity style={styles.bigSos} onPress={handleManualSOS}>
          <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.sosGradient}>
            <ShieldAlert color="#FFF" size={40} />
            <Text style={styles.sosMainText}>SEND SOS</Text>
            <Text style={styles.sosSubText}>TAP IN EMERGENCY</Text>
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
            <Text style={[styles.mapBtnTitle, { color: theme.text }]}>Live Crime Map</Text>
            <Text style={styles.mapBtnSub}>Real-time danger zone scanning</Text>
          </View>
          <Zap color={theme.primary} size={20} />
        </TouchableOpacity>

        {/* 💎 GLASS ALERT CONTAINER */}
        <View style={[styles.glassContainer, { backgroundColor: theme.card + '90', borderColor: theme.border }]}>
          {activeAlerts.length > 0 ? (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.criticalTitle}>CRITICAL ALERTS</Text>
                <Activity color="#EF4444" size={16} />
              </View>
              {activeAlerts.map((alert, i) => (
                <TouchableOpacity key={i} style={[styles.criticalCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                  <View style={styles.alertHeader}>
                    <View style={styles.alertUser}>
                      <View style={styles.alertDot} />
                      <Text style={[styles.alertUserName, { color: theme.text }]}>{alert.user} NEEDS HELP</Text>
                    </View>
                    <Text style={styles.alertTime}>NOW</Text>
                  </View>
                  <Text style={styles.alertLoc}><MapPin size={12} color="#EF4444" /> {alert.location} ({alert.distance} away)</Text>
                  <TouchableOpacity style={styles.actionBtn}><Text style={styles.actionBtnText}>RESCUE NOW</Text></TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyGlass}>
              <BellRing size={20} color={theme.subtext} />
              <Text style={styles.emptyGlassText}>No active emergency alerts</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );

  const renderRadar = () => (
    <View style={styles.tabView}>
      <View style={styles.radarHeader}>
        <Text style={[styles.tabTitle, { color: theme.text }]}>Live Safety Radar</Text>
        <Text style={styles.tabSub}>Scanning nearby helpers & zones</Text>
      </View>
      <View style={styles.radarContainer}>
        <View style={[styles.radarCircle, { borderColor: theme.primary + '44' }]}>
          <View style={[styles.radarCircleInner, { borderColor: theme.primary + '88' }]}>
            <View style={[styles.radarCenter, { backgroundColor: theme.primary }]}>
              <User color="#000" size={20} />
            </View>
          </View>
        </View>
        <View style={styles.radarStats}>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: theme.primary }]}>03</Text>
            <Text style={styles.statLabel}>Helpers Nearby</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#EF4444' }]}>01</Text>
            <Text style={styles.statLabel}>Danger Zone</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPlus = () => (
    <ScrollView style={styles.tabView} showsVerticalScrollIndicator={false}>
      <Text style={[styles.tabTitle, { color: theme.text }]}>Intelligence Hub</Text>
      <Text style={styles.tabSub}>Report & earn rank among Secret Cops</Text>
      
      <TouchableOpacity 
        style={styles.reportCard}
        onPress={() => { setReportType('safe'); setShowReportModal(true); }}
      >
        <LinearGradient colors={['#10B981', '#059669']} style={styles.reportGradient}>
          <ShieldCheck color="#FFF" size={24} />
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={styles.reportTitle}>Add Safe Location</Text>
            <Text style={styles.reportSub}>Help others find safety points</Text>
          </View>
          <ChevronRight color="#FFF" size={20} />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.reportCard}
        onPress={() => { setReportType('crime'); setShowReportModal(true); }}
      >
        <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.reportGradient}>
          <AlertTriangle color="#FFF" size={24} />
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={styles.reportTitle}>Add Crime Road</Text>
            <Text style={styles.reportSub}>Mark dangerous paths for Admin</Text>
          </View>
          <ChevronRight color="#FFF" size={20} />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.reportCard}
        onPress={handleSharpTurn}
      >
        <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.reportGradient}>
          <RotateCcw color="#FFF" size={24} />
          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text style={styles.reportTitle}>Quick Sharp Turn</Text>
            <Text style={styles.reportSub}>One-tap live location report</Text>
          </View>
          <LocateFixed color="#FFF" size={20} />
        </LinearGradient>
      </TouchableOpacity>

      <View style={[styles.infoBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ShieldAlert size={18} color="#EF4444" />
        <Text style={[styles.infoText, { color: theme.subtext }]}>
          All reports are verified by Admin. False reports will lead to Rank Demotion (-1 Level).
        </Text>
      </View>
    </ScrollView>
  );

  const renderProfile = () => (
    <ScrollView style={styles.tabView} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <LinearGradient colors={['#8B5CF6', '#6D28D9']} style={styles.honorBadge}>
          <ShieldCheck color="#FFF" size={14} />
          <Text style={styles.honorText}>VERIFIED SECRET COP</Text>
        </LinearGradient>
        
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
      <View style={styles.leaderboardBox}>
        <Text style={styles.hubTitle}>TOP SECRET COPS</Text>
        {[
          { name: 'Sameer P.', level: 12, rank: 1 },
          { name: 'Aniket R.', level: 10, rank: 2 },
          { name: 'Rahul S.', level: 8, rank: 3 }
        ].map((cop, idx) => (
          <View key={idx} style={styles.leaderRow}>
            <Text style={styles.leaderRank}>#{cop.rank}</Text>
            <Text style={[styles.leaderName, { color: theme.text }]}>{cop.name}</Text>
            <Text style={styles.leaderLevel}>Lvl {cop.level}</Text>
          </View>
        ))}
      </View>

      {/* Settings Hub */}
      <View style={[styles.settingsHub, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={styles.hubTitle}>SETTINGS HUB</Text>
        <TouchableOpacity style={styles.settingRow} onPress={() => {}}>
          <View style={styles.settingIcon}><Globe size={18} color={theme.primary} /></View>
          <Text style={[styles.settingText, { color: theme.text }]}>Language: {lang.toUpperCase()}</Text>
          <ChevronRight size={16} color={theme.subtext} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingRow} onPress={toggleTheme}>
          <View style={styles.settingIcon}><Zap size={18} color={theme.primary} /></View>
          <Text style={[styles.settingText, { color: theme.text }]}>Appearance: {themeMode.toUpperCase()}</Text>
          <ChevronRight size={16} color={theme.subtext} />
        </TouchableOpacity>
      </View>

      <View style={styles.profileForm}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>FULL NAME</Text>
          <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <User size={18} color={theme.subtext} />
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              value={profileForm.fullName} 
              editable={isEditing}
              onChangeText={(t) => setProfileForm({...profileForm, fullName: t})}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
          <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Phone size={18} color={theme.subtext} />
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              value={profileForm.mobile} 
              editable={isEditing}
              keyboardType="phone-pad"
              onChangeText={(t) => setProfileForm({...profileForm, mobile: t})}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ADDRESS</Text>
          <View style={[styles.inputBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <MapPin size={18} color={theme.subtext} />
            <TextInput 
              style={[styles.input, { color: theme.text }]} 
              value={profileForm.address} 
              editable={isEditing}
              onChangeText={(t) => setProfileForm({...profileForm, address: t})}
            />
          </View>
        </View>

        {!isEditing ? (
          <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.primary }]} onPress={() => setIsEditing(true)}>
            <Edit2 color="#000" size={20} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.saveBtn} onPress={handleProfileUpdate}>
            <CheckCircle color="#FFF" size={20} />
            <Text style={styles.saveBtnText}>Save Changes (Need OTP)</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout Session</Text>
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
              start={{x:0, y:0}} end={{x:1, y:1}}
            />
          )}
        </TouchableOpacity>
        <Text style={[styles.logoText, { color: theme.text }]}>Chetna</Text>
        <TouchableOpacity onPress={() => setActiveTab('profile')}><User color={theme.primary} size={24} /></TouchableOpacity>
      </View>

      {/* 🚀 Tab Content */}
      <View style={{ flex: 1 }}>
        {activeTab === 'home' && renderHome()}
        {activeTab === 'search' && renderRadar()}
        {activeTab === 'plus' && renderPlus()}
        {activeTab === 'profile' && renderProfile()}
      </View>

      {/* 🧭 Bottom Nav */}
      <View style={[styles.bottomNav, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
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
          <View style={[styles.modalBox, { backgroundColor: theme.card, width: '90%' }]}>
            <Text style={[styles.tabTitle, { color: theme.text, fontSize: 20 }]}>
              Add {reportType === 'safe' ? 'Safe Point' : 'Crime Road'}
            </Text>
            <Text style={styles.modalSub}>Verified reports earn you Rank Up points!</Text>

            <View style={styles.locationToggle}>
              <TouchableOpacity 
                style={[styles.toggleBtn, locationType === 'live' && { backgroundColor: theme.primary }]}
                onPress={() => setLocationType('live')}
              >
                <LocateFixed color={locationType === 'live' ? '#000' : theme.subtext} size={16} />
                <Text style={[styles.toggleText, { color: locationType === 'live' ? '#000' : theme.subtext }]}>Live GPS</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.toggleBtn, locationType === 'manual' && { backgroundColor: theme.primary }]}
                onPress={() => setLocationType('manual')}
              >
                <Search color={locationType === 'manual' ? '#000' : theme.subtext} size={16} />
                <Text style={[styles.toggleText, { color: locationType === 'manual' ? '#000' : theme.subtext }]}>Search</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.reasonInput, { color: theme.text, borderColor: theme.border }]}
              placeholder="Why is this location safe/danger?"
              placeholderTextColor={theme.subtext}
              multiline
              value={reportReason}
              onChangeText={setReportReason}
            />

            <View style={styles.suggestRow}>
              {suggestions.map((s, i) => (
                <TouchableOpacity key={i} style={styles.suggestTag} onPress={() => setReportReason(s)}>
                  <Text style={styles.suggestTagText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={[styles.verifyBtn, { backgroundColor: theme.primary }]} onPress={handleReportSubmit}>
              <Text style={styles.verifyBtnText}>SUBMIT TO ADMIN</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  newsBtn: { padding: 5, position: 'relative' },
  newsBadge: { position: 'absolute', top: 5, right: 5, width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: '#FFF' },
  scrollContent: { padding: 20, paddingBottom: 100 },

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
  radarHeader: { marginBottom: 20 },
  tabTitle: { fontSize: 24, fontWeight: '900' },
  tabSub: { color: '#8E8E8E', fontSize: 14, marginBottom: 30 },
  
  radarContainer: { alignItems: 'center', marginTop: 40 },
  radarCircle: { width: 250, height: 250, borderRadius: 125, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  radarCircleInner: { width: 150, height: 150, borderRadius: 75, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  radarCenter: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  radarStats: { flexDirection: 'row', gap: 30, marginTop: 40 },
  statBox: { alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '900' },
  statLabel: { color: '#8E8E8E', fontSize: 11, marginTop: 4 },

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
  inputBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, height: 55, borderRadius: 14, borderWidth: 1 },
  input: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 55, borderRadius: 14, gap: 10, marginTop: 10 },
  editBtnText: { fontWeight: '900', fontSize: 16 },
  saveBtn: { backgroundColor: '#10B981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 55, borderRadius: 14, gap: 10, marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  logoutBtn: { marginTop: 20, padding: 15, alignItems: 'center' },
  logoutText: { color: '#EF4444', fontWeight: '800' },

  bottomNav: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, flexDirection: 'row', 
    justifyContent: 'space-around', alignItems: 'center', borderTopWidth: 0.5, paddingBottom: 10
  },
  navItem: { padding: 10 },

  // MODALS & HUB
  rankHub: { flexDirection: 'row', padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 20 },
  rankItem: { flex: 1, alignItems: 'center' },
  rankVal: { fontSize: 24, fontWeight: '900', marginTop: 5 },
  rankLab: { fontSize: 10, fontWeight: '800', color: '#8E8E8E' },
  rankDivider: { width: 1, height: '100%', backgroundColor: '#8E8E8E33' },
  
  leaderboardBox: { padding: 20, borderRadius: 20, backgroundColor: '#3B82F610', marginBottom: 25 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  leaderRank: { width: 30, fontSize: 14, fontWeight: '900', color: '#8B5CF6' },
  leaderName: { flex: 1, fontSize: 14, fontWeight: '700' },
  leaderLevel: { fontSize: 12, fontWeight: '800', color: '#8E8E8E' },

  infoBox: { padding: 15, borderRadius: 15, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 20 },
  infoText: { flex: 1, fontSize: 12, fontStyle: 'italic' },

  locationToggle: { flexDirection: 'row', width: '100%', gap: 10, marginBottom: 15 },
  toggleBtn: { flex: 1, height: 45, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#8E8E8E44' },
  toggleText: { fontSize: 13, fontWeight: '700' },
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
  cancelText: { color: '#8E8E8E', fontWeight: '700' }
});



