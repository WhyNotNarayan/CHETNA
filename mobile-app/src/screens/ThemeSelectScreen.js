import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';
import { Moon, Sun, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ThemeSelectScreen({ navigation }) {
  const { theme, toggleTheme, themeMode } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);

  const handleNext = () => {
    navigation.navigate('PrivacyConsent');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Choose Your Style</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Pick the mode that suits your eyes best. You can always change this in settings.
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={[
              styles.optionCard, 
              { backgroundColor: theme.card, borderColor: themeMode === 'light' ? theme.primary : theme.border }
            ]} 
            onPress={() => themeMode === 'dark' && toggleTheme()}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#FFD70020' }]}>
              <Sun color="#FFD700" size={32} />
            </View>
            <Text style={[styles.optionTitle, { color: theme.text }]}>Light Mode</Text>
            {themeMode === 'light' && <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.optionCard, 
              { backgroundColor: theme.card, borderColor: themeMode === 'dark' ? theme.primary : theme.border }
            ]} 
            onPress={() => themeMode === 'light' && toggleTheme()}
          >
            <View style={[styles.iconCircle, { backgroundColor: '#4488FF20' }]}>
              <Moon color="#4488FF" size={32} />
            </View>
            <Text style={[styles.optionTitle, { color: theme.text }]}>Dark Mode</Text>
            {themeMode === 'dark' && <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.nextBtnWrapper} onPress={handleNext}>
          <LinearGradient
            colors={themeMode === 'dark' ? ['#FFD700', '#FFA500'] : ['#4488FF', '#0055FF']}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnText}>CONTINUE</Text>
            <ChevronRight color="#000" size={20} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 60,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 25,
    borderRadius: 24,
    borderWidth: 2,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nextBtnWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  nextBtn: {
    height: 65,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#000',
  }
});
