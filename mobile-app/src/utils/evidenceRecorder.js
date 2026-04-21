import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

let recording = null;

export const startEvidenceRecording = async () => {
  try {
    const permission = await Audio.requestPermissionsAsync();
    if (permission.status !== 'granted') return null;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recording = newRecording;
    console.log('Recording started');
    return true;
  } catch (err) {
    console.error('Failed to start recording', err);
    return false;
  }
};

export const stopEvidenceRecording = async () => {
  try {
    if (!recording) return null;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;
    console.log('Recording stopped at', uri);
    return uri;
  } catch (err) {
    console.error('Failed to stop recording', err);
    return null;
  }
};

export const clearEvidence = async (uri) => {
  try {
    await FileSystem.deleteAsync(uri);
  } catch (err) {
    console.error('Failed to delete evidence file', err);
  }
};
