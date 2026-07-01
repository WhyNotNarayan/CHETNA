import React, { useContext, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ThemeProvider, ThemeContext } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { initDb } from './src/database/localDb';

// Import Screens
import LanguageSelectScreen from './src/screens/LanguageSelectScreen';
import ThemeSelectScreen from './src/screens/ThemeSelectScreen';
import PrivacyConsentScreen from './src/screens/PrivacyConsentScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import SecretCopRegisterScreen from './src/screens/SecretCopRegisterScreen';
import GirlsDashboard from './src/screens/GirlsDashboard';
import BoysDashboard from './src/screens/BoysDashboard';
import AINavigatorScreen from './src/screens/AINavigatorScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import SOSTrackingScreen from './src/screens/SOSTrackingScreen';
import AdminLoginScreen from './src/screens/AdminLoginScreen';
import AdminDashboard from './src/screens/AdminDashboard';
import AdminRedZoneScreen from './src/screens/AdminRedZoneScreen';
import AdminAddCrimeScreen from './src/screens/AdminAddCrimeScreen';
import AdminAddNewsScreen from './src/screens/AdminAddNewsScreen';
import AdminManageSecretCopsScreen from './src/screens/AdminManageSecretCopsScreen';

const Stack = createStackNavigator();

function AppNavigator() {
  const { userToken, userData, isLoading, hasCompletedOnboarding } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {userToken === null ? (
        // Auth / Onboarding Stack
        <>
          {!hasCompletedOnboarding ? (
            <>
              <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
              <Stack.Screen name="ThemeSelect" component={ThemeSelectScreen} />
              <Stack.Screen name="PrivacyConsent" component={PrivacyConsentScreen} />
            </>
          ) : null}
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        </>
      ) : (
        // Logged-in App Stack (Conditional by User Role)
        <>
          {userData?.role === 'ADMIN' ? (
            // Admin Panel
            <>
              <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
              <Stack.Screen name="AdminRedZones" component={AdminRedZoneScreen} />
              <Stack.Screen name="AdminAddCrime" component={AdminAddCrimeScreen} />
              <Stack.Screen name="AdminAddNews" component={AdminAddNewsScreen} />
              <Stack.Screen name="AdminManageSecretCops" component={AdminManageSecretCopsScreen} />
            </>
          ) : userData?.role === 'GIRL' ? (
            // Safety User Flow (Girl)
            <>
              <Stack.Screen name="GirlsDashboard" component={GirlsDashboard} />
              <Stack.Screen name="SOSTracking" component={SOSTrackingScreen} />
              <Stack.Screen name="AINavigator" component={AINavigatorScreen} />
              <Stack.Screen name="QRScanner" component={QRScannerScreen} />
            </>
          ) : (
            // Helper Flow (Boy / Secret Cop)
            <>
              <Stack.Screen name="BoysDashboard" component={BoysDashboard} />
              <Stack.Screen name="SecretCopRegister" component={SecretCopRegisterScreen} />
              <Stack.Screen name="AINavigator" component={AINavigatorScreen} />
              <Stack.Screen name="QRScanner" component={QRScannerScreen} />
              <Stack.Screen name="AdminRedZones" component={AdminRedZoneScreen} />
            </>
          )}
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    initDb().catch(err => console.error('Database Init Error:', err));
  }, []);

  return (
    <AuthProvider>
      <LanguageProvider>
        <ThemeProvider>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </ThemeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
