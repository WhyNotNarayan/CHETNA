import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Switch } from 'react-native';
import { ShieldCheck, MapPin, Newspaper, BellRing } from 'lucide-react-native';

export default function BoysDashboard() {
  const [isSecretCop, setIsSecretCop] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Helper Toggle */}
        <View style={styles.helperCard}>
          <View style={styles.helperHeader}>
            <ShieldCheck color={isSecretCop ? "#4CAF50" : "#999"} size={28} />
            <Text style={styles.helperTitle}>Secret Cop Volunteer</Text>
            <Switch 
              value={isSecretCop} 
              onValueChange={setIsSecretCop}
              trackColor={{ false: "#ddd", true: "#4CAF50" }}
            />
          </View>
          <Text style={styles.helperDesc}>
            {isSecretCop 
              ? "You will receive alerts from nearby girls in danger." 
              : "Enable to help maintain safety in your community."}
          </Text>
        </View>

        {/* Active Alerts Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Alerts</Text>
          <BellRing color="#ff4d4d" size={20} />
        </View>

        {isSecretCop ? (
          <View style={styles.alertsList}>
            <AlertItem 
              user="Priya" 
              location="200m away • MG Road" 
              time="JUST NOW" 
              status="CRITICAL"
            />
            <AlertItem 
              user="Unknown" 
              location="500m away • Subhash Chowk" 
              time="5m ago" 
              status="RESOLVED"
            />
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Enable Secret Cop mode to see alerts.</Text>
          </View>
        )}

        {/* Crime News */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Crime News</Text>
        </View>
        <NewsItem 
          title="Vehicle Theft Alert" 
          desc="Multiple bikes stolen near City Mall last night." 
          time="3h ago" 
        />
        <NewsItem 
          title="Safe Route Update" 
          desc="Street lights repaired on Bypass Road." 
          time="1d ago" 
        />

      </ScrollView>
    </SafeAreaView>
  );
}

const AlertItem = ({ user, location, time, status }) => (
  <TouchableOpacity style={styles.alertItem}>
    <View style={styles.alertLine} />
    <View style={styles.alertContent}>
      <View style={styles.alertHeader}>
        <Text style={styles.alertUser}>{user}</Text>
        <Text style={[styles.alertStatus, status === 'CRITICAL' && { color: '#ff4d4d' }]}>{status}</Text>
      </View>
      <Text style={styles.alertLoc}>{location}</Text>
      <Text style={styles.alertTime}>{time}</Text>
    </View>
    <TouchableOpacity style={styles.respondBtn}>
      <Text style={styles.respondBtnText}>HELP</Text>
    </TouchableOpacity>
  </TouchableOpacity>
);

const NewsItem = ({ title, desc, time }) => (
  <View style={styles.newsItem}>
    <View style={styles.newsIcon}><Newspaper color="#6200ee" size={20} /></View>
    <View style={styles.newsText}>
      <Text style={styles.newsTitle}>{title}</Text>
      <Text style={styles.newsDesc}>{desc}</Text>
      <Text style={styles.newsTime}>{time}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { padding: 20 },
  helperCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
    elevation: 4,
  },
  helperHeader: { flexDirection: 'row', alignItems: 'center' },
  helperTitle: { flex: 1, marginLeft: 12, fontSize: 18, fontWeight: '700' },
  helperDesc: { marginTop: 10, color: '#666', fontSize: 13, lineHeight: 18 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },

  alertsList: { marginBottom: 20 },
  alertItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    alignItems: 'center',
    paddingRight: 15
  },
  alertLine: { width: 6, height: '100%', backgroundColor: '#ff4d4d' },
  alertContent: { flex: 1, padding: 15 },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  alertUser: { fontSize: 16, fontWeight: '700' },
  alertStatus: { fontSize: 10, fontWeight: '900', color: '#4CAF50' },
  alertLoc: { fontSize: 13, color: '#666', marginTop: 4 },
  alertTime: { fontSize: 11, color: '#999', marginTop: 8 },
  respondBtn: { 
    backgroundColor: '#ff4d4d', 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    borderRadius: 10 
  },
  respondBtnText: { color: 'white', fontWeight: '900', fontSize: 12 },

  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#999', textAlign: 'center' },

  newsItem: { flexDirection: 'row', backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15 },
  newsIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0e6ff', justifyContent: 'center', alignItems: 'center' },
  newsText: { flex: 1, marginLeft: 15 },
  newsTitle: { fontSize: 16, fontWeight: '700' },
  newsDesc: { fontSize: 13, color: '#666', marginTop: 4 },
  newsTime: { fontSize: 11, color: '#999', marginTop: 8 }
});
