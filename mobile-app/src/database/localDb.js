import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('chetna_safety.db');

export const initDb = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS red_zones (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT,
      latitude REAL,
      longitude REAL,
      radius REAL,
      risk_level INTEGER,
      warning_message TEXT,
      type TEXT,
      start_time TEXT,
      end_time TEXT
    );

    CREATE TABLE IF NOT EXISTS sos_alerts (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT,
      latitude REAL,
      longitude REAL,
      voice_trigger INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'pending',
      server_alert_id TEXT,
      retries INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sos_evidence (
      id TEXT PRIMARY KEY NOT NULL,
      alert_id TEXT,
      file_path TEXT,
      file_type TEXT,
      sync_status TEXT DEFAULT 'pending',
      retries INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // Migration: ensure new columns exist on old pending_alerts table (safe to ignore errors)
  try {
    await db.execAsync(`ALTER TABLE pending_alerts ADD COLUMN user_id TEXT`);
  } catch (e) {}
  try {
    await db.execAsync(`ALTER TABLE pending_alerts ADD COLUMN sync_status TEXT DEFAULT 'pending'`);
  } catch (e) {}
};

// ── Red Zones ──────────────────────────────────────────────

export const saveRedZones = async (zones) => {
  await db.runAsync('DELETE FROM red_zones');
  for (const zone of zones) {
    await db.runAsync(
      'INSERT INTO red_zones (id, name, latitude, longitude, radius, risk_level, warning_message, type, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        zone.id, zone.name, zone.latitude, zone.longitude,
        zone.radius, zone.riskLevel, zone.warningMessage || zone.description,
        zone.type, zone.startTime, zone.endTime
      ]
    );
  }
};

export const getLocalRedZones = async () => {
  return await db.getAllAsync('SELECT * FROM red_zones');
};

// ── SOS Alerts (offline queue) ────────────────────────────

export const saveSosAlert = async (alert) => {
  await db.runAsync(
    `INSERT OR REPLACE INTO sos_alerts (id, user_id, latitude, longitude, voice_trigger, sync_status, server_alert_id, retries, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      alert.id,
      alert.userId || null,
      alert.latitude,
      alert.longitude,
      alert.voiceTrigger ? 1 : 0,
      alert.syncStatus || 'pending',
      alert.serverAlertId || null,
      alert.retries || 0,
      alert.createdAt || new Date().toISOString(),
      new Date().toISOString()
    ]
  );
};

export const getSosAlert = async (id) => {
  return await db.getFirstAsync('SELECT * FROM sos_alerts WHERE id = ?', [id]);
};

export const getPendingSosAlerts = async () => {
  return await db.getAllAsync(
    "SELECT * FROM sos_alerts WHERE sync_status IN ('pending', 'syncing', 'failed') ORDER BY created_at ASC"
  );
};

export const updateSosAlertStatus = async (id, syncStatus, serverAlertId = null) => {
  await db.runAsync(
    'UPDATE sos_alerts SET sync_status = ?, server_alert_id = COALESCE(?, server_alert_id), updated_at = ? WHERE id = ?',
    [syncStatus, serverAlertId, new Date().toISOString(), id]
  );
};

export const incrementSosRetry = async (id) => {
  await db.runAsync(
    'UPDATE sos_alerts SET retries = retries + 1, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id]
  );
};

// ── SOS Evidence (offline queue) ──────────────────────────

export const saveSosEvidence = async (evidence) => {
  await db.runAsync(
    `INSERT OR REPLACE INTO sos_evidence (id, alert_id, file_path, file_type, sync_status, retries, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      evidence.id,
      evidence.alertId,
      evidence.filePath,
      evidence.fileType,
      evidence.syncStatus || 'pending',
      evidence.retries || 0,
      evidence.createdAt || new Date().toISOString(),
      new Date().toISOString()
    ]
  );
};

export const getPendingEvidence = async (alertId = null) => {
  if (alertId) {
    return await db.getAllAsync(
      "SELECT * FROM sos_evidence WHERE alert_id = ? AND sync_status IN ('pending', 'syncing', 'failed') ORDER BY created_at ASC",
      [alertId]
    );
  }
  return await db.getAllAsync(
    "SELECT * FROM sos_evidence WHERE sync_status IN ('pending', 'syncing', 'failed') ORDER BY created_at ASC"
  );
};

export const updateEvidenceStatus = async (id, syncStatus) => {
  await db.runAsync(
    'UPDATE sos_evidence SET sync_status = ?, updated_at = ? WHERE id = ?',
    [syncStatus, new Date().toISOString(), id]
  );
};

export const incrementEvidenceRetry = async (id) => {
  await db.runAsync(
    'UPDATE sos_evidence SET retries = retries + 1, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id]
  );
};

export const deleteEvidence = async (id) => {
  await db.runAsync('DELETE FROM sos_evidence WHERE id = ?', [id]);
};

export const getUnsyncedCount = async () => {
  const alerts = await db.getAllAsync(
    "SELECT COUNT(*) as c FROM sos_alerts WHERE sync_status IN ('pending', 'syncing', 'failed')"
  );
  const evidence = await db.getAllAsync(
    "SELECT COUNT(*) as c FROM sos_evidence WHERE sync_status IN ('pending', 'syncing', 'failed')"
  );
  return (alerts[0]?.c || 0) + (evidence[0]?.c || 0);
};
