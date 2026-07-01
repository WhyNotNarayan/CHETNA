import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startLocationTracking, stopLocationTracking } from '../utils/locationService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  const login = async (token, user) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      setUserToken(token);
      setUserData(user);

      // START TRACKING ON LOGIN
      startLocationTracking().catch(e => console.log('Tracking Start Error:', e));
    } catch (e) {
      console.warn("Failed to save auth data", e);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboarding_done', 'true');
      setHasCompletedOnboarding(true);
    } catch (e) {}
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('onboarding_done');
      setUserToken(null);
      setUserData(null);
      setHasCompletedOnboarding(false);

      // STOP TRACKING ON LOGOUT
      stopLocationTracking().catch(e => console.log('Tracking Stop Error:', e));
    } catch (e) {
      console.warn("Failed to clear auth data", e);
    }
  };

  const isLoggedIn = async () => {
    try {
      setIsLoading(true);
      let token = await AsyncStorage.getItem('userToken');
      let user = await AsyncStorage.getItem('userData');
      let onboarding = await AsyncStorage.getItem('onboarding_done');
      
      if (token && user) {
        setUserToken(token);
        setUserData(JSON.parse(user));
        setHasCompletedOnboarding(onboarding === 'true');

        // RESUME TRACKING IF LOGGED IN
        startLocationTracking().catch(e => console.log('Tracking Resume Error:', e));
      }
    } catch (e) {
      console.warn("Failed to load auth data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      login, 
      logout, 
      userToken, 
      userData, 
      setUserData, 
      isLoading,
      hasCompletedOnboarding,
      completeOnboarding 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
