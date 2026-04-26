import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { 
  ChevronLeft, 
  PlusCircle, 
  MapPin, 
  ClipboardList, 
  AlertTriangle,
  ShieldAlert,
  Clock,
  Moon,
  Activity,
  Trash2,
  Square
} from 'lucide-react-native';
import api from '../utils/api';
import * as Location from 'expo-location';

// Local database of major Sindhudurg areas for smart search
const SINDHUDURG_AREAS = [
  { name: 'Sawantwadi Market', lat: 15.9015, lng: 73.8184, type: 'AREA' },
  { name: 'Vengurla Bandar', lat: 15.8586, lng: 73.6294, type: 'AREA' },
  { name: 'Malvan Beach', lat: 16.0617, lng: 73.4687, type: 'AREA' },
  { name: 'Kudura Road', lat: 16.0270, lng: 73.6876, type: 'ROAD' },
  { name: 'Kondura', lat: 16.0305, lng: 73.6702, type: 'AREA' },
  { name: 'Malewad', lat: 15.9863, lng: 73.7225, type: 'AREA' },
  { name: 'Tank Road', lat: 15.8824, lng: 73.7431, type: 'ROAD' },
  { name: 'Ubhadanda', lat: 15.8642, lng: 73.6581, type: 'AREA' },
  { name: 'Kudal Town', lat: 16.0125, lng: 73.6917, type: 'AREA' },
  { name: 'Kankavli St', lat: 16.2731, lng: 73.7144, type: 'AREA' },
  { name: 'Shiroda', lat: 15.7831, lng: 73.6814, type: 'AREA' },
];

const { width } = Dimensions.get('window');

