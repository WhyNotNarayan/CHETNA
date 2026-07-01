/**
 * Utility to parse time strings like "10:30 PM" into {hours, minutes}
 */
export const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  try {
    const parts = timeStr.trim().split(' ');
    if (parts.length < 2) return null;
    const [time, period] = parts;
    let [hours, minutes] = time.split(':').map(Number);
    if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  } catch (e) {
    return null;
  }
};

/**
 * Checks if current time is within a range.
 * Supports ranges crossing midnight (e.g., 10 PM to 4 AM)
 */
export const isTimeInRange = (startTime, endTime) => {
  const start = parseTimeString(startTime);
  const end = parseTimeString(endTime);

  // If no time is configured, it's always active
  if (!start || !end) return true;

  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = start.hours * 60 + start.minutes;
  const endMins = end.hours * 60 + end.minutes;

  if (startMins <= endMins) {
    // Normal range (e.g., 10:00 to 18:00)
    return nowMins >= startMins && nowMins <= endMins;
  } else {
    // Range crossing midnight (e.g., 22:00 to 04:00)
    return nowMins >= startMins || nowMins <= endMins;
  }
};
