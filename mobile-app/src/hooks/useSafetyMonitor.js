import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Track which zones the user is currently inside (persisted for exit detection)
const ACTIVE_ZONES_KEY = 'active_zones_inside';

const VOICE_ALERTS = {
  'SHARP_TURN': "Warning! Sharp turn ahead. Please slow down.",
  'DARK_AREA': "Warning! Low visibility area ahead. Stay alert.",
  'ANIMAL_ZONE': "Warning! Wild animal crossing area ahead.",
  'DEEP_WATER': "Warning! Deep water area. Please swim safely or avoid entering.",
  'ACCIDENT_ZONE': "Warning! Accident-prone area ahead. Proceed with caution.",
  'CRIME': "Warning! Reported unsafe area ahead. Stay alert.",
  'POTHOLE': "Warning! Pothole ahead. Drive carefully.",
  'DEFAULT': "Warning! You are approaching a high-risk area. Stay alert."
};

const VOICE_ALERTS_MR = {
  'SHARP_TURN': "सावधान! पुढे वळण आहे. कृपया वेग कमी करा.",
  'DARK_AREA': "सावधान! पुढे कमी दिसणारा भाग आहे. सतर्क रहा.",
  'ANIMAL_ZONE': "सावधान! पुढे वन्य प्राण्यांचा मार्ग आहे. काळजी घ्या.",
  'DEEP_WATER': "सावधान! पुढे खोल पाणी आहे. सुरक्षितपणे पळवा किंवा टाळा.",
  'ACCIDENT_ZONE': "सावधान! पुढे अपघात होण्याची शक्यता आहे. काळजी घ्या.",
  'CRIME': "सावधान! पुढे असुरक्षित भाग आहे. सतर्क रहा.",
  'POTHOLE': "सावधान! पुढे खड्डा आहे. काळजीपूर्वक वाहन चालवा.",
  'DEFAULT': "सावधान! तुम्ही उच्च जोखीम भागाजवळ येत आहात. सतर्क रहा."
};

const VOICE_ALERTS_HI = {
  'SHARP_TURN': "सावधान! आगे तेज़ मोड़ है। कृपया धीरे चलाएं।",
  'DARK_AREA': "सावधान! आगे कम रोशनी वाला क्षेत्र है। सतर्क रहें।",
  'ANIMAL_ZONE': "सावधान! आगे जंगली जानवरों का क्षेत्र है। सावधान रहें।",
  'DEEP_WATER': "सावधान! आगे गहरा पानी है। सुरक्षित रहें या बचें।",
  'ACCIDENT_ZONE': "सावधान! आगे दुर्घटना क्षेत्र है। सावधानी से जाएं।",
  'CRIME': "सावधान! आगे असुरक्षित क्षेत्र है। सतर्क रहें।",
  'POTHOLE': "सावधान! आगे गड्ढा है। धीरे चलाएं।",
  'DEFAULT': "सावधान! आप उच्च जोखिम क्षेत्र के पास पहुंच रहे हैं। सतर्क रहें।"
};

const NOTIF_TITLE = {
  en: (name) => `SAFETY ALERT: ${name}`,
  mr: (name) => `सुरक्षा इशारा: ${name}`,
  hi: (name) => `सुरक्षा चेतावनी: ${name}`,
};

const VOICE_EXIT_EN = "You have left the danger zone. This area is now safe.";
const VOICE_EXIT_MR = "तुम्ही धोकादायक भागाबाहेर आलात. हा भाग आता सुरक्षित आहे.";
const VOICE_EXIT_HI = "आप खतरनाक क्षेत्र से बाहर आ गए हैं। यह क्षेत्र अब सुरक्षित है।";

const NOTIF_SAFE_EXIT = {
  en: (name) => ({ title: `✅ Safe: ${name}`, body: VOICE_EXIT_EN }),
  mr: (name) => ({ title: `✅ सुरक्षित: ${name}`, body: VOICE_EXIT_MR }),
  hi: (name) => ({ title: `✅ सुरक्षित: ${name}`, body: VOICE_EXIT_HI }),
};

async function getLang() {
  try {
    return (await AsyncStorage.getItem('user_lang')) || 'en';
  } catch { return 'en'; }
}

