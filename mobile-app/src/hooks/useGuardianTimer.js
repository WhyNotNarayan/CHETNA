import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import api from '../utils/api';

const WALKING_SPEED_MPM = 75; // 4.5 km/h = 75 meters per minute
const BUFFER_MINUTES = 10;

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

export function useGuardianTimer() {
  const { userData } = useContext(AuthContext);
  const { lang } = useContext(LanguageContext);
  const [activeSession, setActiveSession] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const timerRef = useRef(null);
  const langRef = useRef(lang);

  useEffect(() => { langRef.current = lang; }, [lang]);

  const calculateExpectedExitTime = useCallback((zone, userLat, userLng) => {
    const zoneLat = parseFloat(zone.latitude);
    const zoneLng = parseFloat(zone.longitude);
    const zoneRadius = parseFloat(zone.radius) || 300;

    const distToCenter = getDistance(userLat, userLng, zoneLat, zoneLng);
    const distToEdge = Math.max(0, distToCenter - zoneRadius);
    const exitTimeMinutes = (distToEdge / WALKING_SPEED_MPM) + BUFFER_MINUTES;

    return new Date(Date.now() + exitTimeMinutes * 60 * 1000);
  }, []);

  const startSession = useCallback(async (zone, userLat, userLng) => {
    if (!userData?.id) return;

    try {
      const expectedExitTime = calculateExpectedExitTime(zone, userLat, userLng);
      const alertTime = new Date(expectedExitTime.getTime());

      const res = await api.post('/guardian/start', {
        zoneId: zone.id || zone.zoneId,
        entryTime: new Date().toISOString(),
        expectedExitTime: expectedExitTime.toISOString(),
        alertTime: alertTime.toISOString(),
      });

      if (res.data.success) {
        const session = {
          sessionId: res.data.sessionId,
          zoneId: zone.id || zone.zoneId,
          zoneName: zone.name,
          entryTime: Date.now(),
          expectedExitTime: expectedExitTime.getTime(),
          alertTime: alertTime.getTime(),
        };

        setActiveSession(session);
        await AsyncStorage.setItem('guardian_session', JSON.stringify(session));

        const remainingMs = expectedExitTime.getTime() - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);

        const ln = langRef.current;
        const notifTitle = ln === 'mr' ? '⏰ गार्जियन टाइमर सुरू' : ln === 'hi' ? '⏰ गार्जियन टाइमर शुरू' : '⏰ Guardian Timer Started';
        const notifBody = ln === 'mr' ? `आपल्या सुरक्षेसाठी ${zone.name} मधून ${remainingMin} मिनिटांत बाहेर निघा.` : ln === 'hi' ? `आपकी सुरक्षा के लिए ${zone.name} से ${remainingMin} मिनट में बाहर निकलें।` : `Exit ${zone.name} within ${remainingMin} minutes for your safety.`;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: notifTitle,
            body: notifBody,
            sound: true,
          },
          trigger: null,
        });

        startTimerCountdown(expectedExitTime.getTime());
      }
    } catch (error) {
      console.error('[Guardian] Start session error:', error.message);
    }
  }, [userData, calculateExpectedExitTime]);

  const completeSession = useCallback(async () => {
    if (!activeSession) return;

    try {
      await api.post('/guardian/complete', {
        sessionId: activeSession.sessionId,
      });

      setActiveSession(null);
      setTimeRemaining(null);
      await AsyncStorage.removeItem('guardian_session');

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      const ln = langRef.current;
      const cancelTitle = ln === 'mr' ? '✅ गार्जियन टाइमर रद्द' : ln === 'hi' ? '✅ गार्जियन टाइमर रद्द' : '✅ Guardian Timer Cancelled';
      const cancelBody = ln === 'mr' ? 'तुम्ही सुरक्षितपणे क्षेत्र सोडला. टाइमर थांबला.' : ln === 'hi' ? 'आपने सुरक्षित रूप से क्षेत्र छोड़ दिया। टाइमर रोक दिया गया।' : 'You have safely exited the zone. Timer stopped.';

      await Notifications.scheduleNotificationAsync({
        content: {
          title: cancelTitle,
          body: cancelBody,
        },
        trigger: null,
      });
    } catch (error) {
      console.error('[Guardian] Complete session error:', error.message);
    }
  }, [activeSession]);

  const startTimerCountdown = useCallback((targetTimeMs) => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const remaining = targetTimeMs - Date.now();
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        timerRef.current = null;
        setTimeRemaining(0);
        return;
      }
      setTimeRemaining(remaining);
    }, 1000);
  }, []);

  const resumeActiveSession = useCallback(async () => {
    try {
      const savedSession = await AsyncStorage.getItem('guardian_session');
      if (!savedSession) return;

      const session = JSON.parse(savedSession);
      const now = Date.now();

      if (session.alertTime <= now) {
        await AsyncStorage.removeItem('guardian_session');
        return;
      }

      setActiveSession(session);
      startTimerCountdown(session.expectedExitTime);
    } catch (error) {
      console.error('[Guardian] Resume session error:', error.message);
    }
  }, [startTimerCountdown]);

  useEffect(() => {
    resumeActiveSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTimeRemaining = useCallback(() => {
    if (timeRemaining === null || timeRemaining <= 0) return null;

    const totalSeconds = Math.floor(timeRemaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  return {
    activeSession,
    timeRemaining,
    formattedTime: formatTimeRemaining(),
    startSession,
    completeSession,
  };
}
