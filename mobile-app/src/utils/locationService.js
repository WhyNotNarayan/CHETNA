import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const LOCATION_TASK_NAME = 'background-location-task';
const MOVEMENT_THRESHOLD = 100; // 100 meters

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
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  if (background !== 'granted') return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: MOVEMENT_THRESHOLD, // Native optimization
    deferredUpdatesInterval: 60000, // 1 minute
    foregroundService: {
      notificationTitle: "Chetna Safety Active",
      notificationBody: "Protecting you in the background",
    },
  });

  // Initial capture
  const current = await Location.getCurrentPositionAsync({});
  await processLocationUpdate(current.coords);
};

// 5. Stop Tracking
export const stopLocationTracking = async () => {
  const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (isStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
};
