import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform, Dimensions, StatusBar
} from 'react-native';
import MapView, { Marker, Polyline, Circle } from '../components/MapWrapper';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Navigation, Search, X, Play, Square, AlertTriangle,
  ChevronLeft, MapPin, Clock, Volume2
} from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';
import api from '../utils/api';

const { width, height } = Dimensions.get('window');

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseTime(timeStr) {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(' ');
  if (parts.length < 2) return null;
  const [time, period] = parts;
  let [hours, minutes] = time.split(':').map(Number);
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

function isTimeInRange(startTime, endTime) {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  if (!start || !end) return true;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = start.hours * 60 + start.minutes;
  const endMins = end.hours * 60 + end.minutes;
  if (startMins <= endMins) return nowMins >= startMins && nowMins <= endMins;
  return nowMins >= startMins || nowMins <= endMins;
}

function shouldAlert(zone) {
  const type = (zone.crimeType || '').toLowerCase();
  if (type.includes('sharp')) return true;
  return isTimeInRange(zone.startTime, zone.endTime);
}

function buildVoiceMsg(zone, lang) {
  const name = zone.name || 'Danger Zone';
  const type = zone.crimeType || 'Danger';
  if (lang === 'mr') return `सावधान! ${name} जवळ ${type} आहे. काळजी घ्या.`;
  if (lang === 'hi') return `सावधान! ${name} के पास ${type} है। सतर्क रहें।`;
  return `Warning! You are approaching ${name}. ${type} ahead. Please be careful.`;
}

// ─────────────────────────────────────────────
//  MAIN SCREEN
// ─────────────────────────────────────────────

export default function AINavigatorScreen({ navigation }) {
  const { themeMode } = useContext(ThemeContext);
  const { lang, t } = useContext(LanguageContext);

  const mapRef = useRef(null);
  const locationWatcher = useRef(null);
  const alertedZones = useRef(new Set());

  const [currentLocation, setCurrentLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [destination, setDestination] = useState(null);
  const [allRoutes, setAllRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [dangerZones, setDangerZones] = useState([]);
  const [filteredDangers, setFilteredDangers] = useState([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [activeAlertZone, setActiveAlertZone] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    initLocation();
    fetchDangerZones();
    return () => stopNavigation();
  }, []);

  // 🎯 NEW: Debounced Live Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 2 && !destination) {
        handleSearch();
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const initLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setCurrentLocation(coords);
    mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 800);
  };

  const fetchDangerZones = async () => {
    try {
      const res = await api.get('/admin/red-zones');
      if (res.data.success) setDangerZones(res.data.zones);
    } catch (e) { console.warn('Danger zone load error'); }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&countrycodes=in`, { headers: { 'User-Agent': 'ChetnaApp/1.0' } });
      const data = await response.json();
      setSearchResults(data);
    } catch (e) { Alert.alert('Search Error', 'Could not search.'); }
    setIsSearching(false);
  };

  const selectDestination = async (place) => {
    const dest = { latitude: parseFloat(place.lat), longitude: parseFloat(place.lon), name: place.display_name.split(',')[0] };
    setDestination(dest);
    setSearchResults([]);
    setSearchQuery(dest.name);
    setIsLoadingRoute(true);

    try {
      if (!currentLocation) throw new Error('No location');
      const url = `https://router.project-osrm.org/route/v1/driving/${currentLocation.longitude},${currentLocation.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson&alternatives=3`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.routes && data.routes.length > 0) {
        let safestIndex = 0;
        let minDangerCount = Infinity;

        const processed = data.routes.map((route, index) => {
          const coords = route.geometry.coordinates.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
          let routeDangers = 0;
          dangerZones.forEach(zone => {
            if (!shouldAlert(zone)) return;
            const isOn = coords.some(pt => getDistance(pt.latitude, pt.longitude, zone.latitude, zone.longitude) <= (zone.radius || 300));
            if (isOn) routeDangers++;
          });
          if (routeDangers < minDangerCount) { minDangerCount = routeDangers; safestIndex = index; }
          return { ...route, coords, dangerCount: routeDangers, midPoint: coords[Math.floor(coords.length / 2)] };
        });

        // 🎯 NEW: Filter danger zones to only those appearing on any of the 3 routes
        const activeOnRoutes = dangerZones.filter(zone => {
          return processed.some(route => 
            route.coords.some(pt => getDistance(pt.latitude, pt.longitude, zone.latitude, zone.longitude) <= (zone.radius || 400))
          );
        });
        setFilteredDangers(activeOnRoutes);

        setAllRoutes(processed);
        setSelectedRouteIndex(safestIndex);
        updateRouteInfo(processed[safestIndex]);
        mapRef.current?.fitToCoordinates([currentLocation, dest], { edgePadding: { top: 120, right: 40, bottom: 220, left: 40 }, animated: true });
      }
    } catch (e) { console.warn('Route fetch error'); }
    setIsLoadingRoute(false);
  };

  const updateRouteInfo = (route) => {
    setDistance(`${(route.distance / 1000).toFixed(1)} km`);
    setEta(`${Math.round(route.duration / 60)} min`);
  };

  const handleRouteSelect = (index) => {
    setSelectedRouteIndex(index);
    updateRouteInfo(allRoutes[index]);
  };

  const startNavigation = async () => {
    if (!destination) return;
    alertedZones.current.clear();
    setIsNavigating(true);
    const welcome = lang === 'mr' ? `नेव्हिगेशन सुरू. ${destination.name} कडे जात आहे.` : lang === 'hi' ? `नेविगेशन शुरू। ${destination.name} की ओर जा रहे हैं।` : `Starting navigation to ${destination.name}.`;
    Speech.speak(welcome, { language: lang === 'en' ? 'en-US' : 'hi-IN' });

    locationWatcher.current = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 10 }, (loc) => {
      const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setCurrentLocation(pos);
      checkDanger(pos);
      mapRef.current?.animateToRegion({ ...pos, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
    });
  };

  const stopNavigation = () => {
    if (locationWatcher.current) { locationWatcher.current.remove(); locationWatcher.current = null; }
    setIsNavigating(false);
    setActiveAlertZone(null);
    Speech.stop();
  };

  const checkDanger = useCallback((pos) => {
    dangerZones.forEach(zone => {
      const dist = getDistance(pos.latitude, pos.longitude, zone.latitude, zone.longitude);
      if (dist <= (zone.radius || 300)) {
        if (!alertedZones.current.has(zone.id) && shouldAlert(zone)) {
          alertedZones.current.add(zone.id);
          setActiveAlertZone(zone);
          Speech.speak(buildVoiceMsg(zone, lang), { language: lang === 'en' ? 'en-US' : 'hi-IN' });
          setTimeout(() => { setActiveAlertZone(null); alertedZones.current.delete(zone.id); }, 8000);
        }
      }
    });
  }, [dangerZones, lang]);

  const getZoneColor = (zone) => {
    const type = (zone.crimeType || '').toLowerCase();
    if (type.includes('sharp')) return '#FF6B00';
    if (zone.riskLevel >= 4) return '#FF1744';
    return '#FFD600';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        showsUserLocation={true}
        initialRegion={{ latitude: 16.027, longitude: 73.688, latitudeDelta: 0.8, longitudeDelta: 0.8 }}
      >
        {allRoutes.map((route, i) => (
          <Polyline
            key={`r-${i}`}
            coordinates={route.coords}
            strokeColor={i === selectedRouteIndex ? "#00B0FF" : "#B0BEC5"}
            strokeWidth={i === selectedRouteIndex ? 6 : 4}
            zIndex={i === selectedRouteIndex ? 100 : 90}
            tappable={true}
            onPress={() => handleRouteSelect(i)}
          />
        ))}

        {allRoutes.length > 1 && allRoutes.map((route, i) => (
          <Marker key={`b-${i}`} coordinate={route.midPoint} anchor={{ x: 0.5, y: 0.5 }} onPress={() => handleRouteSelect(i)} zIndex={150}>
            <View style={[styles.dangerBadge, i === selectedRouteIndex ? styles.dangerBadgeActive : styles.dangerBadgeDim]}>
              <AlertTriangle color="#FFF" size={12} />
              <Text style={styles.dangerBadgeText}>{route.dangerCount}</Text>
            </View>
          </Marker>
        ))}

        {destination && (
          <Marker coordinate={destination} title={destination.name} zIndex={120}>
            <View style={styles.destMarker}><MapPin color="#FFF" size={20} fill="#FFF" /></View>
          </Marker>
        )}

        {destination && filteredDangers.map((zone) => {
          const color = getZoneColor(zone);
          return (
            <React.Fragment key={zone.id}>
              <Circle center={{ latitude: zone.latitude, longitude: zone.longitude }} radius={zone.radius || 300} fillColor={`${color}22`} strokeColor={color} strokeWidth={1} />
              <Marker coordinate={{ latitude: zone.latitude, longitude: zone.longitude }} zIndex={80}>
                <View style={[styles.zoneMarker, { backgroundColor: color }]}>
                  <Text style={styles.zoneMarkerText}>{(zone.crimeType || '').toLowerCase().includes('sharp') ? '🛞' : '⚠️'}</Text>
                </View>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>

      <SafeAreaView style={styles.topOverlay}>
        <LinearGradient colors={['rgba(0,0,0,0.85)', 'transparent']} style={styles.topGradient}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => { stopNavigation(); navigation.goBack(); }} style={styles.backBtn}><ChevronLeft color="#FFF" size={24} /></TouchableOpacity>
            <View style={styles.titleBlock}><Navigation color="#4FC3F7" size={18} /><Text style={styles.topTitle}>AI Navigator</Text></View>
            <View style={styles.statusDot}><View style={[styles.dot, { backgroundColor: isNavigating ? '#00E676' : '#666' }]} /><Text style={styles.statusText}>{isNavigating ? 'LIVE' : 'IDLE'}</Text></View>
          </View>
          {!isNavigating && (
            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                {isSearching ? <ActivityIndicator color="#888" size="small" /> : <Search color="#888" size={18} />}
                <TextInput style={styles.searchInput} placeholder={t('search_dest')} placeholderTextColor="#888" value={searchQuery} onChangeText={(txt) => { setSearchQuery(txt); if (destination) setDestination(null); }} />
                {searchQuery.length > 0 && <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); setDestination(null); setFilteredDangers([]); }}><X color="#888" size={18} /></TouchableOpacity>}
              </View>
            </View>
          )}
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
                {searchResults.map((p, i) => (
                  <TouchableOpacity key={i} style={styles.resultItem} onPress={() => selectDestination(p)}><MapPin color="#4FC3F7" size={14} /><Text style={styles.resultText} numberOfLines={2}>{p.display_name}</Text></TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </LinearGradient>
      </SafeAreaView>

      {activeAlertZone && (
        <View style={styles.alertBanner}>
          <LinearGradient colors={['#FF1744', '#FF6D00']} style={styles.alertBannerInner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <AlertTriangle color="#FFF" size={24} />
            <View style={styles.alertBannerText}><Text style={styles.alertBannerTitle}>{activeAlertZone.name}</Text><Text style={styles.alertBannerSub}>{activeAlertZone.crimeType}</Text></View>
            <Volume2 color="#FFF" size={20} />
          </LinearGradient>
        </View>
      )}

      <View style={styles.bottomPanel}>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.95)']} style={styles.bottomGradient}>
          {destination && eta && (
            <View style={styles.etaRow}>
              <View style={styles.etaCard}><Clock color="#4FC3F7" size={16} /><Text style={styles.etaValue}>{eta}</Text><Text style={styles.etaLabel}>{t('eta')}</Text></View>
              <View style={styles.etaDivider} /><View style={styles.etaCard}><Navigation color="#4FC3F7" size={16} /><Text style={styles.etaValue}>{distance}</Text><Text style={styles.etaLabel}>{t('distance')}</Text></View>
              <View style={styles.etaDivider} /><View style={styles.etaCard}><AlertTriangle color="#FF6B00" size={16} /><Text style={styles.etaValue}>{allRoutes[selectedRouteIndex]?.dangerCount || 0}</Text><Text style={styles.etaLabel}>{t('active_zones')}</Text></View>
            </View>
          )}
          {destination && <Text style={styles.destName} numberOfLines={1}>📍 {destination.name}</Text>}
          {isLoadingRoute && <View style={styles.loadingRow}><ActivityIndicator color="#4FC3F7" size="small" /><Text style={styles.loadingText}>{t('calc_route')}</Text></View>}
          <TouchableOpacity style={isNavigating ? styles.stopBtn : styles.startBtn} onPress={isNavigating ? stopNavigation : startNavigation} disabled={!destination || isLoadingRoute}>
            <LinearGradient colors={isNavigating ? ['#FF1744', '#C62828'] : ['#1E90FF', '#6A00F4']} style={styles.startBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              {isNavigating ? <Square color="#FFF" size={20} fill="#FFF" /> : <Play color="#FFF" size={20} fill="#FFF" />}
              <Text style={styles.startBtnText}>{isNavigating ? t('stop_nav') : t('start_nav')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topGradient: { paddingHorizontal: 15, paddingBottom: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, marginBottom: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  titleBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  statusDot: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, paddingHorizontal: 14, height: 48, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  searchBtn: { backgroundColor: '#1E90FF', borderRadius: 14, width: 55, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { color: '#FFF', fontWeight: 'bold' },
  resultsContainer: { backgroundColor: '#FFF', borderRadius: 14, marginTop: 5, elevation: 8 },
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  resultText: { flex: 1, fontSize: 13, color: '#333' },
  alertBanner: { position: 'absolute', top: 160, left: 15, right: 15, zIndex: 20, borderRadius: 16, overflow: 'hidden' },
  alertBannerInner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  alertBannerText: { flex: 1 },
  alertBannerTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  alertBannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  bottomPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 },
  bottomGradient: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 30 },
  etaRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 },
  etaCard: { alignItems: 'center', gap: 4 },
  etaValue: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  etaLabel: { color: '#888', fontSize: 11 },
  etaDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  destName: { color: '#CCC', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  loadingText: { color: '#4FC3F7', fontSize: 14 },
  startBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 14 },
  stopBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 14 },
  startBtnGrad: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 18 },
  startBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  destMarker: { backgroundColor: '#1E90FF', padding: 8, borderRadius: 20 },
  zoneMarker: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  zoneMarkerText: { fontSize: 16 },
  dangerBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4, borderWidth: 1 },
  dangerBadgeActive: { backgroundColor: '#FF1744', borderColor: '#FFF' },
  dangerBadgeDim: { backgroundColor: '#607D8B', borderColor: 'rgba(255,255,255,0.5)' },
  dangerBadgeText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' }
});
