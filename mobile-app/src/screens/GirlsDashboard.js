import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Dimensions } from 'react-native';
import { AlertCircle, Shield, Navigation, Newspaper, Mic, Camera } from 'lucide-react-native';
import { useSafetyMonitor } from '../hooks/useSafetyMonitor';

const { width } = Dimensions.get('window');

export default function GirlsDashboard() {
  const { currentZone } = useSafetyMonitor();

  const handleSOS = () => {
    // Logic for SOS trigger
    alert('SOS Triggered! Recording evidence and notifying helpers...');
  };

  return (
    <SafeAreaView style={styles.container}>
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
          <NewsCard title="New Red Zone" content="Increased theft reports near Central Park." time="2h ago" />
          <NewsCard title="Police Alert" content="Patrols increased in Subhash Nagar." time="5h ago" />
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

const NewsCard = ({ title, content, time }) => (
  <View style={styles.newsCard}>
    <Text style={styles.newsTag}>NEWS</Text>
    <Text style={styles.newsTitle}>{title}</Text>
    <Text style={styles.newsContent}>{content}</Text>
    <Text style={styles.newsTime}>{time}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
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
    justifyContent: 'space-between',
    marginBottom: 30
  },
  actionItem: {
    width: (width - 60) / 2,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
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
  newsTag: { color: '#ff4d4d', fontSize: 10, fontWeight: '800', marginBottom: 5 },
  newsTitle: { fontSize: 16, fontWeight: '700', marginBottom: 5 },
  newsContent: { fontSize: 13, color: '#666', lineHeight: 18 },
  newsTime: { fontSize: 11, color: '#999', marginTop: 10 }
});
