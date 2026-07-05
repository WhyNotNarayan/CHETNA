import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, ShieldCheck } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Use the same base URL as your API (without /api)
const SOCKET_URL = 'http://192.168.1.102:5000';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function QRScannerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    if (scanned) return;
    setScanned(true);
    setLoading(true);

    try {
      console.log('🔍 QR Scanned:', data);
      
      // Data from laptop QR should be the Session ID (Socket ID)
      const sessionId = data;

      // 1. Get current user data from storage
      const userToken = await AsyncStorage.getItem('userToken');
      const userStr = await AsyncStorage.getItem('userData');
      const user = JSON.parse(userStr);

      if (!userToken || !user) {
        throw new Error('You must be logged in on mobile first!');
      }

      // 2. Connect to socket and approve the login
      const socket = io(SOCKET_URL);
      
      socket.on('connect', () => {
        console.log('📡 Connected to Socket for QR Approval');
        socket.emit('approve-qr-login', {
          sessionId,
          user,
          token: userToken
        });
        
        // Give it a moment to send before closing
        setTimeout(() => {
          socket.disconnect();
          setLoading(false);
          Alert.alert('Success!', 'Laptop login approved! You are now signed in on your computer.', [
            { text: 'Great!', onPress: () => navigation.goBack() }
          ]);
        }, 1000);
      });

      socket.on('connect_error', (err) => {
        console.error('Socket Error:', err);
        setLoading(false);
        setScanned(false);
        Alert.alert('Connection Error', 'Could not connect to server. Make sure your laptop and phone are on the same Wi-Fi.');
      });

    } catch (error) {
      setLoading(false);
      setScanned(false);
      Alert.alert('Scanner Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      {/* Overlay UI */}
      <View style={[styles.overlay, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X color="white" size={30} />
          </TouchableOpacity>
        </View>

        <View style={styles.scanFrameContainer}>
          <View style={[styles.scanFrame, { width: Math.min(SCREEN_WIDTH * 0.65, 250), height: Math.min(SCREEN_WIDTH * 0.65, 250) }]} />
          <Text style={styles.scanText}>Align Laptop QR Code within frame</Text>
        </View>

        <View style={styles.footer}>
          <ShieldCheck color="#d63384" size={40} />
          <Text style={styles.footerText}>Chetna Secure Laptop Link</Text>
        </View>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#d63384" />
          <Text style={styles.loadingText}>Approving Login...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    padding: 30,
  },
  header: {
    alignItems: 'flex-end',
  },
  closeBtn: {
    marginTop: 20,
  },
  scanFrameContainer: {
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#d63384',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: 'white',
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  footerText: {
    color: 'white',
    marginTop: 10,
    fontSize: 14,
    opacity: 0.8,
  },
  message: {
    textAlign: 'center',
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#d63384',
    padding: 15,
    borderRadius: 10,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 15,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
