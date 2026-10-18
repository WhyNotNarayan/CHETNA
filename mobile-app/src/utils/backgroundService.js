import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalRedZones, saveRedZones } from '../database/localDb';
import { isTimeInRange } from './time';
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

    let foundZone = null;

    for (const zone of zones) {
      const zoneLat = parseFloat(zone.latitude);
      const zoneLng = parseFloat(zone.longitude);
      const zoneRadius = parseFloat(zone.radius) || 100;

      if (!isTimeInRange(zone.start_time || zone.startTime, zone.end_time || zone.endTime)) continue;

      const dist = getDistance(latitude, longitude, zoneLat, zoneLng);

      if (dist <= zoneRadius) {
        foundZone = zone;
        let ln = 'en';
        try { ln = (await AsyncStorage.getItem('user_lang')) || 'en'; } catch {}
        const title = ln === 'mr' ? `⚠️ सुरक्षा इशारा: ${zone.name}` : ln === 'hi' ? `⚠️ सुरक्षा चेतावनी: ${zone.name}` : `⚠️ Safety Alert: ${zone.name}`;
        const body = ln === 'mr' ? 'तुम्ही उच्च जोखीम भागात आहात. सतर्क रहा आणि सुरक्षित रहा.' : ln === 'hi' ? 'आप उच्च जोखिम क्षेत्र में हैं। सतर्क रहें और सुरक्षित रहें।' : `You are in a high-risk area. Stay alert and stay safe.`;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: title,
            body: body,
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

        break;
      }
    }

    // Exit detection: was in a zone, now outside → send safe notification
    const prevZoneStr = await AsyncStorage.getItem('bg_active_zone_id');
    const currentZoneId = foundZone ? String(foundZone.id) : '';
    if (prevZoneStr && prevZoneStr !== currentZoneId) {
      const exitKey = `bg_zone_exit_${prevZoneStr}`;
      const lastExit = await AsyncStorage.getItem(exitKey);
      if (!lastExit || (now - parseInt(lastExit)) > 120000) {
        const exited = zones.find(z => String(z.id) === prevZoneStr);
        if (exited) {
          let ln = 'en';
          try { ln = (await AsyncStorage.getItem('user_lang')) || 'en'; } catch {}
          const title = ln === 'mr' ? `✅ सुरक्षित: ${exited.name}` : ln === 'hi' ? `✅ सुरक्षित: ${exited.name}` : `✅ Safe: ${exited.name}`;
          const body = ln === 'mr' ? 'तुम्ही धोकादायक भागाबाहेर आलात. हा भाग आता सुरक्षित आहे.' : ln === 'hi' ? 'आप खतरनाक क्षेत्र से बाहर आ गए हैं। यह क्षेत्र अब सुरक्षित है।' : 'You have left the danger zone. This area is now safe.';
          await Notifications.scheduleNotificationAsync({
            content: { title, body, data: { zoneId: exited.id, type: 'bg_zone_exit' }, sound: true },
            trigger: null,
          });
          await AsyncStorage.setItem(exitKey, String(now));
        }
      }
    }
    await AsyncStorage.setItem('bg_active_zone_id', currentZoneId);

    if (foundZone) return BackgroundFetch.Result.NewData;
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
