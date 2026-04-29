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
  FlatList
} from 'react-native';
import { ChevronLeft, CheckCircle, XCircle, User, Briefcase, MapPin } from 'lucide-react-native';
import api from '../utils/api';

const AdminManageSecretCopsScreen = ({ navigation }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const response = await api.get('/admin/pending-secret-cops');
      if (response.data.success) {
        setPendingUsers(response.data.users);
      }
    } catch (error) {
      console.error('Fetch Pending Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleAction = async (userId, action) => {
    try {
      const response = await api.post('/admin/verify-secret-cop', { userId, action });
      if (response.data.success) {
        Alert.alert('Success', `User has been ${action === 'approve' ? 'verified' : 'rejected'}.`);
        setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      }
    } catch (error) {
      Alert.alert('Error', 'Action failed');
    }
  };

  const renderUser = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
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

        <View style={styles.detailRow}>
          <MapPin size={16} color="#888" />
          <Text style={styles.detailText}>{item.workAddress || 'Not specified'}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.actionBtn, styles.rejectBtn]} 
          onPress={() => handleAction(item.id, 'reject')}
        >
          <XCircle size={20} color="#FF4444" />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionBtn, styles.approveBtn]} 
          onPress={() => handleAction(item.id, 'approve')}
        >
          <CheckCircle size={20} color="#00C851" />
          <Text style={styles.approveText}>Approve</Text>
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
        <Text style={styles.headerTitle}>Manage Secret Cops</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FFD700" />
        </View>
      ) : (
        <FlatList
          data={pendingUsers}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No pending applications found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#111' },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  list: { padding: 15 },
  userCard: { backgroundColor: '#151515', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#222' },
  userHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  avatar: { width: 45, height: 45, borderRadius: 22, backgroundColor: 'rgba(255, 215, 0, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  userName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  userPhone: { color: '#666', fontSize: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  detailText: { color: '#AAA', fontSize: 14 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#222' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, gap: 8 },
  approveBtn: { backgroundColor: 'rgba(0, 200, 81, 0.1)' },
  rejectBtn: { backgroundColor: 'rgba(255, 68, 68, 0.1)' },
  approveText: { color: '#00C851', fontWeight: 'bold' },
  rejectText: { color: '#FF4444', fontWeight: 'bold' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, padding: 50, alignItems: 'center' },
  emptyText: { color: '#444', fontSize: 16, textAlign: 'center' }
});

export default AdminManageSecretCopsScreen;
