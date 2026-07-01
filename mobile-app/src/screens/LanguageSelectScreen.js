import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, Image } from 'react-native';
import { LanguageContext } from '../context/LanguageContext';
import { ThemeContext } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Languages } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const LanguageSelectScreen = ({ navigation }) => {
  const { changeLanguage } = useContext(LanguageContext);
  const { theme } = useContext(ThemeContext);

  const selectLanguage = async (lang) => {
    await changeLanguage(lang);
    navigation.navigate('ThemeSelect');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={[theme.isDark ? '#1a1a1a' : '#fff0f5', theme.background]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Languages size={60} color={theme.primary} />
        </View>
        
        <Text style={[styles.title, { color: theme.text }]}>Choose Language</Text>
        <Text style={[styles.subtitle, { color: theme.subtext }]}>अपनी भाषा चुनें / तुमची भाषा निवडा</Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={[styles.langBtn, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={() => selectLanguage('en')}
          >
            <Text style={[styles.langText, { color: theme.text }]}>English</Text>
            <Text style={styles.langNative}>Default</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.langBtn, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={() => selectLanguage('mr')}
          >
            <Text style={[styles.langText, { color: theme.text }]}>मराठी</Text>
            <Text style={styles.langNative}>Sindhudurg Local</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.langBtn, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={() => selectLanguage('hi')}
          >
            <Text style={[styles.langText, { color: theme.text }]}>हिन्दी</Text>
            <Text style={styles.langNative}>National</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center' },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 10, letterSpacing: 1 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 40 },
  buttonGroup: { width: '100%', gap: 15 },
  langBtn: {
    width: '100%',
    height: 80,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5
  },
  langText: { fontSize: 22, fontWeight: 'bold' },
  langNative: { fontSize: 12, color: '#888', fontWeight: '600' }
});

export default LanguageSelectScreen;
