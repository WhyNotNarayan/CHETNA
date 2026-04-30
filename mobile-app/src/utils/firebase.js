import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth, browserLocalPersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const firebaseConfig = {
  apiKey: "AIzaSyD5RPzSPmKfHaY3KF2Pp3_8IN_6bK8B5Pg",
  authDomain: "chetna-4fa07.firebaseapp.com",
  projectId: "chetna-4fa07",
  storageBucket: "chetna-4fa07.firebasestorage.app",
  messagingSenderId: "816536192086",
  appId: "1:816536192086:web:006c1bfa01b44e815067f7",
  measurementId: "G-79SYQ8Q7FB"
};

const app = initializeApp(firebaseConfig);

// Initialize Auth with platform-specific persistence
export const auth = Platform.OS === 'web' 
  ? getAuth(app) 
  : initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
