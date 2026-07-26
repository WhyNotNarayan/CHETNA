import { useState, useEffect, useRef, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Vibration, Platform } from 'react-native';

const SHAKE_THRESHOLD = 2.5;
const COOLDOWN_MS = 30000;
const CHECK_INTERVAL = 100;

export function useShakeDetection() {
  const [isShaking, setIsShaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastShakeTime, setLastShakeTime] = useState(0);
  const subscription = useRef(null);
  const lastShake = useRef(0);

  const triggerShake = useCallback(() => {
    const now = Date.now();
    if (now - lastShake.current < COOLDOWN_MS) return;

    lastShake.current = now;
    setLastShakeTime(now);
    setIsShaking(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (e) {}

    try {
      Vibration.vibrate([0, 500, 200, 500]);
    } catch (e) {}

    setTimeout(() => setIsShaking(false), 3000);
  }, []);

  useEffect(() => {
    let isActive = true;

    const startListening = async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!available || !isActive) {
          setIsSupported(false);
          return;
        }

        Accelerometer.setUpdateInterval(CHECK_INTERVAL);

        subscription.current = Accelerometer.addListener((accelerometerData) => {
          if (!isActive) return;

          const { x, y, z } = accelerometerData;
          const force = Math.sqrt(x * x + y * y + z * z);

          if (force > SHAKE_THRESHOLD) {
            triggerShake();
          }
        });
      } catch (error) {
        console.warn('Accelerometer not available:', error);
        setIsSupported(false);
      }
    };

    startListening();

    return () => {
      isActive = false;
      if (subscription.current) {
        subscription.current.remove();
        subscription.current = null;
      }
    };
  }, [triggerShake]);

  return {
    isShaking,
    isSupported,
    lastShakeTime,
    resetShake: () => setIsShaking(false),
  };
}
