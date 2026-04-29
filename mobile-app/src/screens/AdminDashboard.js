import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  RefreshControl,
  useWindowDimensions,
  Platform,
  Alert
} from 'react-native';
import { 
  ShieldAlert, 
  Users, 
  Map as MapIcon, 
  TrendingUp, 
  Activity,
  AlertTriangle,
  LogOut,
  ChevronRight,
  Bell
} from 'lucide-react-native';
import api from '../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AdminDashboard = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSOS: 0,
    activeSOS: 0,
    redZonesCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [news, setNews] = useState([]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/analytics');
      if (response.data.success) {
        setStats(response.data.stats);
      }
      
      const newsResp = await api.get('/news/latest');
      if (newsResp.data.success) {
        setNews(newsResp.data.news);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.replace('Welcome');
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <View style={[
      styles.statCard, 
      { width: isDesktop ? (Math.min(width, 1200) - 80) / 4 : (width - 50) / 2 }
    ]}>
      <View style={[styles.statIconContainer, { backgroundColor: `${color}15` }]}>
        <Icon size={24} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </View>
    </View>
  );

  const MenuButton = ({ title, subtitle, icon: Icon, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.menuButton, isDesktop && styles.menuButtonDesktop]} 
      onPress={onPress}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: `${color}15` }]}>
        <Icon size={24} color={color} />
      </View>
      <View style={styles.menuTextContainer}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color="#666" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome Admin,</Text>
            <Text style={styles.brandText}>Sindhudurg Command Center</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={20} color="#FF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
        }
      >
        <View style={styles.maxContainer}>
          <Text style={styles.sectionTitle}>Sindhudurg Live Bulletin 📡</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newsScroller}>
            {news.map((item) => (
              <View key={item.id} style={[styles.newsCard, item.type === 'ACCIDENT' && { borderColor: '#FF4444' }]}>
                <View style={[styles.newsTag, { backgroundColor: item.type === 'ACCIDENT' ? '#FF4444' : '#FFD700' }]}>
                  <Activity size={12} color={item.type === 'ACCIDENT' ? '#FFF' : '#000'} />
                  <Text style={[styles.newsTagText, { color: item.type === 'ACCIDENT' ? '#FFF' : '#000' }]}>
                    {item.type || 'LIVE UPDATE'}
                  </Text>
                </View>
                <Text style={styles.newsTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.newsContent} numberOfLines={2}>{item.content}</Text>
                <Text style={styles.newsSource}>via {item.source}</Text>
              </View>
            ))}
            {news.length === 0 && <Text style={styles.emptyText}>Scanning for fresh updates...</Text>}
          </ScrollView>

          <Text style={styles.sectionTitle}>Real-time Insights</Text>
          <View style={styles.statsGrid}>
            <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="#4488FF" />
            <StatCard title="SOS Alerts" value={stats.totalSOS} icon={ShieldAlert} color="#FF4444" />
            <StatCard title="Active SOS" value={stats.activeSOS} icon={Activity} color="#00C851" />
            <StatCard title="Red Zones" value={stats.redZonesCount} icon={ShieldAlert} color="#FFBB33" />
          </View>

          <Text style={styles.sectionTitle}>Management Console</Text>
          <View style={[styles.menuList, isDesktop && styles.menuListDesktop]}>
            <MenuButton 
              title="Post News Alert" 
              subtitle="🚨 Send safety news"
              icon={Bell}
              color="#FF4444"
              onPress={() => navigation.navigate('AdminAddNews')}
            />
            <MenuButton 
              title="Add Crime Data" 
              subtitle="Register new incident"
              icon={ShieldAlert}
              color="#FFBB33"
              onPress={() => navigation.navigate('AdminAddCrime')}
            />
            <MenuButton 
              title="Live Zone Map" 
              subtitle="Crime Heatmap"
              icon={MapIcon}
              color="#FFD700"
              onPress={() => navigation.navigate('AdminRedZones')}
            />
            <MenuButton 
              title="SOS Monitoring" 
              subtitle="Emergency cases"
              icon={ShieldAlert}
              color="#00C851"
              onPress={() => Alert.alert('Coming Soon', 'SOS Monitoring coming soon')}
            />
            <MenuButton 
              title="Manage Secret Cops" 
              subtitle="Verify volunteers"
              icon={Users}
              color="#FFD700"
              onPress={() => navigation.navigate('AdminManageSecretCops')}
            />
          </View>

          <TouchableOpacity style={[styles.reportsBanner, isDesktop && styles.reportsBannerDesktop]}>
            <TrendingUp size={24} color="#FFF" />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>Generate Analytics Report</Text>
              <Text style={styles.bannerSubtitle}>Monthly trends for Sindhudurg Police Headquarters</Text>
            </View>
          </TouchableOpacity>
          
          {/* Brute force spacer for web scrolling issues */}
          <View style={{ height: 150 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    // Force scrolling on web
    overflowY: Platform.OS === 'web' ? 'auto' : 'hidden',
  },
  header: {
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    paddingVertical: 15,
    zIndex: 10, // Keep header on top
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  welcomeText: {
    color: '#888',
    fontSize: 12,
  },
  brandText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    padding: 10,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Extra space at the bottom for scrolling
  },
  maxContainer: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    padding: 20,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 10,
  },
  statCard: {
    backgroundColor: '#151515',
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  statIconContainer: {
    padding: 12,
    borderRadius: 15,
    marginRight: 15,
  },
  statValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statTitle: {
    color: '#888',
    fontSize: 13,
  },
  menuList: {
    backgroundColor: '#151515',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  menuListDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  menuButtonDesktop: {
    width: '49%',
    borderBottomWidth: 0,
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
  },
  menuIconContainer: {
    padding: 14,
    borderRadius: 16,
    marginRight: 18,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  menuSubtitle: {
    color: '#666',
    fontSize: 13,
    marginTop: 2,
  },
  reportsBanner: {
    backgroundColor: '#1D4ED8',
    marginTop: 30,
    padding: 25,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  reportsBannerDesktop: {
    padding: 35,
  },
  bannerText: {
    marginLeft: 20,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  newsScroller: {
    marginBottom: 10,
  },
  newsCard: {
    width: 300,
    backgroundColor: '#151515',
    borderRadius: 20,
    padding: 18,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  newsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  newsTagText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  newsTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  newsContent: {
    color: '#999',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  newsSource: {
    color: '#555',
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyText: {
    color: '#444',
    padding: 20,
  }
});

export default AdminDashboard;
