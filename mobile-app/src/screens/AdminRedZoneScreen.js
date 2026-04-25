import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  Modal,
  Dimensions
} from 'react-native';
import MapView, { Marker, Circle, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapPin, Plus, Trash2, ShieldAlert, ChevronLeft, Calendar, FileText, Info } from 'lucide-react-native';
import api from '../utils/api';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

const SindhudurgCoords = {
  latitude: 16.0270,
  longitude: 73.6876,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

const AdminRedZoneScreen = ({ navigation }) => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const mapRef = useRef(null);

  // New Zone Form State
  const [areaName, setAreaName] = useState('');
  const [caseCount, setCaseCount] = useState('');
  const [crimeType, setCrimeType] = useState('');
  const [selectedCoords, setSelectedCoords] = useState(null);

  const fetchZones = async () => {
    try {
      const response = await api.get('/admin/red-zones');
      if (response.data.success) {
        setZones(response.data.zones);
      }
    } catch (error) {
      console.error('Fetch Zones Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchZones();
  }, []);

  const handleMapPress = (e) => {
    const coords = e.nativeEvent.coordinate;
    setSelectedCoords(coords);
    setModalVisible(true);
  };

  const handleAddZone = async () => {
    if (!areaName || !caseCount || !crimeType) {
      Alert.alert('Missing Info', 'Please fill in all fields');
      return;
    }

    try {
      const response = await api.post('/admin/red-zones', {
        name: areaName,
        latitude: selectedCoords.latitude,
        longitude: selectedCoords.longitude,
        caseCount: parseInt(caseCount),
        crimeType,
        description: `Manually added via Sindhudurg Map`
      });

      if (response.data.success) {
        Alert.alert('Success', 'Red Zone marked on map');
        setModalVisible(false);
        setAreaName('');
        setCaseCount('');
        setCrimeType('');
        fetchZones();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save zone');
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Zone', 'Remove this data from Sindhudurg records?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/admin/red-zones/${id}`);
          fetchZones();
        } catch (e) { Alert.alert('Error', 'Delete failed'); }
      }}
    ]);
  };

  const getRiskColor = (level, opacity = 1) => {
    switch(level) {
      case 1: return `rgba(0, 200, 81, ${opacity})`;   // Green
      case 2: return `rgba(255, 187, 51, ${opacity})`; // Yellow
      case 3: return `rgba(255, 136, 0, ${opacity})`;  // Orange
      case 4: return `rgba(255, 68, 68, ${opacity})`;  // Light Red
      case 5: return `rgba(204, 0, 0, ${opacity})`;    // Dark Red
      default: return `rgba(136, 136, 136, ${opacity})`;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sindhudurg Map Control</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={SindhudurgCoords}
          onLongPress={handleMapPress}
          userInterfaceStyle="dark"
        >
          {zones.map(zone => (
            <React.Fragment key={zone.id}>
              {/* If it's a road (has dest coords OR has " To " in name), show Polyline */}
              {(zone.destLatitude && zone.destLongitude) || zone.name.includes(' To ') ? (
                <>
                  <Polyline 
                    coordinates={[
                      { latitude: zone.latitude, longitude: zone.longitude },
                      { latitude: zone.destLatitude || (zone.latitude + 0.005), longitude: zone.destLongitude || (zone.longitude + 0.005) }
                    ]}
                    strokeColor={getRiskColor(zone.riskLevel, 0.9)}
                    strokeWidth={6}
                  />
                  {zone.destLatitude && (
                    <Marker coordinate={{ latitude: zone.destLatitude, longitude: zone.destLongitude }}>
                       <View style={[styles.customMarker, { backgroundColor: getRiskColor(zone.riskLevel) }]}>
                          <MapPin color="#fff" size={10} />
                       </View>
                    </Marker>
                  )}
                </>
              ) : (
                <Circle
                  center={{ latitude: zone.latitude, longitude: zone.longitude }}
                  radius={zone.radius || 500}
                  fillColor={getRiskColor(zone.riskLevel, 0.3)}
                  strokeColor={getRiskColor(zone.riskLevel, 0.7)}
                  strokeWidth={2}
                />
              )}
              <Marker
                coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
                title={zone.name}
                description={`${zone.caseCount} cases • Active: ${zone.startTime || '24h'} - ${zone.endTime || '24h'}`}
              >
                <View style={[styles.customMarker, { backgroundColor: getRiskColor(zone.riskLevel) }]}>
                    <ShieldAlert color="#fff" size={12} />
                </View>
              </Marker>
            </React.Fragment>
          ))}
        </MapView>
        
        <View style={styles.mapOverlay}>
          <View style={styles.instructionBox}>
            <Info size={16} color="#FFD700" />
            <Text style={styles.instructionText}>Long-press on map to mark new crime spot</Text>
          </View>
        </View>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.listTitle}>Recorded Crime Data</Text>
        {loading ? (
            <ActivityIndicator size="small" color="#FFD700" style={{ marginTop: 20 }} />
        ) : (
            <FlatList
                data={zones}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.zoneRow}>
                        <View style={[styles.riskDot, { backgroundColor: getRiskColor(item.riskLevel) }]} />
                        <View style={styles.zoneInfo}>
                            <Text style={styles.zoneName}>{item.name}</Text>
                            <Text style={styles.zoneDetails}>
                                {item.caseCount} cases • {item.crimeType} 
                                {item.startTime && ` • 🕒 ${item.startTime}-${item.endTime}`}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleDelete(item.id)}>
                            <Trash2 size={18} color="#444" />
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No data for this area.</Text>}
            />
        )}
      </View>

      {/* Add Zone Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Crime Zone in Sindhudurg</Text>
            <Text style={styles.modalSubtitle}>Location: {selectedCoords?.latitude.toFixed(4)}, {selectedCoords?.longitude.toFixed(4)}</Text>
            
            <TextInput 
              style={styles.input} 
              placeholder="Area Name (e.g. Malvan Jetty)" 
              placeholderTextColor="#666"
              value={areaName}
              onChangeText={setAreaName}
            />
            <TextInput 
              style={styles.input} 
              placeholder="Case Count (1-50+)" 
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={caseCount}
              onChangeText={setCaseCount}
            />
            <TextInput 
              style={styles.input} 
              placeholder="Primary Crime (e.g. Theft/Assault)" 
              placeholderTextColor="#666"
              value={crimeType}
              onChangeText={setCrimeType}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddZone}>
                <Text style={styles.saveText}>Save Zone</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  mapContainer: { flex: 1.5, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  mapOverlay: { position: 'absolute', top: 15, width: '100%', alignItems: 'center' },
  instructionBox: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  instructionText: { color: '#FFD700', fontSize: 12, marginLeft: 8, fontWeight: '600' },
  customMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listSection: {
    flex: 1,
    backgroundColor: '#111',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
  },
  listTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 15,
  },
  riskDot: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  zoneInfo: { flex: 1 },
  zoneName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  zoneDetails: { color: '#888', fontSize: 12, marginTop: 4 },
  emptyText: { color: '#444', textAlign: 'center', marginTop: 50 },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 25,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 25,
    padding: 25,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: { color: '#FFD700', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalSubtitle: { color: '#888', fontSize: 12, marginBottom: 25 },
  input: {
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 15,
    color: '#FFF',
    marginBottom: 15,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { padding: 15, flex: 1, alignItems: 'center' },
  cancelText: { color: '#888', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#FFD700', padding: 15, borderRadius: 12, flex: 2, alignItems: 'center' },
  saveText: { color: '#000', fontWeight: 'bold' },
});

export default AdminRedZoneScreen;
