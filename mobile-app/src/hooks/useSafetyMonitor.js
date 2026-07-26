import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import api from '../utils/api';
import { getLocalRedZones, saveRedZones } from '../database/localDb';
import { isTimeInRange } from '../utils/time';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const VOICE_ALERTS = {
  'SHARP_TURN': "Warning! Sharp turn ahead. Please slow down.",
  'DARK_AREA': "Warning! Low visibility area ahead. Stay alert.",
  'ANIMAL_ZONE': "Warning! Wild animal crossing area ahead.",
  'DEEP_WATER': "Warning! Deep water area. Please swim safely or avoid entering.",
  'ACCIDENT_ZONE': "Warning! Accident-prone area ahead. Proceed with caution.",
  'CRIME': "Warning! Reported unsafe area ahead. Stay alert.",
  'DEFAULT': "Warning! You are approaching a high-risk area. Stay alert."
};

const getVoiceMessage = (zone) => {
  const type = zone.type || '';
  const desc = (zone.warningMessage || zone.description || '').toLowerCase();

  if (type === 'SHARP_TURN' || desc.includes('sharp turn')) return VOICE_ALERTS.SHARP_TURN;
  if (type === 'DARK_AREA' || desc.includes('light')) return VOICE_ALERTS.DARK_AREA;
  if (type === 'ANIMAL_ZONE' || desc.includes('animal')) return VOICE_ALERTS.ANIMAL_ZONE;
  if (type === 'DEEP_WATER' || desc.includes('water') || desc.includes('swim')) return VOICE_ALERTS.DEEP_WATER;
  if (desc.includes('pothole')) return "Warning! Pothole ahead. Drive carefully.";
  if (desc.includes('accident')) return VOICE_ALERTS.ACCIDENT_ZONE;

  return VOICE_ALERTS[type] || VOICE_ALERTS.DEFAULT;
};

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

export function useSafetyMonitor(guardianTimer = null) {
  const [currentZone, setCurrentZone] = useState(null);
  const warnedZones = useRef(new Set());
  const locationWatcher = useRef(null);
  const lastZoneId = useRef(null);
  const zonesRef = useRef([]);

  useEffect(() => {
    const requestNotif = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') console.log('Notification permission not granted');
    };
    requestNotif();
  }, []);

  const fetchZones = async () => {
    try {
      let redZones = await getLocalRedZones();
      if (redZones && redZones.length > 0) {
        const mapped = redZones.map(z => ({
          id: z.id,
          name: z.name,
          latitude: parseFloat(z.latitude),
          longitude: parseFloat(z.longitude),
          radius: parseFloat(z.radius) || 500,
          riskLevel: z.risk_level,
          startTime: z.start_time || z.startTime,
          endTime: z.end_time || z.endTime,
          warningMessage: z.warning_message || z.description,
          type: z.type
        }));
        zonesRef.current = mapped;
      }

      const res = await api.get('/safety/red-zones');
      if (res.data.success && res.data.zones.length > 0) {
        const apiZones = res.data.zones.map(z => ({
          id: z.id,
          name: z.name,
          latitude: z.latitude,
          longitude: z.longitude,
          radius: z.radius || 500,
          riskLevel: z.riskLevel,
          startTime: z.startTime,
          endTime: z.endTime,
          warningMessage: z.warningMessage || z.description,
          type: z.type
        }));
        zonesRef.current = apiZones;
        await saveRedZones(apiZones);
        console.log(`[SafetyMonitor] Loaded ${apiZones.length} zones from server`);
      }
    } catch (e) {
      console.log('[SafetyMonitor] Zone Fetch Error:', e.message || e);
    }
  };

  const checkLocationAgainstZones = async (latitude, longitude) => {
    const zones = zonesRef.current;
    let activeZoneFound = null;

    for (const zone of zones) {
      const radius = zone.radius || 500;
      const dist = getDistance(latitude, longitude, zone.latitude, zone.longitude);

      if (dist <= radius + 100) {
        activeZoneFound = zone;

        if (!warnedZones.current.has(zone.id)) {
          warnedZones.current.add(zone.id);

          const msg = getVoiceMessage(zone);

          Speech.stop();
          Speech.speak(msg, { language: 'en-US', rate: 0.9, pitch: 1.0 });

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `SAFETY ALERT: ${zone.name}`,
              body: msg,
              data: { zoneId: zone.id },
              sound: true,
            },
            trigger: null,
          });

          setTimeout(() => {
            warnedZones.current.delete(zone.id);
          }, 600000);
        }
        break;
      }
    }

    setCurrentZone(activeZoneFound);

    if (guardianTimer) {
      const currentZoneId = activeZoneFound ? (activeZoneFound.id || activeZoneFound.zoneId) : null;
      const prevZoneId = lastZoneId.current;

      if (currentZoneId && !prevZoneId) {
        guardianTimer.startSession(activeZoneFound, latitude, longitude);
      } else if (!currentZoneId && prevZoneId) {
        guardianTimer.completeSession();
      }

      lastZoneId.current = currentZoneId;
    }
  };

  useEffect(() => {
    fetchZones();
    const interval = setInterval(fetchZones, 300000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    const startMonitoring = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('[SafetyMonitor] Location permission denied');
          return;
        }

        locationWatcher.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          async (location) => {
            if (!active) return;
            const { latitude, longitude } = location.coords;
            await checkLocationAgainstZones(latitude, longitude);
          }
        );
        console.log('[SafetyMonitor] Location watcher started');
      } catch (err) {
        console.warn('[SafetyMonitor] Error starting monitor:', err);
      }
    };

    startMonitoring();

    return () => {
      active = false;
      if (locationWatcher.current) {
        locationWatcher.current.remove();
        locationWatcher.current = null;
      }
    };
  }, []);

  return { currentZone };
}
