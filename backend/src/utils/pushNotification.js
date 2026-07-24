const { Expo } = require('expo-server-sdk');

const expo = new Expo();

/**
 * Send a push notification to a single user
 * @param {string} pushToken - Expo push token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 */
exports.sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!Expo.isExpoPushToken(pushToken)) {
    console.warn(`[Push] Invalid push token: ${pushToken}`);
    return false;
  }

  try {
    const tickets = await expo.pushNotificationsAsync([
      {
        to: pushToken,
        title,
        body,
        data,
        sound: true,
        priority: 'high',
      },
    ]);

    const ticket = tickets[0];
    if (ticket.status === 'error') {
      console.error(`[Push] Error sending notification: ${ticket.message}`);
      if (ticket.details && ticket.details.error) {
        if (ticket.details.error === 'DeviceNotRegistered') {
          console.warn('[Push] Device not registered — token should be removed');
          return { success: false, shouldRemoveToken: true };
        }
      }
      return false;
    }

    console.log(`[Push] Notification sent successfully: ${ticket.id}`);
    return true;
  } catch (error) {
    console.error('[Push] Failed to send notification:', error.message);
    return false;
  }
};

/**
 * Send push notifications to multiple users (batched)
 * @param {Array} notifications - [{pushToken, title, body, data}]
 */
exports.sendBulkPushNotifications = async (notifications) => {
  const validNotifications = [];

  for (const notif of notifications) {
    if (!notif.pushToken || !Expo.isExpoPushToken(notif.pushToken)) {
      console.warn(`[Push] Skipping invalid token: ${notif.pushToken}`);
      continue;
    }

    validNotifications.push({
      to: notif.pushToken,
      title: notif.title,
      body: notif.body,
      data: notif.data || {},
      sound: true,
      priority: 'high',
    });
  }

  if (validNotifications.length === 0) return [];

  try {
    const chunks = expo.chunkPushNotifications(validNotifications);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.pushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('[Push] Error sending chunk:', error.message);
      }
    }

    return tickets;
  } catch (error) {
    console.error('[Push] Bulk send failed:', error.message);
    return [];
  }
};

/**
 * Send push notification to a user's parent (emergency contact)
 * @param {string} parentPushToken - Parent's push token
 * @param {string} daughterName - Name of the daughter
 * @param {string} alertType - Type of alert
 * @param {object} extraData - Additional data
 */
exports.sendParentAlert = async (parentPushToken, daughterName, alertType, extraData = {}) => {
  const titles = {
    SOS: `🚨 Emergency Alert from ${daughterName}`,
    SHAKE: `⚠️ Unusual Movement Detected — ${daughterName}`,
    GUARDIAN: `⏰ Guardian Timer Alert — ${daughterName}`,
    ZONE: `⚠️ Safety Warning — ${daughterName}`,
  };

  const bodies = {
    SOS: `${daughterName} has triggered an emergency SOS. Tap to view location.`,
    SHAKE: `Unusual movement detected from ${daughterName}'s phone. Are they safe?`,
    GUARDIAN: `${daughterName} has been in a high-risk area longer than expected.`,
    ZONE: `${daughterName} has entered a known crime area.`,
  };

  return exports.sendPushNotification(
    parentPushToken,
    titles[alertType] || `Safety Alert — ${daughterName}`,
    bodies[alertType] || `Alert from ${daughterName}`,
    { alertType, daughterName, ...extraData }
  );
};
