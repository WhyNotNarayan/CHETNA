import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import api from '../utils/api';
import { getLocalRedZones, saveRedZones } from '../database/localDb';
import { isTimeInRange } from '../utils/time';

// Configure how notifications look when app is in foreground
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
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useSafetyMonitor() {
  const [currentZone, setCurrentZone] = useState(null);
  const [allZones, setAllZones] = useState([]);
  const warnedZones = useRef(new Set());
  const locationWatcher = useRef(null);

  useEffect(() => {
    // Request notification permissions
    const requestNotif = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') console.log('Notification permission not granted');
    };
    requestNotif();
  }, []);

  const fetchZones = async () => {
    try {
      // Try local SQLite first
      let redZones = await getLocalRedZones();
      if (redZones && redZones.length > 0) {
        setAllZones(redZones.map(z => ({
          id: z.id,
          name: z.name,
          latitude: parseFloat(z.latitude),
          longitude: parseFloat(z.longitude),
          radius: parseFloat(z.radius) || 100, // Default 100m
          riskLevel: z.risk_level,
          startTime: z.start_time || z.startTime,
          endTime: z.end_time || z.endTime,
          warningMessage: z.warning_message || z.description,
          type: z.type
        })));
      }

      // Sync with remote
      const res = await api.get('/safety/red-zones');
      if (res.data.success) {
        setAllZones(res.data.zones);
        // Save to local SQLite for offline access
        await saveRedZones(res.data.zones);
      }
    } catch (e) {
      console.log('Zone Fetch Error:', e);
    }
  };

  useEffect(() => {
    fetchZones();
    const interval = setInterval(fetchZones, 300000); // Refresh zones every 5 mins
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    const startMonitoring = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        locationWatcher.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: 5,
          },
          async (location) => {
            if (!active) return;
            const { latitude, longitude } = location.coords;
            let activeZoneFound = null;

            for (const zone of allZones) {
              // 1. Time Check
              if (!isTimeInRange(zone.startTime, zone.endTime)) continue;

              // 2. Distance Check
              const radius = zone.radius || 100;
              const dist = getDistance(latitude, longitude, zone.latitude, zone.longitude);

              if (dist <= radius + 20) {
                activeZoneFound = zone;

                // 3. One-time Voice & Push Alert per entry
                if (!warnedZones.current.has(zone.id)) {
                  warnedZones.current.add(zone.id);

                  const msg = getVoiceMessage(zone);

                  // AI VOICE ALERT
                  Speech.stop();
                  Speech.speak(msg, {
                    language: 'en-US',
                    rate: 0.9,
                    pitch: 1.0
                  });

                  // AI SYSTEM NOTIFICATION
                  await Notifications.scheduleNotificationAsync({
                    content: {
                      title: `⚠️ AI SAFETY ALERT: ${zone.name}`,
                      body: msg,
                      data: { zoneId: zone.id },
                      sound: true,
                    },
                    trigger: null, // Send immediately
                  });

                  // Reset warning flag after 10 minutes to allow re-alert
                  setTimeout(() => {
                    warnedZones.current.delete(zone.id);
                  }, 600000);
                }
                break;
              }
            }

            setCurrentZone(activeZoneFound);
          }
        );
      } catch (err) {
        console.warn('Error in safety monitor:', err);
      }
    };

    if (allZones.length > 0) {
      startMonitoring();
    }

    return () => {
      active = false;
      if (locationWatcher.current) {
        locationWatcher.current.remove();
      }
    };
  }, [allZones]);

  return { currentZone };
}
