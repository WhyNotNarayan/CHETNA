import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Modal
} from 'react-native';
import {
  ChevronLeft, CheckCircle, XCircle, User, Briefcase,
  MapPin, Phone, MessageSquare, AlertTriangle, ShieldCheck,
  Eye, Navigation2
} from 'lucide-react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import api from '../utils/api';

const AdminManageSecretCopsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('reports'); // 'applicants', 'reports', or 'map'
  const [pendingUsers, setPendingUsers] = useState([]);
  const [verifiedUsers, setVerifiedUsers] = useState([]);
  const [intelRequests, setIntelRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Intel Reports
      const intelRes = await api.get('/admin/intel-requests');
      if (intelRes.data.success) setIntelRequests(intelRes.data.requests);

      // 2. Fetch Pending Applicants
      const pendingRes = await api.get('/admin/pending-secret-cops');
      if (pendingRes.data.success) setPendingUsers(pendingRes.data.users);

      // 3. Fetch Verified Cops for Map
      const verifiedRes = await api.get('/admin/verified-secret-cops');
      if (verifiedRes.data.success) setVerifiedUsers(verifiedRes.data.users);
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleUserAction = async (userId, action) => {
    try {
      const response = await api.post('/admin/verify-secret-cop', { userId, action });
      if (response.data.success) {
        Alert.alert('Success', `User ${action}d.`);
        setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      }
    } catch (error) {
      Alert.alert('Error', 'Action failed');
    }
  };

  const handleIntelAction = async (reportId, action) => {
    try {
      const response = await api.post('/admin/verify-intel', { reportId, action });
      if (response.data.success) {
        Alert.alert('Success', `Intelligence ${action}d. Rank updated.`);
        setIntelRequests(intelRequests.filter(r => r.id !== reportId));
      }
    } catch (error) {
      Alert.alert('Error', 'Action failed');
    }
  };

  const openInMap = (lat, lng) => {
    const url = Platform.select({
      ios: `maps:0,0?q=DangerPoint@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(DangerPoint)`
    });
    Linking.openURL(url);
  };

  const renderIntelCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.reporterBadge}>
          <ShieldCheck size={14} color="#FFD700" />
          <Text style={styles.badgeText}>SECRET COP REPORT</Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => {
              setSelectedReport(item);
              setShowMapModal(true);
            }}
            style={[styles.mapBtn, { backgroundColor: '#3B82F6' }]}
          >
            <Eye size={12} color="#FFF" />
            <Text style={styles.mapBtnText}>VIEW MAP</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openInMap(item.latitude, item.longitude)} style={styles.mapBtn}>
            <MapPin size={12} color="#FFF" />
            <Text style={styles.mapBtnText}>GOOGLE</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.locationName}>{item.name}</Text>
      {item.pathData ? (
        <View style={styles.roadBadge}>
          <ShieldCheck size={12} color="#EF4444" />
          <Text style={styles.roadText}>CURVY ROAD PATH CAPTURED</Text>
        </View>
      ) : item.destLatitude && (
        <View style={styles.roadBadge}>
          <Navigation2 size={12} color="#EF4444" />
          <Text style={styles.roadText}>FULL ROAD PATH (START ➔ END)</Text>
        </View>
      )}
      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.divider} />

      {/* Reporter Info Card Section */}
      <View style={styles.reporterInfo}>
        <View style={styles.row}>
          <User size={16} color="#888" />
          <Text style={styles.infoValue}>{item.user?.fullName}</Text>
        </View>
        <View style={styles.row}>
          <Phone size={16} color="#888" />
          <Text style={styles.infoValue}>{item.user?.phone}</Text>
        </View>
        <View style={styles.row}>
          <MapPin size={16} color="#888" />
          <Text style={styles.infoValue}>{item.user?.address || 'Sindhudurg, MH'}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => handleIntelAction(item.id, 'reject')}
        >
          <XCircle size={18} color="#FF4444" />
          <Text style={styles.rejectText}>REJECT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={() => handleIntelAction(item.id, 'approve')}
        >
          <CheckCircle size={18} color="#00C851" />
          <Text style={styles.approveText}>APPROVE & RANK UP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderApplicantCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.userHeader}>
        <View style={styles.avatar}>
          <User size={24} color="#FFD700" />
        </View>
        <View>
          <Text style={styles.userName}>{item.fullName}</Text>
          <Text style={styles.userPhone}>{item.phone}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Briefcase size={16} color="#888" />
        <Text style={styles.detailText}>{item.profession || 'Not specified'}</Text>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => handleUserAction(item.id, 'reject')}
        >
          <XCircle size={18} color="#FF4444" />
          <Text style={styles.rejectText}>REJECT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.approveBtn]}
          onPress={() => handleUserAction(item.id, 'approve')}
        >
          <CheckCircle size={18} color="#00C851" />
          <Text style={styles.approveText}>APPROVE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Secret Cop Manager</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
          onPress={() => setActiveTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>Intel Reports</Text>
          {intelRequests.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeNumber}>{intelRequests.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applicants' && styles.activeTab]}
          onPress={() => setActiveTab('applicants')}
        >
          <Text style={[styles.tabText, activeTab === 'applicants' && styles.activeTabText]}>Applicants</Text>
          {pendingUsers.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeNumber}>{pendingUsers.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>Live Map</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      ) : activeTab === 'map' ? (
        <View style={{ flex: 1 }}>
          <MapView
            style={{ flex: 1 }}
            theme="dark"
            initialRegion={{
              latitude: 16.0271,
              longitude: 73.6888,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            }}
          >
            {verifiedUsers.filter(u => u.latitude && u.longitude).map(user => (
              <Marker
                key={user.id}
                coordinate={{ 
                  latitude: parseFloat(user.latitude), 
                  longitude: parseFloat(user.longitude) 
                }}
                title={user.fullName}
                description={`${user.profession} • ${user.status === 'LIVE' ? '📡 LIVE TRACKING' : '🏠 HOME BASE'}`}
              >
                <View style={[
                  styles.copMarker, 
                  { backgroundColor: user.status === 'LIVE' ? '#10B981' : '#3B82F6' },
                  user.status === 'LIVE' && styles.livePulse
                ]}>
                  <User size={14} color="#FFF" />
                </View>
              </Marker>
            ))}
          </MapView>
          <View style={styles.mapLegend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Live Tracking ({verifiedUsers.filter(u => u.status === 'LIVE').length})</Text>
            </View>
            <View style={[styles.legendRow, { marginTop: 5 }]}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>At Home Base ({verifiedUsers.filter(u => u.status === 'OFFLINE').length})</Text>
            </View>
          </View>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'applicants' ? pendingUsers : intelRequests}
          renderItem={activeTab === 'applicants' ? renderApplicantCard : renderIntelCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending {activeTab} found.</Text>
            </View>
          }
        />
      )}

      {/* 🗺️ INTEL MAP PREVIEW MODAL */}
      <Modal visible={showMapModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowMapModal(false)} style={styles.backBtn}>
              <ChevronLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Intel Path Preview</Text>
          </View>

          <MapView
            style={{ flex: 1 }}
            theme="dark"
            initialRegion={{
              latitude: selectedReport?.latitude || 16.0361,
              longitude: selectedReport?.longitude || 73.5042,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {selectedReport && (
              <>
                <Marker
                  coordinate={{ latitude: selectedReport.latitude, longitude: selectedReport.longitude }}
                  pinColor="#10B981"
                  title="Start Point"
                />
                {selectedReport.destLatitude && (
                  <Marker
                    coordinate={{ latitude: selectedReport.destLatitude, longitude: selectedReport.destLongitude }}
                    pinColor="#EF4444"
                    title="End Point"
                  />
                )}
                {selectedReport.pathData && (
                  <Polyline
                    coordinates={JSON.parse(selectedReport.pathData)}
                    strokeColor="#EF4444"
                    strokeWidth={6}
                    lineJoin="round"
                    lineCap="round"
                  />
                )}
                {!selectedReport.pathData && selectedReport.destLatitude && (
                  <Polyline
                    coordinates={[
                      { latitude: selectedReport.latitude, longitude: selectedReport.longitude },
                      { latitude: selectedReport.destLatitude, longitude: selectedReport.destLongitude }
                    ]}
                    strokeColor="#EF4444"
                    strokeWidth={6}
                    lineJoin="round"
                    lineCap="round"
                  />
                )}
              </>
            )}
          </MapView>

          <View style={styles.mapInfoCard}>
            <Text style={styles.mapInfoTitle}>{selectedReport?.name}</Text>
            <Text style={styles.mapInfoSub}>{selectedReport?.description}</Text>
            <TouchableOpacity
              style={[styles.verifyBtn, { backgroundColor: '#FFD700', marginTop: 15 }]}
              onPress={() => setShowMapModal(false)}
            >
              <Text style={{ fontWeight: 'bold', color: '#000' }}>CLOSE PREVIEW</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#111' },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#111', paddingBottom: 10 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#FFD700' },
  tabText: { color: '#666', fontWeight: 'bold' },
  activeTabText: { color: '#FFD700' },
  list: { padding: 15 },
  card: { backgroundColor: '#151515', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardActions: { flexDirection: 'row', gap: 8 },
  reporterBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: 5, borderRadius: 5 },
  badgeText: { color: '#FFD700', fontSize: 10, fontWeight: 'bold' },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#333', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 },
  mapBtnText: { color: '#FFF', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
  locationName: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  roadBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8, gap: 5 },
  roadText: { color: '#EF4444', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  description: { color: '#AAA', fontSize: 14, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#222', marginVertical: 15 },
  reporterInfo: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoValue: { color: '#DDD', fontSize: 13 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#222' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 12, gap: 8 },
  approveBtn: { backgroundColor: 'rgba(0, 200, 81, 0.1)' },
  rejectBtn: { backgroundColor: 'rgba(255, 68, 68, 0.1)' },
  approveText: { color: '#00C851', fontSize: 12, fontWeight: 'bold' },
  rejectText: { color: '#FF4444', fontSize: 12, fontWeight: 'bold' },
  userHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatar: { width: 45, height: 45, borderRadius: 22, backgroundColor: 'rgba(255, 215, 0, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  userName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  userPhone: { color: '#666', fontSize: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  detailText: { color: '#AAA', fontSize: 14 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, padding: 50, alignItems: 'center' },
  emptyText: { color: '#444', fontSize: 16, textAlign: 'center' },
  mapInfoCard: { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: 'rgba(21,21,21,0.9)', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#333' },
  mapInfoTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  mapInfoSub: { color: '#888', fontSize: 14, marginTop: 5 },
  verifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 45, borderRadius: 12 },
  badge: { position: 'absolute', right: 5, top: 5, backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeNumber: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  copMarker: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 2 },
  livePulse: { borderWidth: 3, borderColor: '#FFF', shadowColor: '#10B981', shadowOpacity: 1, shadowRadius: 10 },
  mapLegend: { position: 'absolute', top: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});

export default AdminManageSecretCopsScreen;
