import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as Location from 'expo-location';
import { Shield, Briefcase, MapPin, CheckCircle, ChevronLeft } from 'lucide-react-native';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const SecretCopRegisterScreen = ({ navigation }) => {
  const { userData, setUserData } = useContext(AuthContext);
  const [profession, setProfession] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      // 1. Check current status
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      let finalStatus = existingStatus;

      // 2. If not granted, request it
      if (existingStatus !== 'granted') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      // 3. If still not granted, tell the user how to fix it
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'To auto-fill your workplace, please enable location permissions in your phone settings for Chetna.',
          [{ text: 'OK' }]
        );
        setIsLocating(false);
        return;
      }

      // 4. Get position if granted
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let reverse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (reverse.length > 0) {
        const place = reverse[0];
        const street = place.street || place.name || '';
        const city = place.city || place.subregion || '';
        const region = place.region || '';
        const formattedAddress = [street, city, region].filter(Boolean).join(', ');
        setWorkAddress(formattedAddress);
      }
    } catch (error) {
      console.warn("Location Error:", error);
      Alert.alert('Location Error', 'Unable to fetch your live location right now. Please check your GPS settings.');
    }
    setIsLocating(false);
  };

  const handleSubmit = async () => {
    if (!profession || !workAddress) {
      Alert.alert('Missing Info', 'Please fill in your profession and work location.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/apply-secret-cop', {
        profession,
        workAddress,
        userId: userData.id
      });

      if (response.data.success) {
        // Update local user data to show verified status IMMEDIATELY
        setUserData({ 
          ...userData, 
          isVerified: true, 
          isSecretCopPending: false,
          profession,
          workAddress 
        });

        Alert.alert(
          'Verification Successful',
          'Congratulations! You are now a verified Secret Cop for Sindhudurg. Your dashboard has been upgraded.',
          [{ text: 'AWESOME!', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error('Application Error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to submit application. Please try again later.';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secret Cop Registry</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.iconContainer}>
            <Shield size={60} color="#FFD700" />
          </View>

          <Text style={styles.title}>Join Sindhudurg Volunteers</Text>
          <Text style={styles.subtitle}>
            Help protect the women and citizens of Sindhudurg. Your work location helps us alert the right people during office hours.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Your Profession</Text>
              <View style={styles.inputWrapper}>
                <Briefcase size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Teacher, Shopkeeper, Student"
                  placeholderTextColor="#999"
                  value={profession}
                  onChangeText={setProfession}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Workplace/Office Address</Text>
                <TouchableOpacity style={styles.locateBtn} onPress={handleLocateMe} disabled={isLocating}>
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#FFD700" />
                  ) : (
                    <>
                      <MapPin size={12} color="#FFD700" />
                      <Text style={styles.locateBtnText}>Auto Locate</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <MapPin size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { height: 70, textAlignVertical: 'top', paddingTop: 12 }]}
                  placeholder="Where do you work during the day?"
                  placeholderTextColor="#999"
                  value={workAddress}
                  onChangeText={setWorkAddress}
                  multiline
                />
              </View>
            </View>

            <View style={styles.infoCard}>
              <CheckCircle size={20} color="#4488FF" />
              <Text style={styles.infoText}>
                By applying, you agree to respond to nearby emergency alerts when available.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Application</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#111',
  },
  backBtn: {
    padding: 5,
    marginRight: 15,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    padding: 25,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    marginBottom: 30,
  },
  form: {
    width: '100%',
    backgroundColor: '#151515',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#AAA',
    fontSize: 12,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  locateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  locateBtnText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#fff',
    fontSize: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(68, 136, 255, 0.1)',
    padding: 15,
    borderRadius: 15,
    marginBottom: 25,
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#4488FF',
    fontSize: 12,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: '#FFD700',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  disabledBtn: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SecretCopRegisterScreen;
