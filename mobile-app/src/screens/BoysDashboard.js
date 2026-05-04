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
  Linking
} from 'react-native';
import { 
  ShieldAlert, 
  Map as MapIcon, 
  Bell, 
  User, 
  Settings, 
  MessageSquare, 
  Award, 
  Radio, 
  ShieldCheck, 
  ChevronRight, 
  LogOut,
  Navigation,
  Mic,
  Crosshair,
  PlusCircle,
  MapPin,
  Users,
  Eye,
  Trophy,
  AlertTriangle,
  BellRing,
  Newspaper
} from 'lucide-react-native';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import * as Speech from 'expo-speech';

const { width } = Dimensions.get('window');

export default function BoysDashboard({ navigation }) {
  const { logout, userData } = useContext(AuthContext);
  const { t, changeLanguage, lang } = useContext(LanguageContext);
  const { theme, toggleTheme, themeMode } = useContext(ThemeContext);
  
  const [news, setNews] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  
  const isVerified = userData?.isVerified || false;
  const isPending = userData?.isSecretCopPending || false;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const newsRes = await api.get('/news/latest');
        if (newsRes.data.success) setNews(newsRes.data.news);

        if (isVerified) {
          const alertRes = await api.get('/alerts/nearby');
          if (alertRes.data.success) setActiveAlerts(alertRes.data.alerts);
        }
      } catch (e) {}
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [isVerified]);

  const handleLogout = () => {
    Alert.alert(t('settings'), t('logout_confirm'), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout }
    ]);
  };

  const handleManualSOS = () => {
    Alert.alert(
      t('manual_sos'),
      'This will alert the Sindhudurg Police and nearby Secret Cops. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'SEND SOS', style: 'destructive', onPress: () => Alert.alert('SOS Sent', 'Help is on the way.') }
      ]
    );
  };

  const startAINavigator = () => {
    navigation.navigate('AINavigator');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Theme/Lang Toggles */}
      <View style={[styles.header, { borderColor: theme.border }]}>
        <View>
          <Text style={[styles.headerWelcome, { color: theme.text }]}>{t('welcome')}, {userData?.fullName?.split(' ')[0] || 'User'}</Text>
          <View style={[styles.roleTag, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={styles.roleText}>{isVerified ? '🛡️ ' + t('secret_cop_dash').toUpperCase() : '👤 ' + t('tagline').toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.card }]} onPress={() => setShowSettings(!showSettings)}>
            <PlusCircle color={theme.primary} size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.headerBtn, { backgroundColor: theme.card }]} onPress={handleLogout}>
            <LogOut color={theme.danger} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Settings Panel */}
      {showSettings && (
        <View style={[styles.settingsPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.settingsTitle, { color: theme.text }]}>{t('settings')}</Text>
          <TouchableOpacity style={styles.settingRow} onPress={toggleTheme}>
            <Text style={{ color: theme.text }}>{t('dark_mode')}</Text>
            <View style={[styles.toggleBase, { backgroundColor: themeMode === 'dark' ? theme.primary : '#ccc' }]}>
              <View style={[styles.toggleCircle, { alignSelf: themeMode === 'dark' ? 'flex-end' : 'flex-start' }]} />
            </View>
          </TouchableOpacity>
          <View style={styles.langRow}>
            <TouchableOpacity onPress={() => changeLanguage('en')} style={[styles.langTag, lang === 'en' && { backgroundColor: theme.primary }]}>
              <Text style={{ color: lang === 'en' ? '#000' : theme.text }}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeLanguage('mr')} style={[styles.langTag, lang === 'mr' && { backgroundColor: theme.primary }]}>
              <Text style={{ color: lang === 'mr' ? '#000' : theme.text }}>मराठी</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeLanguage('hi')} style={[styles.langTag, lang === 'hi' && { backgroundColor: theme.primary }]}>
              <Text style={{ color: lang === 'hi' ? '#000' : theme.text }}>हिंदी</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* TOP SECTION: ACTION CARDS */}
        <View style={styles.grid}>
          <TouchableOpacity style={[styles.card, { backgroundColor: theme.danger, borderColor: theme.danger }]} onPress={handleManualSOS}>
            <ShieldAlert color="#FFF" size={32} />
            <Text style={styles.cardTitleWhite}>{t('manual_sos')}</Text>
            <Text style={styles.cardSubWhite}>{t('emergency_alert')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={() => navigation.navigate('AdminRedZones')}
          >
            <MapPin color={theme.primary} size={32} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>{t('live_map')}</Text>
            <Text style={styles.cardSub}>{t('crime_zones')}</Text>
          </TouchableOpacity>
        </View>

        {/* SECRET COP REGISTRATION / STATUS */}
        {!isVerified && (
          <View style={[styles.promoCard, { backgroundColor: theme.card, borderColor: isPending ? theme.primary : theme.border }]}>
            <View style={styles.promoInfo}>
              <View style={[styles.promoIconBg, { backgroundColor: isPending ? 'rgba(255, 215, 0, 0.1)' : 'rgba(68, 136, 255, 0.1)' }]}>
                <ShieldCheck color={isPending ? theme.primary : theme.secondary} size={30} />
              </View>
              <View style={styles.promoTextContainer}>
                <Text style={[styles.promoTitle, { color: theme.text }]}>
                  {isPending ? t('pending') : t('become_secret_cop')}
                </Text>
                <Text style={styles.promoSub}>
                  {isPending ? 'Your application is under review by Sindhudurg Command Center.' : t('help_protect')}
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.promoBtn, { backgroundColor: isPending ? 'transparent' : theme.primary, borderWidth: isPending ? 1 : 0, borderColor: theme.primary }]} 
              onPress={() => !isPending && navigation.navigate('SecretCopRegister')}
              disabled={isPending}
            >
              <Text style={[styles.promoBtnText, { color: isPending ? theme.primary : '#000' }]}>
                {isPending ? 'VERIFICATION IN PROGRESS' : t('register_now').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* UNLOCKED FEATURES (SECRET COP ONLY) */}
        {isVerified && (
          <View style={styles.premiumSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('secret_cop_dash')}</Text>
            
            <View style={styles.grid}>
              <TouchableOpacity style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={startAINavigator}>
                <Navigation color={theme.secondary} size={28} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>{t('ai_navigator')}</Text>
                <Text style={styles.cardSub}>{t('voice_alerts')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => Alert.alert(t('guardian'), 'Ask your family members to add your ID: ' + (userData?.id?.slice(0, 6)))}>
                <Users color="#FF8844" size={28} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>{t('guardian')}</Text>
                <Text style={styles.cardSub}>{t('watch_list')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => Alert.alert(t('radar'), '3 Secret Cops nearby in Sawantwadi.')}>
                <Eye color={theme.success} size={28} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>{t('radar')}</Text>
                <Text style={styles.cardSub}>{t('nearby_helpers')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Trophy color={theme.primary} size={28} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>{t('honor')}</Text>
                <Text style={styles.cardSub}>{userData?.points || 0} {t('points')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.wideCard, { backgroundColor: theme.secondary }]} onPress={() => Linking.openURL('tel:100')}>
              <MessageSquare color="#FFF" size={24} />
              <Text style={styles.wideCardText}>{t('admin_line')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => Alert.alert(t('report_hazard'), 'Add Dark Road, Animal Crossing, or Sharp Turn suggestion.')}>
              <AlertTriangle color={theme.danger} size={20} />
              <Text style={[styles.reportText, { color: theme.text }]}>{t('report_hazard')}</Text>
              <PlusCircle color={theme.danger} size={20} />
            </TouchableOpacity>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('nearby_alerts')}</Text>
              <View style={styles.pulseContainer}>
                <View style={[styles.pulse, { backgroundColor: theme.danger }]} />
              </View>
            </View>
            {activeAlerts.length > 0 ? (
              activeAlerts.map((alert, index) => (
                <TouchableOpacity key={index} style={[styles.alertItem, { backgroundColor: theme.isDark ? '#1A0000' : '#FFF0F0', borderColor: theme.danger }]}>
                  <View style={styles.alertIconBg}>
                    <BellRing color={theme.danger} size={24} />
                  </View>
                  <View style={styles.alertInfo}>
                    <Text style={[styles.alertName, { color: theme.text }]}>{alert.user}</Text>
                    <Text style={[styles.alertDist, { color: theme.danger }]}>{alert.distance} away • {alert.location}</Text>
                  </View>
                  <TouchableOpacity style={[styles.rescueBtn, { backgroundColor: theme.danger }]}>
                    <Text style={styles.rescueText}>{t('rescue')}</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.emptyAlerts, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={styles.emptyText}>{t('no_alerts')}</Text>
              </View>
            )}
          </View>
        )}

        {/* COMMUNITY BULLETIN */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('bulletin')}</Text>
          <Newspaper color={theme.subtext} size={20} />
        </View>
        {news.map(item => (
          <View key={item.id} style={[styles.newsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.newsTag, { backgroundColor: item.type === 'ACCIDENT' ? theme.danger : theme.secondary }]} />
            <View style={styles.newsContent}>
              <Text style={[styles.newsTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.newsDesc, { color: theme.subtext }]}>{item.content}</Text>
              <Text style={styles.newsMeta}>{new Date(item.createdAt).toLocaleTimeString()} • Sindhudurg News</Text>
            </View>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  headerWelcome: { fontSize: 22, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerBtn: { padding: 10, borderRadius: 12 },
  roleTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 5, alignSelf: 'flex-start', borderWidth: 1 },
  roleText: { color: '#FFD700', fontSize: 10, fontWeight: 'bold', letterSpacing: 1 },
  
  settingsPanel: { padding: 20, borderRadius: 20, margin: 15, borderWidth: 1, elevation: 10 },
  settingsTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  langRow: { flexDirection: 'row', justifyContent: 'space-around' },
  langTag: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#444' },
  
  toggleBase: { width: 50, height: 26, borderRadius: 13, padding: 3 },
  toggleCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF' },

  scrollContent: { padding: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  card: {
    width: (width - 45) / 2,
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    alignItems: 'center'
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  cardSub: { color: '#666', fontSize: 11, marginTop: 4 },
  cardTitleWhite: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 12 },
  cardSubWhite: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 },

  promoCard: { borderRadius: 24, padding: 20, borderWidth: 1, marginBottom: 25, elevation: 4 },
  promoInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  promoIconBg: { width: 55, height: 55, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  promoTextContainer: { marginLeft: 15, flex: 1 },
  promoTitle: { fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  promoSub: { color: '#888', fontSize: 12, marginTop: 4, lineHeight: 18 },
  promoBtn: { height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  promoBtnText: { fontWeight: 'bold', fontSize: 15 },

  premiumSection: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  
  wideCard: { flexDirection: 'row', padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 15 },
  wideCardText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  reportCard: { flexDirection: 'row', padding: 15, borderRadius: 15, alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, marginBottom: 20 },
  reportText: { fontWeight: '600' },

  alertItem: { flexDirection: 'row', padding: 15, borderRadius: 20, alignItems: 'center', marginBottom: 12, borderWidth: 1 },
  alertIconBg: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  alertInfo: { flex: 1 },
  alertName: { fontSize: 16, fontWeight: 'bold' },
  alertDist: { fontSize: 12, marginTop: 2 },
  rescueBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
  rescueText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  
  emptyAlerts: { padding: 30, borderRadius: 20, alignItems: 'center', borderWidth: 1 },
  emptyText: { color: '#666', textAlign: 'center', fontSize: 13, lineHeight: 20 },

  newsCard: { flexDirection: 'row', borderRadius: 20, marginBottom: 15, overflow: 'hidden', borderWidth: 1 },
  newsTag: { width: 6, height: '100%' },
  newsContent: { padding: 15, flex: 1 },
  newsTitle: { fontSize: 16, fontWeight: '700' },
  newsDesc: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  newsMeta: { color: '#444', fontSize: 11, marginTop: 10 },

  pulseContainer: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  pulse: { width: 10, height: 10, borderRadius: 5 }
});

