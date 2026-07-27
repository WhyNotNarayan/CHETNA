import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalRedZones, saveRedZones } from '../database/localDb';
import api from './api';

const SAFETY_CHECK_TASK = 'background-safety-check';
const BATTERY_CHECK_TASK = 'background-battery-check';

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

function isTimeInRange(startTime, endTime) {
  if (!startTime || !endTime) return true;
  try {
    const parseTime = (timeStr) => {
      const parts = timeStr.trim().split(' ');
      if (parts.length < 2) return null;
      const [time, period] = parts;
      let [hours, minutes] = time.split(':').map(Number);
      if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
      if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
      return { hours, minutes };
    };
    const start = parseTime(startTime);
    const end = parseTime(endTime);
    if (!start || !end) return true;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const startMins = start.hours * 60 + start.minutes;
    const endMins = end.hours * 60 + end.minutes;
    if (startMins <= endMins) {
      return nowMins >= startMins && nowMins <= endMins;
    } else {
      return nowMins >= startMins || nowMins <= endMins;
    }
  } catch (e) {
    return true;
  }
}

TaskManager.defineTask(SAFETY_CHECK_TASK, async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return BackgroundFetch.Result.NoData;

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return BackgroundFetch.Result.NoData;

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    if (!location) return BackgroundFetch.Result.NoData;

    const { latitude, longitude } = location.coords;

    let zones = await getLocalRedZones();
    if (!zones || zones.length === 0) {
      try {
        const res = await api.get('/safety/red-zones');
        if (res.data.success && res.data.zones) {
          zones = res.data.zones;
          await saveRedZones(res.data.zones);
        }
      } catch (e) {
        return BackgroundFetch.Result.NoData;
      }
    }

    if (!zones || zones.length === 0) return BackgroundFetch.Result.NoData;

    const lastAlertStr = await AsyncStorage.getItem('last_background_zone_alert');
    const lastAlert = lastAlertStr ? JSON.parse(lastAlertStr) : null;
    const now = Date.now();
    if (lastAlert && (now - lastAlert.timestamp) < 300000) {
      return BackgroundFetch.Result.NoData;
    }

    for (const zone of zones) {
      const zoneLat = parseFloat(zone.latitude);
      const zoneLng = parseFloat(zone.longitude);
      const zoneRadius = parseFloat(zone.radius) || 100;

      if (!isTimeInRange(zone.start_time || zone.startTime, zone.end_time || zone.endTime)) continue;

      const dist = getDistance(latitude, longitude, zoneLat, zoneLng);

      if (dist <= zoneRadius) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `⚠️ Safety Alert: ${zone.name}`,
            body: `You are in a high-risk area. Stay alert and stay safe.`,
            data: { zoneId: zone.id, type: 'background_zone_alert' },
            sound: true,
          },
          trigger: null,
        });

        await AsyncStorage.setItem('last_background_zone_alert', JSON.stringify({
          zoneId: zone.id,
          timestamp: now,
        }));

        try {
          await api.post('/safety/update-location', { latitude, longitude });
        } catch (e) {}

        return BackgroundFetch.Result.NewData;
      }
    }

    return BackgroundFetch.Result.NoData;
  } catch (error) {
    console.error('Background safety check error:', error);
    return BackgroundFetch.Result.Failed;
  }
});

TaskManager.defineTask(BATTERY_CHECK_TASK, async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return BackgroundFetch.Result.NoData;

    const batteryLevel = await Battery.getBatteryLevelAsync();
    const isCharging = await Battery.isChargingAsync();

    await AsyncStorage.setItem('last_battery_check', JSON.stringify({
      level: batteryLevel,
      isCharging,
      timestamp: Date.now(),
    }));

    return BackgroundFetch.Result.NoData;
  } catch (error) {
    return BackgroundFetch.Result.Failed;
  }
});

export const registerBackgroundTasks = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SAFETY_CHECK_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(SAFETY_CHECK_TASK, {
        minimumInterval: 900,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('✅ Background safety check task registered');
    }
  } catch (error) {
    console.error('Failed to register safety check task:', error);
  }

  try {
    const isBatteryRegistered = await TaskManager.isTaskRegisteredAsync(BATTERY_CHECK_TASK);
    if (!isBatteryRegistered) {
      await BackgroundFetch.registerTaskAsync(BATTERY_CHECK_TASK, {
        minimumInterval: 1800,
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log('✅ Background battery check task registered');
    }
  } catch (error) {
    console.error('Failed to register battery check task:', error);
  }
};

export const unregisterBackgroundTasks = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(SAFETY_CHECK_TASK);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(SAFETY_CHECK_TASK);
    }
    const isBatteryRegistered = await TaskManager.isTaskRegisteredAsync(BATTERY_CHECK_TASK);
    if (isBatteryRegistered) {
      await BackgroundFetch.unregisterTaskAsync(BATTERY_CHECK_TASK);
    }
  } catch (error) {
    console.error('Failed to unregister background tasks:', error);
  }
};

export const getBackgroundTaskStatus = async () => {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    const isSafetyRegistered = await TaskManager.isTaskRegisteredAsync(SAFETY_CHECK_TASK);
    const isBatteryRegistered = await TaskManager.isTaskRegisteredAsync(BATTERY_CHECK_TASK);
    return {
      status,
      isSafetyRegistered,
      isBatteryRegistered,
    };
  } catch (error) {
    return { status: 'unknown', isSafetyRegistered: false, isBatteryRegistered: false };
  }
};
