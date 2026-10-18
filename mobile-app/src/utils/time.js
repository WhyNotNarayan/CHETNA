/**
 * Parse a time string in either 12H ("10:30 PM") or 24H ("18:00" / "18:30") format.
 * Returns { hours, minutes } in 24-hour, or null if invalid.
 */
export const parseTimeString = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  try {
    // 12H format: "10:30 PM" / "4:05 AM" / "10 PM"
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2) {
      const [timePart, periodRaw] = parts;
      const period = periodRaw.toUpperCase();
      if (period === 'AM' || period === 'PM') {
        const nums = timePart.split(':');
        let hours = parseInt(nums[0], 10);
        const minutes = nums[1] ? parseInt(nums[1], 10) : 0;
        if (isNaN(hours) || isNaN(minutes)) return null;
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
        return { hours, minutes };
      }
    }

    // 24H format: "18:00", "06:30", "18"
    const timeOnly = parts[0];
    const nums = timeOnly.split(':');
    if (nums.length >= 1 && nums.length <= 2) {
      const hours = parseInt(nums[0], 10);
      const minutes = nums[1] !== undefined ? parseInt(nums[1], 10) : 0;
      if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return { hours, minutes };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * Format hours+minutes to "HH:MM AM/PM" string for storage.
 */
export const formatTo12H = (hours, minutes) => {
  const period = hours >= 12 ? 'PM' : 'AM';
  let h = hours % 12;
  if (h === 0) h = 12;
  const m = String(minutes).padStart(2, '0');
  return `${h}:${m} ${period}`;
};

/**
 * Normalize any time string to 12H AM/PM format.
 * "18:00" → "6:00 PM", "6:00 PM" → "6:00 PM", null → null
 */
export const normalizeTime = (timeStr) => {
  const parsed = parseTimeString(timeStr);
  if (!parsed) return timeStr || null;
  return formatTo12H(parsed.hours, parsed.minutes);
};

/**
 * Live input handler for time fields.
 * While typing, if the input is a complete valid time, convert it to 12H AM/PM.
 * Returns the input unchanged if not yet a complete valid time (so typing isn't disrupted).
 *
 * "18:00" → "6:00 PM"
 * "18:0"  → stays "18:0" (still typing)
 * "6:00 PM" → stays "6:00 PM"
 * "abc"   → stays "abc"
 */
export const normalizeTimeInput = (input) => {
  if (!input) return '';
  const trimmed = input.trim();

  // Already has AM/PM
  if (/\b(am|pm)\b/i.test(trimmed)) {
    const parsed = parseTimeString(trimmed);
    if (parsed) return formatTo12H(parsed.hours, parsed.minutes);
    return input;
  }

  // Pure 24H numbers like "18:00" or "18" — convert to 12H immediately
  if (/^\d{1,2}(:\d{1,2})?$/.test(trimmed)) {
    const parsed = parseTimeString(trimmed);
    if (parsed) return formatTo12H(parsed.hours, parsed.minutes);
  }

  return input;
};

/**
 * Checks if current time is within a range.
 * Supports 12H and 24H input, ranges crossing midnight (e.g., 10 PM to 4 AM).
 * If no time configured, returns true (always active).
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