function getLangVoice(lang) {
  if (lang === 'mr') return 'mr-IN';
  if (lang === 'hi') return 'hi-IN';
  return 'en-US';
}

const getKey = (zone) => {
  const type = zone.type || '';
  const desc = (zone.warningMessage || zone.description || '').toLowerCase();
  if (type === 'SHARP_TURN' || desc.includes('sharp turn')) return 'SHARP_TURN';
  if (type === 'DARK_AREA' || desc.includes('light')) return 'DARK_AREA';
  if (type === 'ANIMAL_ZONE' || desc.includes('animal')) return 'ANIMAL_ZONE';
  if (type === 'DEEP_WATER' || desc.includes('water') || desc.includes('swim')) return 'DEEP_WATER';
  if (desc.includes('pothole')) return 'POTHOLE';
  if (type === 'ACCIDENT_ZONE' || desc.includes('accident')) return 'ACCIDENT_ZONE';
  if (type === 'CRIME') return 'CRIME';
  return type || 'DEFAULT';
};

const getVoiceMessage = (zone, lang = 'en') => {
  const key = getKey(zone);
  if (lang === 'mr') return VOICE_ALERTS_MR[key] || VOICE_ALERTS_MR.DEFAULT;
  if (lang === 'hi') return VOICE_ALERTS_HI[key] || VOICE_ALERTS_HI.DEFAULT;
  return VOICE_ALERTS[key] || VOICE_ALERTS.DEFAULT;
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
  const langRef = useRef('en');

  useEffect(() => {
    const requestNotif = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') console.log('Notification permission not granted');
      langRef.current = await getLang();
    };
    requestNotif();

    const langInterval = setInterval(async () => {
      langRef.current = await getLang();
    }, 5000);
    return () => clearInterval(langInterval);
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
      // Skip zones outside their active hours (e.g., night-only crime zones)
      if (!isTimeInRange(zone.startTime, zone.endTime)) continue;

      const radius = zone.radius || 500;
      const dist = getDistance(latitude, longitude, zone.latitude, zone.longitude);

      if (dist <= radius + 100) {
        activeZoneFound = zone;

        if (!warnedZones.current.has(zone.id)) {
          warnedZones.current.add(zone.id);

          const lang = langRef.current;
          const msg = getVoiceMessage(zone, lang);

          Speech.stop();
          Speech.speak(msg, { language: getLangVoice(lang), rate: 0.9, pitch: 1.0 });

          const titleFn = NOTIF_TITLE[lang] || NOTIF_TITLE.en;
          await Notifications.scheduleNotificationAsync({
            content: {
              title: titleFn(zone.name),
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

    // Exit detection: user was inside a zone but is now outside
    const currentZoneId = activeZoneFound ? activeZoneFound.id : null;
    const prevZoneId = lastZoneId.current;

    if (prevZoneId && !currentZoneId) {
      // User left the zone — send "area is safe" notification
      const exitedZone = zones.find(z => z.id === prevZoneId);
      if (exitedZone) {
        const lang = langRef.current;
        const exitMsg = lang === 'mr' ? VOICE_EXIT_MR : lang === 'hi' ? VOICE_EXIT_HI : VOICE_EXIT_EN;

        Speech.stop();
        Speech.speak(exitMsg, { language: getLangVoice(lang), rate: 0.9, pitch: 1.0 });

        const exitNotifFn = NOTIF_SAFE_EXIT[lang] || NOTIF_SAFE_EXIT.en;
        const exitNotif = exitNotifFn(exitedZone.name);
        await Notifications.scheduleNotificationAsync({
          content: {
            title: exitNotif.title,
            body: exitNotif.body,
            data: { zoneId: exitedZone.id, type: 'zone_exit' },
            sound: true,
          },
          trigger: null,
        });
      }
    }
    lastZoneId.current = currentZoneId;

    setCurrentZone(activeZoneFound);

    if (guardianTimer) {
      if (currentZoneId && !prevZoneId) {
        guardianTimer.startSession(activeZoneFound, latitude, longitude);
      } else if (!currentZoneId && prevZoneId) {
        guardianTimer.completeSession();
      }
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
