import * as SMS from 'expo-sms';

export const sendEmergencySMS = async (contacts, location) => {
  const isAvailable = await SMS.isAvailableAsync();
  if (isAvailable) {
    const { latitude, longitude } = location;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const message = `EMERGENCY! I need help. My current location: ${googleMapsUrl}`;
    
    // In a real app, this would be automated via a background service if possible,
    // but Expo SMS opens the default SMS app for user confirmation.
    // For full automation, a backend integration with Twilio is recommended.
    const { result } = await SMS.sendSMSAsync(
      contacts.map(c => c.phone),
      message
    );
    return result;
  } else {
    console.warn('SMS is not available on this device');
    return 'unavailable';
  }
};
