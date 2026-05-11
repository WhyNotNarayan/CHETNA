import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, ScrollView, StatusBar, Platform } from 'react-native';
import { ChevronLeft, HelpCircle, Clock } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const PrivacyConsentScreen = ({ navigation }) => {
  const { theme, themeMode } = useContext(ThemeContext);
  const { t, lang } = useContext(LanguageContext);
  const { completeOnboarding, logout } = useContext(AuthContext);

  const handleAccept = () => {
    completeOnboarding();
  };

  const handleDecline = () => {
    logout(); // Or go back to welcome
  };

  const Content = (
    <>
      {/* 1. Gradient Header Section - FIXED for Web, Flow for Mobile */}
      <LinearGradient 
        colors={['#4B0082', '#d63384']} 
        style={[
          styles.headerGradient,
          Platform.OS === 'web' && { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1 }
        ]}
      >
        <SafeAreaView>
          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
              <ChevronLeft color="#FFF" size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn}>
              <HelpCircle color="#FFF" size={24} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerContent}>
            <Text style={styles.helloText}>Hello 👋</Text>
            <Text style={styles.headerDesc}>
              Before you create an account, please read and accept our Terms & Conditions
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* 2. Main Content Card - High Z-Index to cover header */}
      <View style={[
        styles.card, 
        { backgroundColor: theme.card },
        Platform.OS === 'web' && { marginTop: 220, zIndex: 2, position: 'relative' }
      ]}>
        <View style={styles.scrollContent}>
          <Text style={[styles.title, { color: theme.text }]}>Terms & Conditions</Text>
          
          <View style={styles.metaRow}>
            <Clock size={14} color={theme.subtext} />
            <Text style={[styles.lastUpdated, { color: theme.subtext }]}>
              Last updated: 30 April 2026
            </Text>
          </View>

          <Text style={[styles.introText, { color: theme.text }]}>
            Please read these terms and conditions ("terms and conditions", "terms") carefully before using Chetna mobile application ("app", "service") operated by CHETNA ("us", 'we', "our").
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>1. Conditions of use</Text>
            <Text style={[styles.sectionBody, { color: theme.subtext }]}>
              By using this app, you certify that you have read and reviewed this Agreement and that you agree to comply with its terms. If you do not want to be bound by the terms of this Agreement, you are advised to stop using the app accordingly. CHETNA only grants use and access of this app, its products, and its services to those who have accepted its terms.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>2. Privacy policy</Text>
            <Text style={[styles.sectionBody, { color: theme.subtext }]}>
              Before you continue using our app, we advise you to read our privacy policy regarding our user data collection. It will help you better understand our practices. We use your location and microphone strictly for emergency SOS triggers.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>3. Intellectual property</Text>
            <Text style={[styles.sectionBody, { color: theme.subtext }]}>
              You agree that all materials, products, and services provided on this app are the property of CHETNA, its affiliates, directors, officers, employees, agents, suppliers, or licensors including all copyrights, trade secrets, trademarks, patents, and other intellectual property.
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>4. User Responsibility</Text>
            <Text style={[styles.sectionBody, { color: theme.subtext }]}>
              As a user of this app, you may be asked to register with us and provide private information. You are responsible for ensuring the accuracy of this information, and you are responsible for maintaining the safety and security of your identifying information.
            </Text>
          </View>

          <View style={{ height: 20 }} />

          {/* Buttons for Web (Inside Flow) */}
          {Platform.OS === 'web' && (
            <View style={[styles.footer, { position: 'relative', marginTop: 20, paddingBottom: 20 }]}>
              <TouchableOpacity 
                style={[styles.declineBtn, { backgroundColor: themeMode === 'dark' ? '#222' : '#F0F0F0' }]} 
                onPress={handleDecline}
              >
                <Text style={[styles.declineText, { color: theme.subtext }]}>Decline</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.acceptBtnWrapper} onPress={handleAccept}>
                <LinearGradient
                  colors={['#f92b7c', '#791880']}
                  start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                  style={styles.acceptBtn}
                >
                  <Text style={styles.acceptText}>Accept</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Fixed Buttons for Mobile Only */}
        {Platform.OS !== 'web' && (
          <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TouchableOpacity 
              style={[styles.declineBtn, { backgroundColor: themeMode === 'dark' ? '#222' : '#F0F0F0' }]} 
              onPress={handleDecline}
            >
              <Text style={[styles.declineText, { color: theme.subtext }]}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.acceptBtnWrapper} onPress={handleAccept}>
              <LinearGradient
                colors={['#f92b7c', '#791880']}
                start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                style={styles.acceptBtn}
              >
                <Text style={styles.acceptText}>Accept</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );

  return (
    <View style={[
      styles.container, 
      { backgroundColor: theme.background },
      Platform.OS === 'web' && { height: '100vh', overflowY: 'auto', display: 'block' }
    ]}>
      <StatusBar barStyle="light-content" />
      {Content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  headerGradient: {
    height: Platform.OS === 'web' ? 220 : height * 0.35,
    paddingTop: Platform.OS === 'web' ? 20 : 10,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  navBtn: {
    padding: 10,
  },
  headerContent: {
    paddingHorizontal: 30,
    marginTop: 20,
  },
  helloText: {
    color: '#FFF',
    fontSize: Platform.OS === 'web' ? 32 : 28,
    fontWeight: 'bold',
    marginBottom: Platform.OS === 'web' ? 10 : 10,
  },
  headerDesc: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: '85%',
  },
  card: {
    flex: Platform.OS === 'web' ? 0 : 1,
    marginTop: Platform.OS === 'web' ? 0 : -40,
    borderTopLeftRadius: Platform.OS === 'web' ? 50 : 40,
    borderTopRightRadius: Platform.OS === 'web' ? 50 : 40,
    overflow: 'visible',
    minHeight: Platform.OS === 'web' ? '100%' : 'none',
    boxShadow: Platform.OS === 'web' ? '0 -20px 40px rgba(0,0,0,0.5)' : 'none',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  scrollContent: {
    padding: 30,
    paddingTop: Platform.OS === 'web' ? 50 : 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 25,
  },
  lastUpdated: {
    fontSize: 13,
    fontWeight: '500',
  },
  introText: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 30,
    opacity: 0.9,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.8,
  },
  footer: {
    position: Platform.OS === 'web' ? 'relative' : 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 25,
    paddingBottom: Platform.OS === 'web' ? 25 : 40,
    gap: 15,
    borderTopWidth: 1,
    marginTop: Platform.OS === 'web' ? 20 : 0,
  },
  declineBtn: {
    flex: 1,
    height: 55,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptBtnWrapper: {
    flex: 2,
    height: 55,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#d63384',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  acceptBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default PrivacyConsentScreen;
