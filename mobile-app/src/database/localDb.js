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
      warning_message TEXT
    );
    
    CREATE TABLE IF NOT EXISTS pending_alerts (
      id TEXT PRIMARY KEY NOT NULL,
      latitude REAL,
      longitude REAL,
      voice_trigger INTEGER,
      evidence_path TEXT,
      created_at TEXT
    );
  `);
};

export const saveRedZones = async (zones) => {
  // Clear old ones first for simplicity in this mock
  await db.runAsync('DELETE FROM red_zones');
  
  for (const zone of zones) {
    await db.runAsync(
      'INSERT INTO red_zones (id, name, latitude, longitude, radius, risk_level, warning_message) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [zone.id, zone.name, zone.latitude, zone.longitude, zone.radius, zone.riskLevel, zone.warningMessage]
    );
  }
};

export const getLocalRedZones = async () => {
  const result = await db.getAllAsync('SELECT * FROM red_zones');
  return result;
};

export const savePendingAlert = async (alert) => {
  await db.runAsync(
    'INSERT INTO pending_alerts (id, latitude, longitude, voice_trigger, evidence_path, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [alert.id, alert.latitude, alert.longitude, alert.voiceTrigger ? 1 : 0, alert.evidencePath, new Date().toISOString()]
  );
};
