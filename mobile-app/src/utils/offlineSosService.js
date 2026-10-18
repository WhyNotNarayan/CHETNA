import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { isOnline, onConnectivityChange } from './networkService';
import {
  saveSosAlert, getSosAlert, getPendingSosAlerts, updateSosAlertStatus,
  incrementSosRetry, saveSosEvidence, getPendingEvidence,
  updateEvidenceStatus, incrementEvidenceRetry, deleteEvidence
} from '../database/localDb';

const MAX_RETRIES = 5;
let _syncing = false;
let _statusListeners = [];
let _unsubscribeNetwork = null;
let _initialized = false;

// ── Status listeners (for UI) ─────────────────────────────

export const onSosStatusChange = (callback) => {
  _statusListeners.push(callback);
  return () => {
    const idx = _statusListeners.indexOf(callback);
    if (idx > -1) _statusListeners.splice(idx, 1);
  };
};

const notifyStatus = (alertId, status) => {
  for (const fn of _statusListeners) {
    try { fn(alertId, status); } catch (e) {}
  }
};

// ── Generate client UUID ──────────────────────────────────

export const generateClientUuid = () => {
  return Crypto.randomUUID();
};

// ── Save SOS offline ──────────────────────────────────────

/**
 * Save an SOS alert locally when the server is unreachable.
 * Returns the client-generated UUID.
 */
export const saveSosOffline = async ({ userId, latitude, longitude, voiceTrigger = false }) => {
  const id = generateClientUuid();
  await saveSosAlert({
    id,
    userId,
    latitude,
    longitude,
    voiceTrigger,
    syncStatus: 'pending',
    serverAlertId: null,
    retries: 0,
    createdAt: new Date().toISOString()
  });
  console.log(`[OfflineSOS] SOS saved locally with id: ${id}`);
  notifyStatus(id, 'pending');
  return id;
};

// ── Save evidence offline ─────────────────────────────────

/**
 * Queue an evidence file for upload (online or offline).
 */
export const saveEvidenceOffline = async (alertId, filePath, fileType) => {
  const id = generateClientUuid();
  await saveSosEvidence({
    id,
    alertId,
    filePath,
    fileType,
    syncStatus: 'pending',
    retries: 0,
    createdAt: new Date().toISOString()
  });
  console.log(`[OfflineSOS] Evidence queued: ${fileType} for alert ${alertId}`);
  // Try immediate sync if online
  syncPendingSos();
  return id;
};

// ── Core sync logic ───────────────────────────────────────

const uploadEvidenceFile = async (alertId, fileUri, fileType) => {
  const userToken = await AsyncStorage.getItem('userToken');
  const uploadUrl = `${api.defaults.baseURL}/alerts/${alertId}/upload-evidence-binary`;

  try {
    const result = await FileSystem.uploadAsync(uploadUrl, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'X-File-Type': fileType,
        'Content-Type': fileType === 'VIDEO' ? 'video/mp4' : 'audio/m4a',
      },
    });

    if (result.status === 200 || result.status === 201) {
      try {
        const response = JSON.parse(result.body);
        return response.success;
      } catch (e) {
        return true;
      }
    }
    return false;
  } catch (err) {
    console.warn(`[OfflineSOS] Evidence upload error: ${err.message}`);
    return false;
  }
};

/**
 * Sync all pending SOS alerts and evidence with the server.
 * Safe to call repeatedly — uses a mutex to prevent concurrent syncs.
 */
