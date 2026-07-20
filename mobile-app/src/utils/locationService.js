import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Battery from 'expo-battery';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const LOCATION_TASK_NAME = 'background-location-task';
const MOVEMENT_THRESHOLD = 100; // 100 meters
const LOW_BATTERY_THRESHOLD = 0.15;
const GPS_HISTORY_INTERVAL = 300000; // 5 minutes

// 1. Define the Background Task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const newLocation = locations[0];
    if (newLocation) {
      await processLocationUpdate(newLocation.coords);
    }
  }
});

// 2. Logic to process and filter updates (100m rule)
export const processLocationUpdate = async (coords) => {
  try {
    const lastLocationStr = await AsyncStorage.getItem('last_sent_location');
    const lastLocation = lastLocationStr ? JSON.parse(lastLocationStr) : null;

    if (lastLocation) {
      const distance = calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        coords.latitude,
        coords.longitude
      );

      // Only send if moved > 100m
      if (distance < MOVEMENT_THRESHOLD) {
        console.log(`📍 Movement small (${Math.round(distance)}m). Skipping API.`);
        return;
      }
    }

    // Attempt to send to backend
    try {
      const response = await api.post('/safety/update-location', {
        latitude: coords.latitude,
        longitude: coords.longitude
      });

      if (response.data.success) {
        await AsyncStorage.setItem('last_sent_location', JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          timestamp: Date.now()
        }));
        console.log('✅ Location synced to cloud');
      }
    } catch (apiError) {
      // Offline Mode: Store locally to sync later
      console.log('📡 Offline: Saving location locally');
      await AsyncStorage.setItem('pending_location_sync', JSON.stringify(coords));
    }

    // GPS History Sync (every 5 minutes)
    try {
      const lastHistoryStr = await AsyncStorage.getItem('last_gps_history_sync');
      const lastHistory = lastHistoryStr ? JSON.parse(lastHistoryStr) : null;
      const now = Date.now();

      if (!lastHistory || (now - lastHistory.timestamp) > GPS_HISTORY_INTERVAL) {
        let batteryLevel = null;
        try {
          const Battery = require('expo-battery');
          batteryLevel = await Battery.getBatteryLevelAsync();
        } catch (e) {}

        await api.post('/safety/gps-history', {
          latitude: coords.latitude,
          longitude: coords.longitude,
          batteryLevel,
        }).catch(() => {});

        await AsyncStorage.setItem('last_gps_history_sync', JSON.stringify({
          timestamp: now,
        }));
      }
    } catch (e) {}
  } catch (e) {
    console.error('Location Processing Error:', e);
  }
};

// 3. Helper: Calculate distance in meters (Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// 4. Start Tracking
export const startLocationTracking = async () => {
  try {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return;

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    if (background !== 'granted') {
      console.log('⚠️ Background location permission not granted. Tracking will stop when app is backgrounded.');
    }

    let batteryLevel = 1;
    try {
      batteryLevel = await Battery.getBatteryLevelAsync();
    } catch (e) {}

    const isLowBattery = batteryLevel < LOW_BATTERY_THRESHOLD;

    const locationConfig = {
      accuracy: isLowBattery ? Location.Accuracy.Low : Location.Accuracy.Balanced,
      distanceInterval: MOVEMENT_THRESHOLD,
      deferredUpdatesInterval: isLowBattery ? 120000 : 60000,
      foregroundService: {
        notificationTitle: "Chetna Safety Active",
        notificationBody: isLowBattery
          ? "Protecting you (low battery — reduced tracking)"
          : "Protecting you in the background",
      },
    };

    if (Platform.OS === 'ios') {
      locationConfig.showsBackgroundLocationIndicator = true;
      locationConfig.activityType = Location.ActivityType.Other;
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, locationConfig);

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await processLocationUpdate(current.coords);

    console.log(`✅ Location tracking started (low battery: ${isLowBattery})`);
  } catch (error) {
    console.error('Failed to start location tracking:', error);
  }
};

// 5. Stop Tracking
export const stopLocationTracking = async () => {
  try {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      console.log('✅ Location tracking stopped');
    }
  } catch (error) {
    console.error('Failed to stop location tracking:', error);
  }
};

// 6. Check if tracking is active
export const isLocationTrackingActive = async () => {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch (error) {
    return false;
  }
};