const AdminAddCrimeScreen = ({ navigation }) => {
  const [mode, setMode] = useState('AREA'); // 'AREA' or 'ROAD'
  const [areaName, setAreaName] = useState('');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [caseCount, setCaseCount] = useState('');
  const [crimeType, setCrimeType] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('10:00 PM');
  const [endTime, setEndTime] = useState('04:00 AM');
  const [loading, setLoading] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [activePoint, setActivePoint] = useState('START'); 
  const [suggestions, setSuggestions] = useState([]);
  
  // High-precision tracking state
  const [recordedPath, setRecordedPath] = useState([]); 
  const [isRecording, setIsRecording] = useState(false);
  const watchSubscription = useRef(null);

  const [pickedLocation, setPickedLocation] = useState({
    latitude: 16.0270,
    longitude: 73.6876,
  });
  const [destLocation, setDestLocation] = useState({
    latitude: 16.0300,
    longitude: 73.6900,
  });

  const handleSearch = (text, field) => {
    if (field === 'AREA') setAreaName(text);
    if (field === 'FROM') setFromLocation(text);
    if (field === 'TO') setToLocation(text);

    if (text.length > 1) {
      const filtered = SINDHUDURG_AREAS.filter(a => 
        a.name.toLowerCase().includes(text.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const selectSuggestion = (item, field) => {
    if (field === 'AREA') {
      setAreaName(item.name);
      setPickedLocation({ latitude: item.lat, longitude: item.lng });
    }
    if (field === 'FROM') {
      setFromLocation(item.name);
      setPickedLocation({ latitude: item.lat, longitude: item.lng });
    }
    if (field === 'TO') {
      setToLocation(item.name);
      setDestLocation({ latitude: item.lat, longitude: item.lng });
    }
    
    setSuggestions([]);
  };

  useEffect(() => {
    return () => {
      if (watchSubscription.current) {
        watchSubscription.current.remove();
      }
    };
  }, []);

  const smartSnap = async () => {
    if (!pickedLocation || !destLocation) return;
    
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${pickedLocation.longitude},${pickedLocation.latitude};${destLocation.longitude},${destLocation.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(c => ({
          latitude: c[1],
          longitude: c[0]
        }));
        setRecordedPath(coords);
      }
    } catch (error) {
      console.log('Snap error:', error);
    }
  };

  useEffect(() => {
    if (mode === 'ROAD') {
      smartSnap();
    }
  }, [pickedLocation, destLocation, mode]);

  const toggleRecording = async () => {
    if (isRecording) {
      if (watchSubscription.current) {
        watchSubscription.current.remove();
        watchSubscription.current = null;
      }
      setIsRecording(false);
      Alert.alert('Recording Stopped', `Path saved with ${recordedPath.length} points.`);
    } else {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'GPS permission is required to record roads.');
        return;
      }
      
      setRecordedPath([]); // Clear old path
      setIsRecording(true);
      
      watchSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10, // Every 10 meters
        },
        (loc) => {
          const newPoint = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          };
          setRecordedPath(prev => [...prev, newPoint]);
          // Sync pickedLocation to start point
          if (recordedPath.length === 0) setPickedLocation(newPoint);
        }
      );
      Alert.alert('Recording Started', 'Drive the road now. The app will log your path locally.');
    }
  };

  const addManualPoint = (coord) => {
    setRecordedPath(prev => [...prev, coord]);
    if (recordedPath.length === 0) setPickedLocation(coord);
    else setDestLocation(coord);
  };

  const handleAddZone = async () => {
    let finalFrom = fromLocation;
    let finalTo = toLocation;

    if (mode === 'ROAD' && recordedPath.length > 0) {
      if (!finalFrom) finalFrom = 'Marked Start';
      if (!finalTo) finalTo = 'Marked End';
    }

    const finalName = mode === 'ROAD' ? `${finalFrom} To ${finalTo}` : areaName;

    if (mode === 'ROAD' && recordedPath.length === 0 && (!fromLocation || !toLocation)) {
      Alert.alert('Missing Info', 'Please trace the road on the map or provide point names.');
      return;
    }

    if (mode === 'AREA' && !areaName) {
      Alert.alert('Missing Info', 'Please provide the Area name.');
      return;
    }

    if (!caseCount || !crimeType) {
      Alert.alert('Missing Records', 'Please fill in the crime details.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/admin/red-zones', {
        name: finalName,
        latitude: mode === 'ROAD' && recordedPath.length > 0 ? recordedPath[0].latitude : pickedLocation.latitude,
        longitude: mode === 'ROAD' && recordedPath.length > 0 ? recordedPath[0].longitude : pickedLocation.longitude,
        destLatitude: mode === 'ROAD' && recordedPath.length > 0 ? recordedPath[recordedPath.length-1].latitude : (mode === 'ROAD' ? destLocation.latitude : null),
        destLongitude: mode === 'ROAD' && recordedPath.length > 0 ? recordedPath[recordedPath.length-1].longitude : (mode === 'ROAD' ? destLocation.longitude : null),
        pathData: mode === 'ROAD' && recordedPath.length > 0 ? JSON.stringify(recordedPath) : null,
        caseCount: parseInt(caseCount),
        crimeType,
        description,
        startTime,
        endTime,
        radius: mode === 'ROAD' ? 2000 : 500
      });

      if (response.data.success) {
        Alert.alert('Record Saved', `${finalName} is now marked for safety.`);
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save data.');
    } finally {
      setLoading(false);
    }
  };

  const SuggestionList = ({ field }) => (
    suggestions.length > 0 && (
      <View style={styles.suggestionContainer}>
        {suggestions.map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.suggestionItem} 
            onPress={() => selectSuggestion(item, field)}
          >
            <MapPin size={14} color="#FFD700" />
            <Text style={styles.suggestionText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )
  );

  const QuickTag = ({ label, icon: Icon }) => (
    <TouchableOpacity 
      style={styles.tag} 
      onPress={() => {
        const cleanLabel = label.split(' ').slice(1).join(' ') || label;
        setCrimeType(prev => {
          if (!prev) return cleanLabel;
          if (prev.includes(cleanLabel)) return prev;
          return `${prev}, ${cleanLabel}`;
        });
        setDescription(prev => {
          if (!prev) return label;
          if (prev.includes(label)) return prev;
          return `${prev}\n- ${label}`;
        });
      }}
    >
      <View style={styles.tagIconWrapper}>
        <Icon size={14} color="#000" />
      </View>
      <Text style={styles.tagText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color="#FFD700" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mark Danger Zone</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.modeSelector}>
            <TouchableOpacity 
              style={[styles.modeOp, mode === 'AREA' && styles.modeOpActive]} 
              onPress={() => setMode('AREA')}
            >
              <MapPin size={18} color={mode === 'AREA' ? '#000' : '#888'} />
              <Text style={[styles.modeText, mode === 'AREA' && styles.modeTextActive]}>Single Area</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modeOp, mode === 'ROAD' && styles.modeOpActive]} 
              onPress={() => setMode('ROAD')}
            >
              <AlertTriangle size={18} color={mode === 'ROAD' ? '#000' : '#888'} />
              <Text style={[styles.modeText, mode === 'ROAD' && styles.modeTextActive]}>Full Road</Text>
            </TouchableOpacity>
          </View>

          {mode === 'ROAD' && (
            <View style={[styles.recordingCard, isRecording && styles.recordingCardActive]}>
              <View style={styles.recHeader}>
                  <View style={[styles.recDot, isRecording && styles.recDotActive]} />
                  <Text style={styles.recTitle}>{isRecording ? 'LIVE RECORDING ROAD...' : 'GPS Road Tracking'}</Text>
              </View>
              <Text style={styles.recDesc}>
                {isRecording 
                  ? `Logged ${recordedPath.length} pins. Keep driving to trace the curves.`
                  : 'Drive and record the exact path of the dangerous road.'}
              </Text>
              <TouchableOpacity 
                style={[styles.recBtn, isRecording ? styles.recBtnStop : styles.recBtnStart]}
                onPress={toggleRecording}
              >
                {isRecording ? <Square size={16} color="#fff" /> : <Activity size={16} color="#000" />}
                <Text style={[styles.recBtnText, { color: isRecording ? '#fff' : '#000' }]}>
                  {isRecording ? 'STOP & SAVE PATH' : 'START LIVE DRIVE-TRACE'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === 'AREA' ? (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Area Name</Text>
              <View style={styles.inputWrapper}>
                <MapPin size={20} color="#666" style={{ marginRight: 10 }} />
                <TextInput 
                  style={styles.input}
                  placeholder="e.g. Sawantwadi Market"
                  placeholderTextColor="#444"
                  value={areaName}
                  onChangeText={(t) => handleSearch(t, 'AREA')}
                />
              </View>
              <SuggestionList field="AREA" />
            </View>
          ) : (
            <View style={styles.roadGroup}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Starting Point</Text>
                <View style={styles.inputWrapper}>
                  <MapPin size={20} color="#666" style={{ marginRight: 10 }} />
                  <TextInput 
                    style={styles.input}
                    placeholder="e.g. Kondura"
                    placeholderTextColor="#444"
                    value={fromLocation}
                    onChangeText={(t) => handleSearch(t, 'FROM')}
                  />
                </View>
                <SuggestionList field="FROM" />
              </View>
              <View style={styles.roadDivider}>
                <View style={styles.line} />
                <Text style={styles.toText}>TO</Text>
                <View style={styles.line} />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Destination Point</Text>
                <View style={styles.inputWrapper}>
                  <MapPin size={20} color="#666" style={{ marginRight: 10 }} />
                  <TextInput 
                    style={styles.input}
                    placeholder="e.g. Malewad"
                    placeholderTextColor="#444"
                    value={toLocation}
                    onChangeText={(t) => handleSearch(t, 'TO')}
                  />
                </View>
                <SuggestionList field="TO" />
              </View>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Visual Mapping (Pinned Points)</Text>
            {mode === 'AREA' ? (
              <TouchableOpacity style={styles.mapSelector} onPress={() => { setActivePoint('START'); setMapModalVisible(true); }}>
                <View style={styles.mapPreviewInfo}>
                  <MapPin size={22} color="#FFD700" />
                  <View style={{ marginLeft: 15 }}>
                    <Text style={styles.coordinateText}>{pickedLocation.latitude.toFixed(4)}, {pickedLocation.longitude.toFixed(4)}</Text>
                    <Text style={styles.coordinateSubText}>Set center point on map</Text>
                  </View>
                </View>
                <View style={styles.changeBadge}>
                  <Text style={styles.changeBadgeText}>PICK</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 10 }}>
                <TouchableOpacity style={styles.mapSelector} onPress={() => { setActivePoint('START'); setMapModalVisible(true); }}>
                  <View style={styles.mapPreviewInfo}>
                    <View style={[styles.pointDot, { backgroundColor: '#FFD700' }]} />
                    <View style={{ marginLeft: 15 }}>
                      <Text style={styles.coordinateText}>Start Point</Text>
                      <Text style={styles.coordinateSubText}>{pickedLocation.latitude.toFixed(4)}, {pickedLocation.longitude.toFixed(4)}</Text>
                    </View>
                  </View>
                  <View style={styles.changeBadge}>
                    <Text style={styles.changeBadgeText}>SET START</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.mapSelector} onPress={() => { setActivePoint('END'); setMapModalVisible(true); }}>
                  <View style={styles.mapPreviewInfo}>
                    <View style={[styles.pointDot, { backgroundColor: '#FF4444' }]} />
                    <View style={{ marginLeft: 15 }}>
                      <Text style={styles.coordinateText}>End Point</Text>
                      <Text style={styles.coordinateSubText}>{destLocation.latitude.toFixed(4)}, {destLocation.longitude.toFixed(4)}</Text>
                    </View>
                  </View>
                  <View style={styles.changeBadge}>
                    <Text style={styles.changeBadgeText}>SET END</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quick Suggestions</Text>
            <View style={styles.tagRow}>
              <QuickTag label="🐘 Wild Animals" icon={AlertTriangle} />
              <QuickTag label="🌘 No Lights" icon={Moon} />
              <QuickTag label="🚧 Construction" icon={ShieldAlert} />
              <QuickTag label="🍷 Drunkards" icon={ShieldAlert} />
              <QuickTag label="⚠️ Accident Prone" icon={Activity} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Active Danger Hours (12H AM/PM)</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={[styles.inputWrapper, { flex: 1, marginRight: 10 }]}>
                <Clock size={16} color="#666" style={{ marginRight: 8 }} />
                <TextInput 
                  style={styles.input}
                  placeholder="10:00 PM"
                  placeholderTextColor="#444"
                  value={startTime}
                  onChangeText={setStartTime}
                />
              </View>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Moon size={16} color="#666" style={{ marginRight: 8 }} />
                <TextInput 
                  style={styles.input}
                  placeholder="04:00 AM"
                  placeholderTextColor="#444"
                  value={endTime}
                  onChangeText={setEndTime}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Number of Cases Filed</Text>
            <View style={styles.inputWrapper}>
              <ClipboardList size={20} color="#666" style={{ marginRight: 10 }} />
              <TextInput 
                style={styles.input}
                placeholder="Total cases"
                placeholderTextColor="#444"
                keyboardType="numeric"
                value={caseCount}
                onChangeText={setCaseCount}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type of Crime</Text>
            <View style={styles.inputWrapper}>
              <ShieldAlert size={20} color="#666" style={{ marginRight: 10 }} />
              <TextInput 
                style={styles.input}
                placeholder="e.g. Theft, Harassment"
                placeholderTextColor="#444"
                value={crimeType}
                onChangeText={setCrimeType}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Detailed Description</Text>
            <TextInput 
              style={[styles.input, styles.textArea]}
              placeholder="What specifically happened here?"
              placeholderTextColor="#444"
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, loading && { opacity: 0.7 }]} 
            onPress={handleAddZone}
            disabled={loading}
          >
            <PlusCircle size={22} color="#000" style={{ marginRight: 10 }} />
            <Text style={styles.submitText}>{loading ? 'Saving...' : 'Commit Crime Record'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={mapModalVisible} animationType="slide" transparent>
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalContent}>
            <View style={styles.mapModalHeader}>
              <Text style={styles.mapModalTitle}>Pinpoint Case Location</Text>
              <TouchableOpacity onPress={() => setMapModalVisible(false)}>
                <Text style={styles.closeText}>CLOSE</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
              <TouchableOpacity style={[styles.gpsBtn, { flex: 1, backgroundColor: isRecording ? '#FF4444' : '#FFD700' }]} onPress={toggleRecording}>
                <Activity size={18} color={isRecording ? '#fff' : '#000'} />
                <Text style={[styles.gpsBtnText, { color: isRecording ? '#fff' : '#000' }]}>{isRecording ? 'Stop Recording' : 'Start GPS Trace'}</Text>
              </TouchableOpacity>
              
              {recordedPath.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: '#333', borderBottomWidth: 0, paddingHorizontal: 15 }]} onPress={() => setRecordedPath(prev => prev.slice(0, -1))}>
                    <ChevronLeft size={20} color="#FFD700" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.gpsBtn, { backgroundColor: '#FF4444', borderBottomWidth: 0, paddingHorizontal: 15 }]} onPress={() => setRecordedPath([])}>
                    <Trash2 size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            <View style={styles.mapFrame}>
               <MapView
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                  ...(recordedPath.length > 0 ? recordedPath[recordedPath.length-1] : pickedLocation),
                  latitudeDelta: 0.05,
                  longitudeDelta: 0.05,
                }}
                onPress={(e) => {
                  if (mode === 'ROAD') {
                    addManualPoint(e.nativeEvent.coordinate);
                  } else {
                    setPickedLocation(e.nativeEvent.coordinate);
                  }
                }}
               >
                {recordedPath.length > 0 ? (
                  <>
                    <Polyline 
                      coordinates={recordedPath}
                      strokeColor="#FFD700"
                      strokeWidth={6}
                    />
                    <Marker coordinate={recordedPath[0]} title="Start">
                        <View style={{ backgroundColor: '#FFD700', padding: 4, borderRadius: 10, borderWidth: 2, borderColor: '#000' }}>
                           <MapPin size={12} color="#000" />
                        </View>
                    </Marker>
                    <Marker coordinate={recordedPath[recordedPath.length-1]} title="Current End">
                        <View style={{ backgroundColor: '#FF4444', padding: 4, borderRadius: 10, borderWidth: 2, borderColor: '#fff' }}>
                           <MapPin size={12} color="#fff" />
                        </View>
                    </Marker>
                  </>
                ) : (
                  <>
                    <Marker coordinate={pickedLocation} pinColor="#FFD700" title="Point" />
                    {mode === 'ROAD' && <Marker coordinate={destLocation} pinColor="#FF4444" title="End" />}
                  </>
                )}
               </MapView>
               <View style={styles.mapTip}>
                 <Text style={styles.mapTipText}>
                   {mode === 'ROAD' ? `Tracing: ${recordedPath.length} points logged` : 'Tap to set location'}
                 </Text>
               </View>
            </View>
            <TouchableOpacity style={styles.confirmBtn} onPress={() => setMapModalVisible(false)}>
              <Text style={styles.confirmText}>Confirm & Save Road Shape</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 25 },
  inputGroup: { marginBottom: 25 },
  label: { color: '#888', fontSize: 12, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
  modeSelector: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 15, padding: 5, marginBottom: 25, borderWidth: 1, borderColor: '#333' },
  modeOp: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },
  modeOpActive: { backgroundColor: '#FFD700' },
  modeText: { color: '#888', marginLeft: 8, fontWeight: 'bold' },
  modeTextActive: { color: '#000' },
  roadDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: -15, zIndex: 1 },
  line: { flex: 1, height: 1, backgroundColor: '#333' },
  toText: { color: '#FFD700', fontSize: 10, fontWeight: 'bold', marginHorizontal: 10, backgroundColor: '#000', padding: 5, borderRadius: 5 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 5 },
  tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  tagIconWrapper: { backgroundColor: '#FFD700', padding: 4, borderRadius: 6, marginRight: 8 },
  tagText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#333', paddingHorizontal: 15 },
  input: { flex: 1, height: 50, color: '#FFF', fontSize: 16 },
  textArea: { height: 100, backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#333', padding: 15, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#FFD700', height: 60, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  submitText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  mapSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#333' },
  mapPreviewInfo: { flexDirection: 'row', alignItems: 'center' },
  coordinateText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  coordinateSubText: { color: '#888', fontSize: 11 },
  // Recording System Styles
  recordingCard: { backgroundColor: '#111', borderRadius: 20, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#333' },
  recordingCardActive: { borderColor: '#FF4444', backgroundColor: '#1a0d0d' },
  recHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#888', marginRight: 10 },
  recDotActive: { backgroundColor: '#FF4444' },
  recTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  recDesc: { color: '#888', fontSize: 12, marginBottom: 15, lineHeight: 18 },
  recBtn: { height: 45, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  recBtnStart: { backgroundColor: '#FFD700' },
  recBtnStop: { backgroundColor: '#FF4444' },
  recBtnText: { fontWeight: 'bold' },

  changeBadge: { backgroundColor: '#FFD700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  changeBadgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  pointDot: { width: 12, height: 12, borderRadius: 6 },
  mapModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  mapModalContent: { backgroundColor: '#151515', borderRadius: 25, padding: 20, borderWidth: 1, borderColor: '#333' },
  mapModalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  mapModalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  closeText: { color: '#FF4444', fontWeight: 'bold' },
  mapFrame: { height: 350, borderRadius: 20, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
  mapTip: { position: 'absolute', bottom: 10, width: '100%', alignItems: 'center' },
  mapTipText: { backgroundColor: 'rgba(0,0,0,0.7)', color: '#FFD700', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, fontSize: 11 },
  confirmBtn: { backgroundColor: '#FFD700', padding: 18, borderRadius: 15, alignItems: 'center' },
  confirmText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  suggestionContainer: {
    backgroundColor: '#151515',
    borderRadius: 12,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 150,
    overflow: 'hidden'
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  suggestionText: { color: '#FFF', marginLeft: 10, fontSize: 14 },
  gpsBtn: {
    flexDirection: 'row',
    backgroundColor: '#FFD700',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  gpsBtnText: { color: '#000', fontWeight: 'bold', marginLeft: 10 },
});

export default AdminAddCrimeScreen;
