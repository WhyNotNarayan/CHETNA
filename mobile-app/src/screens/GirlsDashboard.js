import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions, Alert, Platform } from 'react-native';
import { AlertCircle, Shield, Navigation, Newspaper, Mic, Camera, LogOut } from 'lucide-react-native';
import { useSafetyMonitor } from '../hooks/useSafetyMonitor';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const { width } = Dimensions.get('window');

export default function GirlsDashboard() {
  const { currentZone } = useSafetyMonitor();
  const { logout, userData } = useContext(AuthContext);
  const [news, setNews] = useState([]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await api.get('/news/latest');
        if (response.data.success) setNews(response.data.news);
      } catch (e) {}
    };
    fetchNews();

    // Auto-refresh news for users every 60 seconds
    const interval = setInterval(fetchNews, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Logout', style: 'destructive', onPress: logout }
    ]);
  };

  const handleSOS = () => {
    // Logic for SOS trigger
    alert('SOS Triggered! Recording evidence and notifying helpers...');
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Status Card */}
        <View style={[styles.statusCard, currentZone ? styles.dangerCard : styles.safeCard]}>
          <Shield color={currentZone ? "#ff4d4d" : "#4CAF50"} size={32} />
          <View style={styles.statusTextContainer}>
            <Text style={styles.statusTitle}>{currentZone ? 'DANGER ZONE' : 'YOU ARE SAFE'}</Text>
            <Text style={styles.statusSubtitle}>
              {currentZone ? `Entering ${currentZone.name}` : 'Scanning your surroundings...'}
            </Text>
          </View>
        </View>

        {/* SOS Central Button */}
        <View style={styles.sosContainer}>
          <TouchableOpacity 
            style={styles.sosButton} 
            activeOpacity={0.8}
            onPress={handleSOS}
          >
            <View style={styles.sosOuterRing}>
              <View style={styles.sosInnerCircle}>
                <Text style={styles.sosText}>SOS</Text>
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.sosInstruction}>Tap once or say "Help Me"</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          <ActionItem icon={<Navigation color="#6200ee" />} label="Safe Route" />
          <ActionItem icon={<Newspaper color="#6200ee" />} label="Local News" />
          <ActionItem icon={<Mic color="#6200ee" />} label="Voice Settings" />
          <ActionItem icon={<Camera color="#6200ee" />} label="Evidence" />
        </View>

        {/* News Preview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Safety Updates</Text>
          <TouchableOpacity><Text style={styles.viewAll}>View All</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newsScroll}>
          {news.map(item => (
            <NewsCard 
              key={item.id} 
              title={item.title} 
              content={item.content} 
              time={new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
              type={item.type}
            />
          ))}
          {news.length === 0 && <Text style={{ color: '#888', margin: 20 }}>Checking for updates...</Text>}
        </ScrollView>

      </ScrollView>
    </SafeAreaView>
  );
}

const ActionItem = ({ icon, label }) => (
  <TouchableOpacity style={styles.actionItem}>
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
    <Text style={styles.newsContent}>{content}</Text>
    <Text style={styles.newsTime}>{time}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerWelcome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTagline: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  logoutIconButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
    borderRadius: 12,
  },
  scrollContent: { padding: 20 },
  statusCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  safeCard: { borderLeftWidth: 8, borderLeftColor: '#4CAF50' },
  dangerCard: { borderLeftWidth: 8, borderLeftColor: '#ff4d4d' },
  statusTextContainer: { marginLeft: 15 },
  statusTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  statusSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  
  sosContainer: { alignItems: 'center', marginBottom: 40 },
  sosButton: { 
    width: 200, 
    height: 200, 
    borderRadius: 100, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  sosOuterRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ffebeb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosInnerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#ff4d4d',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#ff4d4d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  sosText: { color: 'white', fontSize: 36, fontWeight: '900' },
  sosInstruction: { marginTop: 15, color: '#666', fontWeight: '500' },

  actionsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'flex-start', // 🎯 Changed for better grid alignment
    marginBottom: 30,
    gap: 15, // 🎯 Use gap for spacing
  },
  actionItem: {
    // 🎯 Smart width: 2 columns on mobile, up to 4 on web
    width: Platform.OS === 'web' ? '23%' : '47%', 
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  actionIcon: { marginBottom: 10 },
  actionLabel: { fontSize: 14, fontWeight: '600', color: '#333' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  viewAll: { color: '#6200ee', fontWeight: '600' },
  
  newsScroll: { marginBottom: 20 },
  newsCard: {
    width: 250,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    marginRight: 15,
    elevation: 2,
  },
  newsTagContainer: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginBottom: 8 },
  newsTagWhite: { color: 'white', fontSize: 9, fontWeight: '800' },
  newsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 5 },
  newsContent: { fontSize: 13, color: '#666', lineHeight: 18 },
  newsTime: { fontSize: 11, color: '#999', marginTop: 10 }
});
