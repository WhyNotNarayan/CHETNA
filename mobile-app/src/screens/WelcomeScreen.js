import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, Image, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const AnimatedLogo = () => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <Animated.View 
      style={[styles.floatingLogoContainer, { transform: [{ translateY }] }]}
      pointerEvents="none"
    >
      <View style={styles.glow} />
      <View style={styles.logo3DWrapper}>
        <Image 
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="cover"
        />
      </View>
    </Animated.View>
  );
};

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#fff0f5', '#fee0f4', '#ffe4e1']} 
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      
      <SafeAreaView style={styles.safeArea}>
        
        {/* Top Header Section */}
        <View style={styles.header} pointerEvents="none">
          <Text style={styles.brandName}>CHETNA</Text>
          <Text style={styles.tagline}>STAY ALERT. STAY SAFE.</Text>
        </View>

        {/* Center Graphic */}
        <View style={styles.graphicContainer} pointerEvents="none">
          <AnimatedLogo />
        </View>
        
        {/* Bottom Interactive Panel */}
        <View style={styles.bottomPanel}>
          <Text style={styles.panelTitle}>AI-Powered Safety</Text>
          <Text style={styles.panelDescription}>
            Advanced geofencing and real-time community protection tailored for your peace of mind.
          </Text>

          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={styles.primaryButtonWrapper}
              onPress={() => navigation.navigate('Register')}
              activeOpacity={0.8}
            >
              <LinearGradient 
                colors={['#f92b7c', '#791880']} 
                start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.6}
            >
              <Text style={styles.secondaryButtonText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: height * 0.05,
  },
  brandName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#d63384',
    letterSpacing: 4,
    textShadowColor: 'rgba(214, 51, 132, 0.15)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4B0082',
    letterSpacing: 3,
    marginTop: 8,
    opacity: 0.8,
  },
  graphicContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  floatingLogoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#f92b7c',
    opacity: 0.25,
    transform: [{ scale: 1.5 }],
    shadowColor: '#f92b7c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 50,
  },
  logo3DWrapper: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4B0082',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  bottomPanel: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 30,
    zIndex: 10,  // Critical for button pressability
  },
  panelTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  panelDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 35,
    paddingHorizontal: 10,
  },
  buttonGroup: {
    gap: 15,
  },
  primaryButtonWrapper: {
    shadowColor: '#d63384',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
    borderRadius: 20,
  },
  primaryButton: {
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  secondaryButton: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#eee',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
