import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions, ScrollView } from 'react-native';
import { ShieldCheck, MapPin, Mic, Lock, ChevronRight } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const PrivacyConsentScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { t, lang } = useContext(LanguageContext);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      icon: <MapPin size={50} color={theme.primary} />,
      title: lang === 'mr' ? 'स्थान सुरक्षा' : lang === 'hi' ? 'स्थान सुरक्षा' : 'Location Safety',
      desc: lang === 'mr' 
        ? 'आम्ही तुमचे स्थान फक्त रेड झोन शोधण्यासाठी आणि आणीबाणीच्या वेळी मदत पाठवण्यासाठी वापरतो.' 
        : lang === 'hi'
        ? 'हम आपके स्थान का उपयोग केवल रेड ज़ोन का पता लगाने और आपातकाल के दौरान मदद भेजने के लिए करते हैं।'
        : 'We use your location only to detect Red Zones and send help during an active SOS emergency.',
    },
    {
      icon: <Mic size={50} color={theme.danger} />,
      title: lang === 'mr' ? 'व्हॉइस SOS (फक्त महिलांसाठी)' : lang === 'hi' ? 'वॉयस SOS (केवल महिलाओं के लिए)' : 'Voice SOS (For Girls Only)',
      desc: lang === 'mr' 
        ? 'महिलांच्या सुरक्षेसाठी, आम्ही "HELP ME" हा शब्द ओळखण्यासाठी मायक्रोफोन वापरतो. इतर कोणतेही संभाषण रेकॉर्ड केले जात नाही.' 
        : lang === 'hi'
        ? 'महिलाओं की सुरक्षा के लिए, हम "HELP ME" शब्द को पहचानने के लिए माइक्रोफ़ोन का उपयोग करते हैं। कोई अन्य बातचीत रिकॉर्ड नहीं की जाती है।'
        : 'For female safety, we use the microphone ONLY to listen for the "HELP ME" trigger. No other conversations are recorded.',
    },
    {
      icon: <Lock size={50} color={theme.secondary} />,
      title: lang === 'mr' ? 'डेटा गोपनीयता' : lang === 'hi' ? 'डेटा गोपनीयता' : 'Data Privacy',
      desc: lang === 'mr' 
        ? 'तुमचा डेटा पूर्णपणे सुरक्षित आहे आणि तो फक्त पोलीस किंवा अधिकृत स्वयंसेवकांशी शेअर केला जातो.' 
        : lang === 'hi'
        ? 'आपका डेटा पूरी तरह से सुरक्षित है और इसे केवल पुलिस या अधिकृत स्वयंसेवकों के साथ साझा किया जाता है।'
        : 'Your data is encrypted. It is only shared with Sindhudurg Police or verified Secret Cops during an actual rescue.',
    }
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      navigation.replace('Welcome');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.progressBar}>
        {steps.map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.progressDot, 
              { backgroundColor: i <= activeStep ? theme.primary : theme.border, width: i === activeStep ? 30 : 10 }
            ]} 
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} centerContent>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: theme.card }]}>
            {steps[activeStep].icon}
          </View>
          <Text style={[styles.title, { color: theme.text }]}>{steps[activeStep].title}</Text>
          <Text style={[styles.desc, { color: theme.subtext }]}>{steps[activeStep].desc}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: theme.primary }]} 
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {activeStep === steps.length - 1 
              ? (lang === 'mr' ? 'मला मान्य आहे' : lang === 'hi' ? 'मैं सहमत हूँ' : 'I Agree & Start') 
              : (lang === 'mr' ? 'पुढील' : lang === 'hi' ? 'आगे' : 'Next')}
          </Text>
          <ChevronRight size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressBar: { flexDirection: 'row', justifyContent: 'center', marginTop: 30, gap: 8 },
  progressDot: { height: 10, borderRadius: 5 },
  content: { flex: 1, padding: 40, justifyContent: 'center', alignItems: 'center' },
  card: { alignItems: 'center', width: '100%' },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5
  },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 20 },
  desc: { fontSize: 16, textAlign: 'center', lineHeight: 26, opacity: 0.8 },
  footer: { padding: 40 },
  button: {
    height: 65,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8
  },
  buttonText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});

export default PrivacyConsentScreen;
