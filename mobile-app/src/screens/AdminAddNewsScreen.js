import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { 
  ChevronLeft, 
  Bell, 
  AlertTriangle, 
  Info, 
  ShieldAlert,
  Car
} from 'lucide-react-native';
import api from '../utils/api';

const AdminAddNewsScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [source, setSource] = useState('District Admin');
  const [type, setType] = useState('INFO'); // INFO, WARNING, ACCIDENT
  const [loading, setLoading] = useState(false);

  const handlePostNews = async () => {
    if (!title || !content) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/news/add', {
        title,
        content,
        source: `${source} • ${type === 'ACCIDENT' ? 'EMERGENCY' : 'Update'}`,
        type
      });

      if (response.data.success) {
        Alert.alert('Success', 'News posted successfully');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to post news');
    } finally {
      setLoading(false);
    }
  };

  const types = [
    { id: 'INFO', label: 'General', icon: Info, color: '#4CAF50' },
    { id: 'WARNING', label: 'Warning', icon: AlertTriangle, color: '#FFD700' },
    { id: 'ACCIDENT', label: 'Accident', icon: Car, color: '#FF4444' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Safety News</Text>
        <Bell color="#FFD700" size={24} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>News Type</Text>
          <View style={styles.typeContainer}>
            {types.map((t) => (
              <TouchableOpacity 
                key={t.id} 
                style={[
                  styles.typeBtn, 
                  type === t.id && { backgroundColor: t.color, borderColor: t.color }
                ]}
                onPress={() => setType(t.id)}
              >
                <t.icon size={18} color={type === t.id ? '#000' : '#888'} />
                <Text style={[styles.typeText, type === t.id && { color: '#000' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Headline</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Major Accident near Sawantwadi..."
            placeholderTextColor="#444"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Detailed Description</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Describe the situation and provide safety advice..."
            placeholderTextColor="#444"
            multiline
            numberOfLines={5}
            value={content}
            onChangeText={setContent}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Official Source</Text>
          <TextInput 
            style={styles.input}
            placeholder="e.g. Sindhudurg Police"
            placeholderTextColor="#444"
            value={source}
            onChangeText={setSource}
          />
        </View>

        <TouchableOpacity 
          style={[styles.postBtn, loading && { opacity: 0.7 }]} 
          onPress={handlePostNews}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <ShieldAlert size={20} color="#000" />
              <Text style={styles.postBtnText}>Post to Sindhudurg</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#222', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 20 },
  inputGroup: { marginBottom: 25 },
  label: { color: '#FFD700', fontSize: 12, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
  typeContainer: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#111', borderWidth: 1, borderColor: '#333', gap: 8 },
  typeText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  input: { backgroundColor: '#111', borderRadius: 12, borderWidth: 1, borderColor: '#333', padding: 15, color: '#FFF', fontSize: 16 },
  textArea: { height: 120, textAlignVertical: 'top' },
  postBtn: { backgroundColor: '#FFD700', height: 60, borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 10 },
  postBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
});

export default AdminAddNewsScreen;
