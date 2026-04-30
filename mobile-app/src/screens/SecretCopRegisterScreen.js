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
import { Shield, Briefcase, MapPin, CheckCircle, ChevronLeft } from 'lucide-react-native';
import api from '../utils/api';
import { AuthContext } from '../context/AuthContext';

const SecretCopRegisterScreen = ({ navigation }) => {
  const { userData, setUserData } = useContext(AuthContext);
  const [profession, setProfession] = useState('');
  const [workAddress, setWorkAddress] = useState('');
  const [loading, setLoading] = useState(false);

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
              <Text style={styles.label}>Workplace/Office Address</Text>
              <View style={styles.inputWrapper}>
                <MapPin size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
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
    marginBottom: 8,
    marginLeft: 5,
    fontWeight: '600',
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
