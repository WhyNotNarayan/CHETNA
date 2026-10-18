import { useEffect, useRef, useState, useContext } from 'react';
import { DeviceEventEmitter } from 'react-native';
import Voice from '@dev-amirzubair/react-native-voice';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';
import { saveSosOffline } from '../utils/offlineSosService';
import { LanguageContext } from '../context/LanguageContext';

const LISTEN_DURATION = 8000;

const SOS_KEYWORDS = [
  'help me', 'help', 'emergency', 'sos', 'save me', 'danger', 'save',
  'bachao', 'bachao mujhe', 'madad', 'khatra', 'suraksha', 'bacha lo',
  'मला बचाव', 'मदत', 'मला मदत', 'धोका', 'संकट', 'वाचवा',
];

const TTS = {
  en: {
    micOn: 'Microphone is on. Say Help me.',
    sent: 'Emergency alert sent. Help is on the way.',
    stopped: 'Listening stopped.',
    prompt: 'Say "Help Me"',
    recogLocale: 'en-US',
    voice: 'en-US',
  },
  mr: {
    micOn: 'माइक्रोफोन चालू आहे. मदत म्हणा.',
    sent: 'आपत्कालीन इशारा पाठवला. मदत येत आहे.',
    stopped: 'ऐकणे थांबले.',
    prompt: '"मदत" म्हणा',
    recogLocale: 'mr-IN',
    voice: 'mr-IN',
  },
  hi: {
    micOn: 'माइक्रोफ़ोन चालू है। मदद कहें।',
    sent: 'आपातकालीन अलर्ट भेजा गया। मदद आ रही है।',
    stopped: 'सुनना बंद।',
    prompt: '"मदद" कहें',
    recogLocale: 'hi-IN',
    voice: 'hi-IN',
  },
};

export function useVolumeSOS(navigation, userData) {
  const [isMicActive, setIsMicActive] = useState(false);
  const [voicePrompt, setVoicePrompt] = useState('');
  const listenTimeout = useRef(null);
  const isProcessing = useRef(false);
  const { lang } = useContext(LanguageContext);
  const langRef = useRef(lang);

  useEffect(() => { langRef.current = lang; }, [lang]);

  const tts = () => TTS[langRef.current] || TTS.en;

  const stopMic = () => {
    try {
      Voice.stop().catch(() => {});
      Voice.destroy().catch(() => {});
    } catch (e) {}
    setIsMicActive(false);
    setVoicePrompt('');
    if (listenTimeout.current) {
      clearTimeout(listenTimeout.current);
      listenTimeout.current = null;
    }
  };

  const triggerSOS = async (voiceTrigger = true) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    stopMic();

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('SOS: Location permission denied');
        isProcessing.current = false;
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const payload = {
        userId: userData?.id,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        voiceTrigger
      };

      let response;
      try {
        console.log('SOS: Sending alert to server...');
        response = await api.post('/alerts/trigger', payload);
      } catch (networkErr) {
        // Network failed → save offline
        console.log('[SOS] Network failed, saving offline...');
        const clientUuid = await saveSosOffline(payload);
        if (navigation) {
          Speech.speak(tts().sent, { language: tts().voice });
          navigation.navigate('SOSTracking', {
            alertId: clientUuid,
            isOffline: true
          });
        }
        return;
      }

      console.log('SOS: Server response:', response.data);

      if (response.data?.success && navigation) {
        Speech.speak(tts().sent, { language: tts().voice });
        navigation.navigate('SOSTracking', { 
          alertId: response.data.alertId,
          evidenceToken: response.data.evidenceToken,
          evidenceUrl: response.data.evidenceUrl
        });
      }
    } catch (e) {
      console.error('Volume SOS Trigger Error:', e?.response?.data || e.message || e);
    } finally {
      isProcessing.current = false;
    }
  };

  const analyzeSpeech = (results) => {
    const transcript = (results[0] || '').toLowerCase().trim();
    console.log('SOS Voice transcript:', transcript);
    const matched = SOS_KEYWORDS.some(kw => transcript.includes(kw));
    console.log('SOS Voice matched:', matched);
    if (matched) {
      triggerSOS(true);
    }
  };

  const startMicListening = async () => {
    if (isProcessing.current) return;

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('SOS Voice: Microphone permission denied');
        return;
      }
    } catch (permError) {
      console.warn('Microphone permission request error:', permError);
    }

    setIsMicActive(true);
    setVoicePrompt(tts().prompt);

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Speech.speak(tts().micOn, { language: tts().voice });

    try {
      await Voice.destroy();
    } catch (e) {}

    try {
      Voice.onSpeechResults = (e) => {
        console.log('SOS Voice results:', JSON.stringify(e.value));
        if (e.value && e.value.length > 0) analyzeSpeech(e.value);
      };
      Voice.onSpeechError = (e) => {
        console.log('SOS Voice error:', JSON.stringify(e));
      };
      Voice.onSpeechEnd = () => {
        console.log('SOS Voice ended');
      };

      await Voice.start(tts().recogLocale);
      console.log('SOS Voice started successfully with locale:', tts().recogLocale);
    } catch (e) {
      console.error('Voice start error:', e);
    }

    listenTimeout.current = setTimeout(() => {
      console.log('SOS Voice timeout - stopping microphone (no keyword detected)');
      stopMic();
      Speech.speak(tts().stopped, { language: tts().voice });
    }, LISTEN_DURATION);
  };

  useEffect(() => {
    if (userData?.role !== 'GIRL') {
      console.log('SOS: User is not a girl, volume listener skipped');
      return;
    }

    let lastEventTime = 0;

    const subscription = DeviceEventEmitter.addListener('onVolumePress', () => {
      const now = Date.now();
      if (now - lastEventTime < 3000) {
        console.log('SOS: Volume event ignored (cooldown)');
        return;
      }
      lastEventTime = now;
      console.log('SOS: Volume press event received (3 clicks completed in native)');
      startMicListening();
    });

    console.log('SOS: Volume listener registered for girl user, userData id:', userData?.id);

    return () => {
      subscription?.remove();
      try { Voice.destroy(); } catch (e) {}
      if (listenTimeout.current) clearTimeout(listenTimeout.current);
    };
  }, [userData?.id, userData?.role]);

  return { isMicActive, voicePrompt, stopMic };
}
