import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  RefreshControl,
  Dimensions,
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

const { width } = Dimensions.get('window');

const AdminDashboard = ({ navigation }) => {
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
      // Fixed routes to include full path if necessary
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
    <View style={styles.statCard}>
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
    <TouchableOpacity style={styles.menuButton} onPress={onPress}>
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
        <View>
          <Text style={styles.welcomeText}>Welcome Admin,</Text>
          <Text style={styles.brandText}>Sindhudurg Command Center</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
        }
      >
        <Text style={styles.sectionTitle}>Sindhudurg Live Bulletin 📡</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newsScroller}>
          {news.map((item) => (
            <View key={item.id} style={styles.newsCard}>
              <View style={styles.newsTag}>
                <Activity size={12} color="#FFD700" />
                <Text style={styles.newsTagText}>LIVE UPDATE</Text>
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
        <View style={styles.menuList}>
          <MenuButton 
            title="Add Crime Data" 
            subtitle="Register new incident in Sindhudurg"
            icon={ShieldAlert}
            color="#FF4444"
            onPress={() => navigation.navigate('AdminAddCrime')}
          />
          <MenuButton 
            title="Live Zone Map" 
            subtitle="Visual Sindhudurg Crime Heatmap"
            icon={MapIcon}
            color="#FFBB33"
            onPress={() => navigation.navigate('AdminRedZones')}
          />
          <MenuButton 
            title="SOS Monitoring" 
            subtitle="Track and Resolve Emergency cases"
            icon={ShieldAlert}
            color="#00C851"
            onPress={() => Alert.alert('Coming Soon', 'SOS Monitoring coming soon')}
          />
          <MenuButton 
            title="Secret Cop Registry" 
            subtitle="Manage authorized helpers"
            icon={Users}
            color="#00C851"
            onPress={() => Alert.alert('Coming Soon', 'Secret Cop Registry coming soon')}
          />
          <MenuButton 
            title="System Alerts" 
            subtitle="Send mass notifications to users"
            icon={Bell}
            color="#4488FF"
            onPress={() => Alert.alert('Coming Soon', 'Bulletin system is under development')}
          />
        </View>

        <TouchableOpacity style={styles.reportsBanner}>
          <TrendingUp size={24} color="#FFF" />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Generate Analytics Report</Text>
            <Text style={styles.bannerSubtitle}>Monthly crime trends for Sindhudurg Police</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#151515',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  welcomeText: {
    color: '#888',
    fontSize: 14,
  },
  brandText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutBtn: {
    padding: 10,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: 10,
  },
  scrollContent: {
    padding: 20,
  },
  sectionTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 60) / 2,
    backgroundColor: '#1A1A1A',
    padding: 15,
    borderRadius: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  statIconContainer: {
    padding: 10,
    borderRadius: 12,
    marginRight: 12,
  },
  statValue: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statTitle: {
    color: '#888',
    fontSize: 12,
  },
  menuList: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  menuIconContainer: {
    padding: 12,
    borderRadius: 12,
    marginRight: 15,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuSubtitle: {
    color: '#666',
    fontSize: 12,
  },
  reportsBanner: {
    backgroundColor: '#1a49a8',
    marginTop: 25,
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    marginLeft: 15,
  },
  bannerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bannerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  newsScroller: {
    marginBottom: 25,
  },
  newsCard: {
    width: width * 0.75,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 15,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  newsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
  },
  newsTagText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 5,
  },
  newsTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  newsContent: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  newsSource: {
    color: '#555',
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  emptyText: {
    color: '#444',
    padding: 20,
  }
});

export default AdminDashboard;
