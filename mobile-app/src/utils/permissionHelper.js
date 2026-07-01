import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { Alert, Linking, Platform } from 'react-native';

/**
 * Pro-Level Permission Manager
 * Centralizes all permission logic for the Chetna App.
 */

export const PERMISSIONS = {
  LOCATION: 'location',
  CAMERA: 'camera',
  MICROPHONE: 'microphone',
};

const permissionConfig = {
  [PERMISSIONS.LOCATION]: {
    name: 'Location',
    request: Location.requestForegroundPermissionsAsync,
    status: Location.getForegroundPermissionsAsync,
    purpose: 'to detect danger zones and provide SOS tracking.',
  },
  [PERMISSIONS.CAMERA]: {
    name: 'Camera',
    request: Camera.requestCameraPermissionsAsync,
    status: Camera.getCameraPermissionsAsync,
    purpose: 'to record video evidence during emergencies.',
  },
  [PERMISSIONS.MICROPHONE]: {
    name: 'Microphone',
    request: Audio.requestPermissionsAsync,
    status: Audio.getPermissionsAsync,
    purpose: 'to capture audio evidence and respond to voice SOS.',
  },
};

/**
 * Checks if a specific permission is granted.
 * If not granted, it attempts to request it.
 * If denied twice (can't ask again), it shows a professional alert to go to settings.
 */
export const ensurePermission = async (type) => {
  const config = permissionConfig[type];
  if (!config) return false;

  try {
    // 1. Check current status
    let { status, canAskAgain } = await config.status();

    // 2. If already granted, we're good
    if (status === 'granted') return true;

    // 3. If not granted but we can ask, try requesting
    if (canAskAgain || status === 'undetermined') {
      const response = await config.request();
      if (response.status === 'granted') return true;
      status = response.status;
      canAskAgain = response.canAskAgain;
    }

    // 4. If still not granted, show explanation and settings link
    if (status !== 'granted') {
      Alert.alert(
        `${config.name} Permission Required`,
        `Chetna needs ${config.name} access ${config.purpose}\n\nPlease enable it in your phone settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }
          },
        ]
      );
    }

    return false;
  } catch (error) {
    console.error(`Permission Error [${type}]:`, error);
    return false;
  }
};

/**
 * Requests all core permissions at once (Best for Onboarding)
 */
export const requestAllCorePermissions = async () => {
  const results = {};

  // Location (Background is separate and more sensitive, usually requested after foreground)
  const loc = await Location.requestForegroundPermissionsAsync();
  results[PERMISSIONS.LOCATION] = loc.status === 'granted';

  // Camera
  const cam = await Camera.requestCameraPermissionsAsync();
  results[PERMISSIONS.CAMERA] = cam.status === 'granted';

  // Microphone
  const mic = await Audio.requestPermissionsAsync();
  results[PERMISSIONS.MICROPHONE] = mic.status === 'granted';

  return results;
};
