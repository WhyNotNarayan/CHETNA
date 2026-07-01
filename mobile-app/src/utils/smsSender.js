/**
 * smsSender.js — SMS functionality has been removed.
 * All emergency alerts are now delivered securely inside the Chetna app
 * through the Parent Emergency Portal. No external SMS is sent.
 */

export const sendEmergencySMS = async (_contacts, _location) => {
  console.log('[smsSender] SMS sending is disabled. Alerts flow via Chetna in-app notifications.');
  return 'disabled';
};
