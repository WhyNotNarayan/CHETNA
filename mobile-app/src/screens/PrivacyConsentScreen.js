import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, ScrollView, StatusBar, Platform, ActivityIndicator, Alert } from 'react-native';
import { ChevronLeft, HelpCircle, Clock, ShieldCheck, MapPin, Camera, Mic, Check } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { requestAllCorePermissions } from '../utils/permissionHelper';

const { width, height } = Dimensions.get('window');

const PrivacyConsentScreen = ({ navigation }) => {
  const { theme, themeMode } = useContext(ThemeContext);
  const { t, lang } = useContext(LanguageContext);
  const { completeOnboarding, logout } = useContext(AuthContext);
  const [isRequesting, setIsRequesting] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleAccept = async () => {
    setIsRequesting(true);
    try {
      // 1. Inform user about permissions
      if (Platform.OS !== 'web') {
        const results = await requestAllCorePermissions();
        console.log('Permission Results:', results);
      }

      // 2. Complete onboarding
      completeOnboarding();
    } catch (e) {
      Alert.alert('Error', 'Something went wrong during setup.');
    } finally {
      setIsRequesting(false);
    }
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
            <Text style={styles.helloText}>{lang === 'mr' ? 'नमस्कार 👋' : lang === 'hi' ? 'नमस्ते 👋' : 'Hello 👋'}</Text>
            <Text style={styles.headerDesc}>
              {lang === 'mr' ? 'खाते तयार करण्यापूर्वी, कृपया आमच्यी अटी व शर्ती वाचून स्वीकारा' : lang === 'hi' ? 'खाता बनाने से पहले, कृपया हमारी नियम और शर्तें पढ़कर स्वीकार करें' : 'Before you create an account, please read and accept our Terms & Conditions'}
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* 2. Main Content Card */}
      <View style={[
        styles.card, 
        { backgroundColor: theme.card },
        Platform.OS === 'web' && { marginTop: 220, zIndex: 2, position: 'relative' }
      ]}>
        <ScrollView 
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: theme.text }]}>{lang === 'mr' ? 'अटी व शर्ती' : lang === 'hi' ? 'नियम और शर्तें' : 'Terms & Conditions'}</Text>
          
          <View style={styles.metaRow}>
            <Clock size={14} color={theme.subtext} />
            <Text style={[styles.lastUpdated, { color: theme.subtext }]}>
              {lang === 'mr' ? 'शेवटचे अपडेट: 30 एप्रिल 2026' : lang === 'hi' ? 'अंतिम अपडेट: 30 अप्रैल 2026' : 'Last updated: 30 April 2026'}
            </Text>
          </View>

          <Text style={[styles.introText, { color: theme.text }]}>
            {lang === 'mr' ? 'कृपया ही अटी व शर्ती ("अटी", "शर्ती") CHETNA ("आम्ही", "आमचे") द्वारे चालवल्याजाणार्‍या Chetna मोबाइल अ‍ॅप्लिकेशन ("अ‍ॅप", "सेवा") वापरण्यापूर्वी काळजीपूर्वक वाचा.' : lang === 'hi' ? 'कृपया इन नियमों और शर्तों ("नियम", "शर्तें") को CHETNA ("हम", "हमारे") द्वारा संचालित Chetna मोबाइल एप्लिकेशन ("ऐप", "सेवा") का उपयोग करने से पहले ध्यानपूर्वक पढ़ें।' : 'Please read these terms and conditions ("terms and conditions", "terms") carefully before using Chetna mobile application ("app", "service") operated by CHETNA ("us", \'we\', "our").'}
          </Text>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{lang === 'mr' ? '1. वापराच्या अटी' : lang === 'hi' ? '1. उपयोग की शर्तें' : '1. Conditions of use'}</Text>
            <Text style={[styles.sectionBody, { color: theme.subtext }]}>
              {lang === 'mr' ? 'हे अ‍ॅप वापरून तुम्ही हा करार वाचला आणि पुनरावलोकन केल्याची खात्री देता आणि त्याच्या अटींचे पालन करण्यास संमत आहात असे प्रमाणित करता. या कराराच्या अटींनी बंधनकारक होण्यास तुम्हाला आवडत नसल्यास, त्यानुसार अ‍ॅप वापरणे बंद करण्याचा सल्ला दिला जातो. CHETNA केवळ त्यांच्या अटी स्वीकारणाऱ्यांनाच अ‍ॅप, त्याचे उत्पादने आणि सेवा वापरण्याचा आणि प्रवेश मिळवण्याचा परवाना देते.' : lang === 'hi' ? 'इस ऐप का उपयोग करके, आप प्रमाणित करते हैं कि आपने इस समझौते को पढ़ा और समीक्षा की है और आप इसकी शर्तों का पालन करने के लिए सहमत हैं। यदि आप इस समझौते की शर्तों से बंधे नहीं होना चाहते हैं, तो आपको ऐप का उपयोग बंद करने की सलाह दी जाती है। CHETNA केवल उन्हीं को ऐप, इसके उत्पादों और सेवाओं का उपयोग और पहुंच प्रदान करता है जिन्होंने इसकी शर्तें स्वीकार की हैं।' : 'By using this app, you certify that you have read and reviewed this Agreement and that you agree to comply with its terms. If you do not want to be bound by the terms of this Agreement, you are advised to stop using the app accordingly. CHETNA only grants use and access of this app, its products, and its services to those who have accepted its terms.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{lang === 'mr' ? '2. गोपनीयता धोरण' : lang === 'hi' ? '2. गोपनीयता नीति' : '2. Privacy policy'}</Text>
            <Text style={[styles.sectionBody, { color: theme.subtext }]}>
              {lang === 'mr' ? 'आमचे अ‍ॅप वापरणे सुरू ठेवण्यापूर्वी, आमच्या वापरकर्ता डेटा संकलनाबद्दल आमचे गोपनीयता धोरण वाचण्याचा आम्ही आपल्याला सल्ला देतो. ते आमच्या पद्धती अधिक चांगले समजण्यास मदत करेल. आम्ही तुमचे स्थान आणि माइक्रोफोन केवळ आपत्कालीन SOS ट्रिगरसाठी कडकपणे वापरतो.' : lang === 'hi' ? 'हमारे ऐप का उपयोग जारी रखने से पहले, हम आपको हमारे उपयोगकर्ता डेटा संग्रह के संबंध में हमारी गोपनीयता नीति पढ़ने की सलाह देते हैं। यह आपको हमारी प्रथाओं को बेहतर ढंग से समझने में मदद करेगा। हम आपके स्थान और माइक्रोफ़ोन का उपयोग केवल आपातकालीन SOS ट्रिगर के लिए सख्ती से करते हैं।' : 'Before you continue using our app, we advise you to read our privacy policy regarding our user data collection. It will help you better understand our practices. We use your location and microphone strictly for emergency SOS triggers.'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{lang === 'mr' ? '3. बौद्धिक संपत्ती' : lang === 'hi' ? '3. बौद्धिक संपत्ति' : '3. Intellectual property'}</Text>
            <Text style={[styles.sectionBody, { color: theme.subtext }]}>
              {lang === 'mr' ? 'या अ‍ॅपवर प्रदान केलेल्या सर्व साहित्य, उत्पादने आणि सेवा CHETNA, त्याचे संबंधित, संचालक, अधिकारी, कर्मचारी, एजंट, पुरवठादार किंवा परवानाधारकांची मालकीचे आहेत याचे तुम्ही संमत आहात, ज्यामध्ये सर्व प्रतिलिपी अधिकार, व्यापार गोष्टी, व्यापार चिन्हे, पेटंट आणि इतर बौद्धिक संपत्ती समाविष्ट आहे.' : lang === 'hi' ? 'आप सहमत हैं कि इस ऐप पर प्रदान की गई सभी सामग्री, उत्पादों और सेवाएँ CHETNA, इसके सहयोगी, निदेशक, अधिकारियों, कर्मचारियों, एजेंटों, आपूर्तिकर्ताओं या लाइसेंसधारकों की संपत्ति हैं, जिसमें सभी कॉपीराइट, ट्रेड सीक्रेट्स, ट्रेडमार्क, पेटेंट और अन्य बौद्धिक संपत्ति शामिल हैं।' : 'You agree that all materials, products, and services provided on this app are the property of CHETNA, its affiliates, directors, officers, employees, agents, suppliers, or licensors including all copyrights, trade secrets, trademarks, patents, and other intellectual property.'}
            </Text>
          </View>
          
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{lang === 'mr' ? '4. वापरकर्त्याची जबाबदारी' : lang === 'hi' ? '4. उपयोगकर्ता की जिम्मेदारी' : '4. User Responsibility'}</Text>
            <Text style={[styles.sectionBody, { color: theme.subtext }]}>
              {lang === 'mr' ? 'या अ‍ॅपच्या वापरकर्ता म्हणून, तुम्हाला आमच्यासोबत नोंदणी करण्यास आणि खाजगी माहिती देण्यास सांगू शकले जाते. या माहितीची अचूकता सुनिश्चित करण्याची जबाबदारी तुमची आहे, आणि तुमच्या ओळख माहितीच्या सुरक्षितता आणि सुरक्षितता राखण्याची जबाबदारी तुमची आहे.' : lang === 'hi' ? 'इस ऐप के उपयोगकर्ता के रूप में, आपसे हमारे साथ पंजीकरण करने और निजी जानकारी प्रदान करने के लिए कहा जा सकता है। इस जानकारी की सटीकता सुनिश्चित करने की जिम्मेदारी आपकी है, और अपनी पहचान जानकारी की सुरक्षा बनाए रखने की जिम्मेदारी आपकी है।' : 'As a user of this app, you may be asked to register with us and provide private information. You are responsible for ensuring the accuracy of this information, and you are responsible for maintaining the safety and security of your identifying information.'}
            </Text>
          </View>

          {/* Permissions Summary Section */}
          <View style={[styles.permCard, { backgroundColor: themeMode === 'dark' ? '#1a1a1a' : '#FFF5F8' }]}>
            <Text style={[styles.permHeader, { color: theme.text }]}>{lang === 'mr' ? 'आवश्यक सुरक्षा परवाने' : lang === 'hi' ? 'आवश्यक सुरक्षा अनुमतियाँ' : 'Safety Permissions Required'}</Text>
            <View style={styles.permItem}>
              <MapPin size={18} color="#d63384" />
              <View style={styles.permTextContent}>
                <Text style={[styles.permTitle, { color: theme.text }]}>{lang === 'mr' ? 'स्थान प्रवेश' : lang === 'hi' ? 'स्थान पहुंच' : 'Location Access'}</Text>
                <Text style={styles.permDesc}>{lang === 'mr' ? 'रात्री झोन शोधण्यासाठी आणि जिवंत SOS हालचाल ट्रॅक करण्यासाठी.' : lang === 'hi' ? 'रेड ज़ोन का पता लगाने और लाइव SOS गतिविधि ट्रैक करने के लिए।' : 'To detect red zones and track live SOS movement.'}</Text>
              </View>
            </View>
            <View style={styles.permItem}>
              <Camera size={18} color="#d63384" />
              <View style={styles.permTextContent}>
                <Text style={[styles.permTitle, { color: theme.text }]}>{lang === 'mr' ? 'कॅमेरा प्रवेश' : lang === 'hi' ? 'कैमरा पहुंच' : 'Camera Access'}</Text>
                <Text style={styles.permDesc}>{lang === 'mr' ? 'SOS दरम्यान उच्च दर्जाचा व्हिडिओ पुरावा रेकॉर्ड करण्यासाठी.' : lang === 'hi' ? 'SOS के दौरान उच्च गुणवत्ता वाला वीडियो सबूत रिकॉर्ड करने के लिए।' : 'To record high-quality video evidence during SOS.'}</Text>
              </View>
            </View>
            <View style={styles.permItem}>
              <Mic size={18} color="#d63384" />
              <View style={styles.permTextContent}>
                <Text style={[styles.permTitle, { color: theme.text }]}>{lang === 'mr' ? 'माइक्रोफोन प्रवेश' : lang === 'hi' ? 'माइक्रोफ़ोन पहुंच' : 'Microphone Access'}</Text>
                <Text style={styles.permDesc}>{lang === 'mr' ? 'ध्वनी रेकॉर्ड करण्यासाठी आणि आवाज-सक्रिय SOS सक्षम करण्यासाठी.' : lang === 'hi' ? 'ऑडियो रिकॉर्ड करने और वॉइस-सक्रिय SOS सक्षम करने के लिए।' : 'To record audio and enable voice-activated SOS.'}</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Fixed Footer Buttons */}
        <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TouchableOpacity 
            style={styles.checkboxRow}
            onPress={() => setAgreed(!agreed)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked, { borderColor: agreed ? '#d63384' : theme.subtext }]}>
              {agreed && <Check size={14} color="#FFF" strokeWidth={3} />}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.text }]}>
              I have read and agree to the Terms & Conditions
            </Text>
          </TouchableOpacity>

          <View style={styles.footerBtns}>
            <TouchableOpacity 
              style={[styles.declineBtn, { backgroundColor: themeMode === 'dark' ? '#222' : '#F0F0F0' }]} 
              onPress={handleDecline}
            >
              <Text style={[styles.declineText, { color: theme.subtext }]}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.acceptBtnWrapper, !agreed && styles.acceptBtnDisabled]} 
              onPress={handleAccept} 
              disabled={isRequesting || !agreed}
            >
              <LinearGradient
                colors={agreed ? ['#f92b7c', '#791880'] : ['#999', '#777']}
                start={{x: 0, y: 0}} end={{x: 1, y: 0}}
                style={styles.acceptBtn}
              >
                {isRequesting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.acceptText}>Accept & Grant</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
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
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 30,
    paddingTop: Platform.OS === 'web' ? 50 : 30,
    paddingBottom: 20,
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
    padding: 25,
    paddingBottom: 40,
    borderTopWidth: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#d63384',
    borderColor: '#d63384',
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  footerBtns: {
    flexDirection: 'row',
    gap: 15,
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
  acceptBtnDisabled: {
    elevation: 0,
    shadowOpacity: 0,
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
  },
  permCard: {
    padding: 20,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  permHeader: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  permItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 15,
  },
  permTextContent: {
    flex: 1,
  },
  permTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  permDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  }
});

export default PrivacyConsentScreen;