export const syncPendingSos = async () => {
  if (_syncing) return;
  if (!isOnline()) return;

  const token = await AsyncStorage.getItem('userToken');
  if (!token) return;

  _syncing = true;
  console.log('[OfflineSOS] Starting sync...');

  try {
    // 1. Sync pending alerts first
    const pendingAlerts = await getPendingSosAlerts();
    for (const alert of pendingAlerts) {
      if (alert.retries >= MAX_RETRIES) {
        console.log(`[OfflineSOS] Alert ${alert.id} exceeded max retries, marking failed`);
        await updateSosAlertStatus(alert.id, 'failed');
        notifyStatus(alert.id, 'failed');
        continue;
      }

      try {
        await updateSosAlertStatus(alert.id, 'syncing');
        notifyStatus(alert.id, 'syncing');

        const response = await api.post('/alerts/trigger', {
          userId: alert.user_id,
          latitude: alert.latitude,
          longitude: alert.longitude,
          voiceTrigger: alert.voice_trigger === 1,
          clientUuid: alert.id  // Send client UUID so backend can deduplicate
        });

        if (response.data?.success) {
          const serverAlertId = response.data.alertId;
          await updateSosAlertStatus(alert.id, 'synced', serverAlertId);
          notifyStatus(alert.id, 'synced');
          console.log(`[OfflineSOS] Alert ${alert.id} synced → server id: ${serverAlertId}`);
        } else {
          throw new Error(response.data?.message || 'Server rejected alert');
        }
      } catch (err) {
        console.warn(`[OfflineSOS] Alert ${alert.id} sync failed: ${err.message}`);
        await incrementSosRetry(alert.id);
        await updateSosAlertStatus(alert.id, 'failed');
        notifyStatus(alert.id, 'failed');
      }
    }

    // 2. Sync pending evidence
    const pendingEvid = await getPendingEvidence();
    for (const ev of pendingEvid) {
      if (ev.retries >= MAX_RETRIES) {
        console.log(`[OfflineSOS] Evidence ${ev.id} exceeded max retries, marking failed`);
        await updateEvidenceStatus(ev.id, 'failed');
        continue;
      }

      // Find the server alert ID for this evidence
      const parentAlert = await getSosAlert(ev.alert_id);
      if (!parentAlert) {
        await deleteEvidence(ev.id);
        continue;
      }

      const serverAlertId = parentAlert.server_alert_id || parentAlert.id;
      if (parentAlert.sync_status !== 'synced') {
        // Parent alert not synced yet — skip, will retry later
        continue;
      }

      try {
        await updateEvidenceStatus(ev.id, 'syncing');

        // Verify file still exists
        try {
          const fileInfo = await FileSystem.getInfoAsync(ev.file_path);
          if (!fileInfo.exists) {
            console.warn(`[OfflineSOS] Evidence file missing: ${ev.file_path}`);
            await deleteEvidence(ev.id);
            continue;
          }
        } catch (e) {
          await deleteEvidence(ev.id);
          continue;
        }

        const success = await uploadEvidenceFile(serverAlertId, ev.file_path, ev.file_type);
        if (success) {
          await updateEvidenceStatus(ev.id, 'synced');
          // Delete local file after successful upload
          try { await FileSystem.deleteAsync(ev.file_path, { idempotent: true }); } catch (e) {}
          await deleteEvidence(ev.id);
          console.log(`[OfflineSOS] Evidence ${ev.id} uploaded and cleaned up`);
        } else {
          throw new Error('Upload failed');
        }
      } catch (err) {
        console.warn(`[OfflineSOS] Evidence ${ev.id} sync failed: ${err.message}`);
        await incrementEvidenceRetry(ev.id);
        await updateEvidenceStatus(ev.id, 'failed');
      }
    }
  } finally {
    _syncing = false;
    console.log('[OfflineSOS] Sync complete');
  }
};

// ── Get status for a specific alert ───────────────────────

export const getSosStatus = async (alertId) => {
  const alert = await getSosAlert(alertId);
  if (!alert) return null;  // Not in local DB → must be a server alert
  return {
    id: alert.id,
    syncStatus: alert.sync_status,
    serverAlertId: alert.server_alert_id,
    retries: alert.retries
  };
};

// ── Get unsynced count (for UI badge) ─────────────────────

export const getUnsyncedCount = async () => {
  try {
    const pendingAlerts = await getPendingSosAlerts();
    const pendingEvid = await getPendingEvidence();
    return pendingAlerts.length + pendingEvid.length;
  } catch (e) {
    return 0;
  }
};

// ── Initialize: auto-sync on network restore ──────────────

export const initOfflineSos = () => {
  if (_initialized) return;
  _initialized = true;

  // Listen for network restoration → auto-sync
  _unsubscribeNetwork = onConnectivityChange((online, wasOffline) => {
    if (online && wasOffline) {
      console.log('[OfflineSOS] Network restored — triggering sync');
      setTimeout(() => syncPendingSos(), 1000);
    }
  });

  // Try initial sync in case there are leftover pending alerts
  setTimeout(() => syncPendingSos(), 2000);

  console.log('[OfflineSOS] Initialized');
};

export const stopOfflineSos = () => {
  if (_unsubscribeNetwork) {
    _unsubscribeNetwork();
    _unsubscribeNetwork = null;
  }
  _initialized = false;
};
