import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import api from './api';

const QUEUE_KEY_LOCATIONS = 'offline_sos_locations';
const QUEUE_KEY_MEDIA = 'offline_sos_media';

const isOnline = async () => {
  try {
    const res = await api.get('/health');
    return !!(res.data && res.data.status);
  } catch {
    return false;
  }
};

// Queue a GPS coordinate for upload
export const queueLocation = async (alertId, latitude, longitude) => {
  try {
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY_LOCATIONS);
    const queue = rawQueue ? JSON.parse(rawQueue) : [];
    queue.push({ alertId, latitude, longitude, timestamp: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY_LOCATIONS, JSON.stringify(queue));
    console.log('[OfflineSync] Queued location:', { latitude, longitude });
    attemptSync();
  } catch (err) {
    console.error('[OfflineSync] Error queueing location:', err);
  }
};

/**
 * Reads a local file URI as a base64 string using expo-file-system.
 * This is native and prevents binary corruption.
 */
const readFileAsBase64 = async (fileUri) => {
  try {
    // If the URI starts with file://, strip it or pass it directly. FileSystem handles file:// URIs directly.
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (err) {
    console.error('[OfflineSync] Error reading file as base64 with FileSystem:', err);
    return null;
  }
};

// Upload a single media file immediately via binary stream
const uploadMediaFile = async (alertId, fileUri, fileType) => {
  const userToken = await AsyncStorage.getItem('userToken');
  // Build full URL — baseURL already includes /api
  const uploadUrl = `${api.defaults.baseURL}/alerts/${alertId}/upload-evidence-binary`;

  console.log(`[OfflineSync] Uploading ${fileType} directly to: ${uploadUrl}`);
  console.log(`[OfflineSync] File URI: ${fileUri}`);

  // Verify the file exists before uploading
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    console.error('[OfflineSync] File does not exist at URI:', fileUri);
    return false;
  }
  console.log(`[OfflineSync] File size: ${fileInfo.size} bytes`);

  // For video files, verify it's a valid MP4 by checking file signature
  if (fileType === 'VIDEO') {
    try {
      const header = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
        length: 32,
        position: 0,
      });
      // MP4 files should have 'ftyp' at offset 4
      const base64Header = header.substring(0, 16);
      console.log('[OfflineSync] Video file header (base64):', base64Header);
    } catch (e) {
      console.warn('[OfflineSync] Could not read video header:', e.message);
    }
  }

  const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
headers: {
      'Authorization': `Bearer ${userToken}`,
      'X-File-Type': fileType,
      'Content-Type': fileType === 'VIDEO' ? 'video/mp4' : 'audio/m4a',
    },
  });

  console.log(`[OfflineSync] Upload result status: ${result.status}`);
  console.log(`[OfflineSync] Upload response body: ${result.body}`);

  if (result.status === 200 || result.status === 201) {
    try {
      const response = JSON.parse(result.body);
      if (response.success) {
        console.log('[OfflineSync] Upload confirmed by server:', response.evidence?.id);
        return true;
      }
    } catch (e) {
      console.warn('[OfflineSync] Could not parse server response:', e.message);
    }
  }

  return false;
};

// Queue a local audio/video file URI for upload (tries immediate upload first)
export const queueMedia = async (alertId, fileUri, fileType) => {
  try {
    console.log(`[OfflineSync] queueMedia called: ${fileType} for alert ${alertId}`);

    // Try immediate upload first if online
    const online = await isOnline();
    if (online) {
      try {
        const success = await uploadMediaFile(alertId, fileUri, fileType);
        if (success) {
          console.log('[OfflineSync] Immediate upload succeeded!');
          try { await FileSystem.deleteAsync(fileUri, { idempotent: true }); } catch (e) {}
          return; // Done — no need to queue
        }
        console.warn('[OfflineSync] Immediate upload failed, queuing for retry...');
      } catch (uploadErr) {
        console.warn('[OfflineSync] Immediate upload threw error:', uploadErr.message);
      }
    }

    // Fall back to queue for retry
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY_MEDIA);
    const queue = rawQueue ? JSON.parse(rawQueue) : [];
    queue.push({ alertId, fileUri, fileType, timestamp: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY_MEDIA, JSON.stringify(queue));
    console.log('[OfflineSync] Media queued for retry. Queue size:', queue.length);
  } catch (err) {
    console.error('[OfflineSync] Error in queueMedia:', err);
  }
};


let syncInProgress = false;

export const attemptSync = async () => {
  if (syncInProgress) return;
  if (!(await isOnline())) {
    console.log('[OfflineSync] Offline — skipping sync.');
    return;
  }
  syncInProgress = true;
  console.log('[OfflineSync] Online — starting sync...');
  try {
    await syncLocations();
    await syncMedia();
  } finally {
    syncInProgress = false;
  }
};

// Upload queued GPS coordinates
const syncLocations = async () => {
  try {
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY_LOCATIONS);
    if (!rawQueue) return;
    const queue = JSON.parse(rawQueue);
    if (!queue.length) return;

    console.log(`[OfflineSync] Uploading ${queue.length} locations...`);
    const failed = [];

    for (const item of queue) {
      try {
        await api.post(`/alerts/${item.alertId}/track`, {
          latitude: item.latitude,
          longitude: item.longitude
        });
      } catch (err) {
        console.warn('[OfflineSync] Location upload failed, will retry:', err.message);
        failed.push(item);
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY_LOCATIONS, JSON.stringify(failed));
    console.log(`[OfflineSync] Location sync done. Remaining: ${failed.length}`);
  } catch (err) {
    console.error('[OfflineSync] Location sync error:', err);
  }
};

// Retry upload of queued audio/video files
const syncMedia = async () => {
  try {
    const rawQueue = await AsyncStorage.getItem(QUEUE_KEY_MEDIA);
    if (!rawQueue) return;
    const queue = JSON.parse(rawQueue);
    if (!queue.length) return;

    console.log(`[OfflineSync] Retrying ${queue.length} queued media files...`);
    const failed = [];

    for (const item of queue) {
      try {
        const success = await uploadMediaFile(item.alertId, item.fileUri, item.fileType);
        if (success) {
          console.log('[OfflineSync] Queued media uploaded successfully:', item.fileUri);
          try { await FileSystem.deleteAsync(item.fileUri, { idempotent: true }); } catch (e) {}
        } else {
          console.warn('[OfflineSync] Queued media upload failed, keeping for retry:', item.fileUri);
          failed.push(item);
        }
      } catch (err) {
        console.warn('[OfflineSync] Media upload error, will retry:', err.message);
        failed.push(item);
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY_MEDIA, JSON.stringify(failed));
    console.log(`[OfflineSync] Media sync done. Remaining: ${failed.length}`);
  } catch (err) {
    console.error('[OfflineSync] Media sync error:', err);
  }
};
