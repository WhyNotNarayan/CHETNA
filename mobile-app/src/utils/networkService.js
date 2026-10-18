import api from './api';

let _isOnline = true;
const _listeners = [];
let _pingTimer = null;

const PING_INTERVAL = 15000; // 15 seconds
const PING_TIMEOUT = 5000;

/**
 * Ping the server to check real connectivity.
 * Uses a short timeout so the check is fast.
 */
const pingServer = async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT);
    const res = await api.get('/health', { signal: controller.signal });
    clearTimeout(timeout);
    return !!(res.data && res.data.status);
  } catch {
    return false;
  }
};

/**
 * Update online status and notify listeners on change.
 */
const setOnline = (online) => {
  if (_isOnline !== online) {
    const wasOffline = !_isOnline;
    _isOnline = online;
    console.log(`[Network] Status changed: ${online ? 'ONLINE' : 'OFFLINE'}`);
    // Notify all listeners
    for (const fn of _listeners) {
      try { fn(online, wasOffline); } catch (e) {}
    }
  }
};

/**
 * Check connectivity now (immediate).
 * Returns true if online.
 */
export const checkConnectivity = async () => {
  const online = await pingServer();
  setOnline(online);
  return online;
};

/**
 * Get current cached online status (no network call).
 */
export const isOnline = () => _isOnline;

/**
 * Subscribe to connectivity changes.
 * Callback receives (isOnline, wasOffline).
 * Returns an unsubscribe function.
 */
export const onConnectivityChange = (callback) => {
  _listeners.push(callback);
  return () => {
    const idx = _listeners.indexOf(callback);
    if (idx > -1) _listeners.splice(idx, 1);
  };
};

/**
 * Start periodic connectivity checks.
 * Call once on app start / login.
 */
export const startConnectivityMonitor = () => {
  if (_pingTimer) return;
  console.log('[Network] Connectivity monitor started');

  // Initial check
  checkConnectivity();

  // Periodic ping
  _pingTimer = setInterval(async () => {
    await checkConnectivity();
  }, PING_INTERVAL);
};

/**
 * Stop periodic connectivity checks.
 */
export const stopConnectivityMonitor = () => {
  if (_pingTimer) {
    clearInterval(_pingTimer);
    _pingTimer = null;
    console.log('[Network] Connectivity monitor stopped');
  }
};
