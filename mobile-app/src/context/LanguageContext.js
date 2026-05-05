import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LanguageContext = createContext();

export const translations = {
  en: {
    welcome: "Hello",
    tagline: "CHETNA Guardian Hub",
    manual_sos: "Manual SOS",
    emergency_alert: "Emergency Alert",
    live_map: "Live Map",
    crime_zones: "Crime Red Zones",
    become_secret_cop: "Become a Secret Cop",
    help_protect: "Help protect Sindhudurg and earn badges.",
    register_now: "Register Now",
    pending: "Verification Pending...",
    secret_cop_dash: "Secret Cop Dashboard",
    ai_navigator: "AI Navigator",
    voice_alerts: "Voice Safety Alerts",
    guardian: "Guardian",
    watch_list: "Watch List",
    radar: "Radar",
    nearby_helpers: "Nearby Helpers",
    honor: "Honor",
    points: "Points",
    admin_line: "Direct Command Center Line",
    report_hazard: "Report Danger Road",
    nearby_alerts: "Critical Nearby Alerts",
    no_alerts: "No emergency alerts in your area.",
    bulletin: "Community Live Bulletin",
    rescue: "RESCUE",
    settings: "Settings",
    dark_mode: "Dark Mode",
    change_lang: "Change Language",
    search_dest: "Search destination...",
    calc_route: "Calculating safest route...",
    start_nav: "START NAVIGATION",
    stop_nav: "STOP NAVIGATION",
    eta: "ETA",
    distance: "Distance",
    active_zones: "Active Zones"
  },
  mr: {
    welcome: "नमस्कार",
    tagline: "चेतना रक्षक केंद्र",
    manual_sos: "मॅन्युअल SOS",
    emergency_alert: "आणीबाणी अलर्ट",
    live_map: "थेट नकाशा",
    crime_zones: "गुन्हेगारी रेड झोन",
    become_secret_cop: "सिक्रेट कॉप बना",
    help_protect: "सिंधुदुर्गच्या संरक्षणास मदत करा आणि बॅज मिळवा.",
    register_now: "आत्ता नोंदणी करा",
    pending: "पडताळणी प्रलंबित...",
    secret_cop_dash: "सिक्रेट कॉप डॅशबोर्ड",
    ai_navigator: "AI नेव्हिगेटर",
    voice_alerts: "व्हॉइस सुरक्षा अलर्ट",
    guardian: "पालक/रक्षक",
    watch_list: "वॉच लिस्ट",
    radar: "रडार",
    nearby_helpers: "जवळचे मदतनीस",
    honor: "सन्मान",
    points: "गुण (Points)",
    admin_line: "थेट कमांड सेंटर लाइन",
    report_hazard: "धोकादायक रस्ता नोंदवा",
    nearby_alerts: "जवळचे गंभीर अलर्ट",
    no_alerts: "तुमच्या परिसरात कोणतेही आणीबाणी अलर्ट नाहीत.",
    bulletin: "थेट बातमीपत्र",
    rescue: "मदत करा",
    settings: "सेटिंग्ज",
    dark_mode: "डार्क मोड",
    change_lang: "भाषा बदला",
    search_dest: "गंतव्यस्थान शोधा...",
    calc_route: "सर्वात सुरक्षित मार्ग शोधत आहे...",
    start_nav: "नेव्हिगेशन सुरू करा",
    stop_nav: "नेव्हिगेशन थांबवा",
    eta: "वेळ",
    distance: "अंतर",
    active_zones: "सक्रिय झोन"
  },
  hi: {
    welcome: "नमस्ते",
    tagline: "चेतना रक्षक केंद्र",
    manual_sos: "मैनुअल SOS",
    emergency_alert: "आपातकालीन अलर्ट",
    live_map: "लाइव मैप",
    crime_zones: "क्राइम रेड ज़ोन",
    become_secret_cop: "सीक्रेट कॉप बनें",
    help_protect: "सिंधुदुर्ग की सुरक्षा में मदद करें और बैज अर्जित करें।",
    register_now: "अभी पंजीकरण करें",
    pending: "सत्यापन लंबित...",
    secret_cop_dash: "सीक्रेट कॉप डैशबोर्ड",
    ai_navigator: "AI नेविगेटर",
    voice_alerts: "वॉयस सुरक्षा अलर्ट",
    guardian: "अभिभावक",
    watch_list: "वॉच लिस्ट",
    radar: "रडार",
    nearby_helpers: "पास के सहायक",
    honor: "सम्मान",
    points: "अंक (Points)",
    admin_line: "सीधा कमांड सेंटर लाइन",
    report_hazard: "खतरनाक सड़क की रिपोर्ट करें",
    nearby_alerts: "पास के महत्वपूर्ण अलर्ट",
    no_alerts: "आपके क्षेत्र में कोई आपातकालीन अलर्ट नहीं है।",
    bulletin: "सामुदायिक लाइव बुलेटिन",
    rescue: "बचाव",
    settings: "सेटिंग्स",
    dark_mode: "डार्क मोड",
    change_lang: "भाषा बदलें",
    search_dest: "मंजिल खोजें...",
    calc_route: "सबसे सुरक्षित मार्ग की गणना...",
    start_nav: "नेविगेशन शुरू करें",
    stop_nav: "नेविगेशन बंद करें",
    eta: "समय",
    distance: "दूरी",
    active_zones: "सक्रिय क्षेत्र"
  }
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    const loadLang = async () => {
      const savedLang = await AsyncStorage.getItem('user_lang');
      if (savedLang) setLang(savedLang);
    };
    loadLang();
  }, []);

  const changeLanguage = async (newLang) => {
    try {
      if (!newLang || typeof newLang !== 'string') return;
      setLang(newLang);
      await AsyncStorage.setItem('user_lang', String(newLang));
    } catch (error) {
      console.warn("Language switch error:", error);
    }
  };

  const t = (key) => translations[lang][key] || key;

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
