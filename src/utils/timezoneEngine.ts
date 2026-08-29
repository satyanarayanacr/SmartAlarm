import {
  Alarm,
  AlarmOccurrence,
  AffectedAlarmSummary,
  TimezoneBehavior,
  TimezoneInfo,
} from '../types/alarm';
import { formatAlarmTime } from './alarmScheduler';

/**
 * Standard IANA Timezones supported for direct previewing and testing
 */
export const SUPPORTED_TIMEZONES: TimezoneInfo[] = [
  {
    id: 'Asia/Kolkata',
    label: 'India Standard Time (IST)',
    city: 'Hyderabad / Kolkata / Mumbai',
    currentOffsetMinutes: 330, // +05:30
    hasDst: false,
  },
  {
    id: 'Asia/Dubai',
    label: 'Gulf Standard Time (GST)',
    city: 'Dubai / Abu Dhabi',
    currentOffsetMinutes: 240, // +04:00
    hasDst: false,
  },
  {
    id: 'Europe/London',
    label: 'Greenwich Mean Time / BST',
    city: 'London / Edinburgh',
    currentOffsetMinutes: 60, // BST in summer (+01:00) / GMT in winter (0)
    hasDst: true,
  },
  {
    id: 'America/New_York',
    label: 'Eastern Time (ET)',
    city: 'New York / Toronto',
    currentOffsetMinutes: -240, // EDT in summer (-04:00) / EST in winter (-05:00)
    hasDst: true,
  },
  {
    id: 'Asia/Singapore',
    label: 'Singapore Standard Time (SGT)',
    city: 'Singapore',
    currentOffsetMinutes: 480, // +08:00
    hasDst: false,
  },
  {
    id: 'Asia/Tokyo',
    label: 'Japan Standard Time (JST)',
    city: 'Tokyo',
    currentOffsetMinutes: 540, // +09:00
    hasDst: false,
  },
  {
    id: 'America/Los_Angeles',
    label: 'Pacific Time (PT)',
    city: 'Los Angeles / San Francisco',
    currentOffsetMinutes: -420, // PDT in summer (-07:00) / PST in winter (-08:00)
    hasDst: true,
  },
  {
    id: 'Australia/Sydney',
    label: 'Australian Eastern Time (AET)',
    city: 'Sydney / Melbourne',
    currentOffsetMinutes: 600, // AEST (+10:00) / AEDT in summer (+11:00)
    hasDst: true,
  },
];

/**
 * Gets UTC offset in minutes for a given IANA ZoneId at a specific timestamp
 * Uses Intl.DateTimeFormat (the standard JavaScript API mirroring Java ZoneId / ZonedDateTime)
 */
export function getTimezoneOffsetMinutes(zoneId: string, timestamp: number = Date.now()): number {
  try {
    const d = new Date(timestamp);
    // Format to parts in target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zoneId,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(d);
    let year = d.getUTCFullYear();
    let month = d.getUTCMonth() + 1;
    let day = d.getUTCDate();
    let hour = d.getUTCHours();
    let minute = d.getUTCMinutes();
    let second = d.getUTCSeconds();

    parts.forEach((p) => {
      if (p.type === 'year') year = parseInt(p.value, 10);
      if (p.type === 'month') month = parseInt(p.value, 10);
      if (p.type === 'day') day = parseInt(p.value, 10);
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
      if (p.type === 'second') second = parseInt(p.value, 10);
    });

    const asUtcInTargetZone = Date.UTC(year, month - 1, day, hour, minute, second);
    const diffMs = asUtcInTargetZone - d.getTime();
    return Math.round(diffMs / 60000);
  } catch (err) {
    console.warn(`Could not calculate offset for timezone ${zoneId}:`, err);
    // Fallback to supported timezone lookup or 0
    const fallback = SUPPORTED_TIMEZONES.find((t) => t.id === zoneId);
    return fallback ? fallback.currentOffsetMinutes : 0;
  }
}

/**
 * Format a timezone ID and offset for display (e.g. "Asia/Kolkata (GMT+5:30)")
 */
export function formatTimezoneDisplay(zoneId: string, timestamp: number = Date.now()): string {
  const offsetMins = getTimezoneOffsetMinutes(zoneId, timestamp);
  const sign = offsetMins >= 0 ? '+' : '-';
  const absMins = Math.abs(offsetMins);
  const h = Math.floor(absMins / 60);
  const m = absMins % 60;
  const offsetStr = `GMT${sign}${h}${m > 0 ? `:${m.toString().padStart(2, '0')}` : ''}`;
  
  const known = SUPPORTED_TIMEZONES.find((t) => t.id === zoneId);
  if (known) {
    return `${known.city} (${offsetStr})`;
  }
  return `${zoneId} (${offsetStr})`;
}

/**
 * Get local time parts (hour, minute, day, month, year) for a given UTC instant in a specific ZoneId
 */
export function getZonedDateTimeParts(
  instantMs: number,
  zoneId: string
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number; // 1=Mon..7=Sun
} {
  try {
    const d = new Date(instantMs);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: zoneId,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
      hourCycle: 'h23',
    });

    let year = d.getUTCFullYear();
    let month = d.getUTCMonth() + 1;
    let day = d.getUTCDate();
    let hour = d.getUTCHours();
    let minute = d.getUTCMinutes();
    let second = d.getUTCSeconds();
    let weekdayStr = 'Mon';

    formatter.formatToParts(d).forEach((p) => {
      if (p.type === 'year') year = parseInt(p.value, 10);
      if (p.type === 'month') month = parseInt(p.value, 10);
      if (p.type === 'day') day = parseInt(p.value, 10);
      if (p.type === 'hour') hour = parseInt(p.value, 10);
      if (p.type === 'minute') minute = parseInt(p.value, 10);
      if (p.type === 'second') second = parseInt(p.value, 10);
      if (p.type === 'weekday') weekdayStr = p.value;
    });

    const dayMap: Record<string, number> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 7,
    };
    const dayOfWeek = dayMap[weekdayStr] || 1;

    return { year, month, day, hour, minute, second, dayOfWeek };
  } catch {
    const d = new Date(instantMs);
    const isoDay = d.getDay() === 0 ? 7 : d.getDay();
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      hour: d.getHours(),
      minute: d.getMinutes(),
      second: d.getSeconds(),
      dayOfWeek: isoDay,
    };
  }
}

/**
 * Calculates absolute trigger instant (Unix ms) for a specific local wall-clock time in a target timezone
 */
export function calculateZonedTriggerInstant(
  targetYear: number,
  targetMonth: number, // 1-12
  targetDay: number,
  targetHour: number,
  targetMinute: number,
  zoneId: string
): number {
  // First guess: treat target as UTC
  const guessUtc = Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, 0);
  const offsetMins = getTimezoneOffsetMinutes(zoneId, guessUtc);
  
  // Exact instant is guessUtc - offsetMins
  const exactInstant = guessUtc - offsetMins * 60000;
  
  // Re-verify in case offset differs (e.g. DST transition hour)
  const recheckOffset = getTimezoneOffsetMinutes(zoneId, exactInstant);
  if (recheckOffset !== offsetMins) {
    return guessUtc - recheckOffset * 60000;
  }
  
  return exactInstant;
}

/**
 * Calculates next occurrence instant considering timezone behavior:
 * - If LOCAL_TIME: Alarms fire at the given hour:minute in device's current timezone.
 * - If ORIGINAL_TIMEZONE: Alarms preserve their original anchor timezone and compute corresponding instant.
 */
export function calculateTimezoneAwareNextOccurrence(
  alarm: Alarm,
  deviceTimezone: string,
  baseTime: number = Date.now(),
  excludedDates: number[] = []
): {
  nextInstant: number;
  localHour: number;
  localMinute: number;
  dateShiftDays: number;
} {
  const behavior = alarm.timezoneBehavior || 'LOCAL_TIME';
  const targetZone = behavior === 'ORIGINAL_TIMEZONE' ? alarm.originalTimezoneId : deviceTimezone;
  const targetHour = behavior === 'ORIGINAL_TIMEZONE' ? alarm.originalLocalHour ?? alarm.hour : alarm.hour;
  const targetMinute = behavior === 'ORIGINAL_TIMEZONE' ? alarm.originalLocalMinute ?? alarm.minute : alarm.minute;

  // Get current date parts in target zone
  const nowParts = getZonedDateTimeParts(baseTime, targetZone);
  const daysSet = new Set(alarm.daysOfWeek && alarm.daysOfWeek.length > 0 ? alarm.daysOfWeek : []);

  let searchYear = nowParts.year;
  let searchMonth = nowParts.month;
  let searchDay = nowParts.day;

  // Check today in target zone
  let candidateInstant = calculateZonedTriggerInstant(
    searchYear,
    searchMonth,
    searchDay,
    targetHour,
    targetMinute,
    targetZone
  );

  // If one-time alarm
  if (daysSet.size === 0) {
    if (candidateInstant <= baseTime) {
      // Move 1 day ahead
      const nextDayDate = new Date(candidateInstant + 86400000);
      const nextParts = getZonedDateTimeParts(nextDayDate.getTime(), targetZone);
      candidateInstant = calculateZonedTriggerInstant(
        nextParts.year,
        nextParts.month,
        nextParts.day,
        targetHour,
        targetMinute,
        targetZone
      );
    }
  } else {
    // Repeating alarm
    let attempts = 0;
    while (attempts < 30) {
      const parts = getZonedDateTimeParts(candidateInstant, targetZone);
      const isExcluded = excludedDates.some((ex) => {
        const exParts = getZonedDateTimeParts(ex, targetZone);
        return (
          exParts.year === parts.year &&
          exParts.month === parts.month &&
          exParts.day === parts.day
        );
      });

      if (
        candidateInstant > baseTime &&
        daysSet.has(parts.dayOfWeek) &&
        !isExcluded &&
        !alarm.isSkippedNext
      ) {
        break;
      }

      // Step forward by 1 day
      const nextDayTime = candidateInstant + 86400000;
      const nextParts = getZonedDateTimeParts(nextDayTime, targetZone);
      candidateInstant = calculateZonedTriggerInstant(
        nextParts.year,
        nextParts.month,
        nextParts.day,
        targetHour,
        targetMinute,
        targetZone
      );
      attempts++;
    }
  }

  // Now calculate how this instant presents in device's local timezone
  const localParts = getZonedDateTimeParts(candidateInstant, deviceTimezone);
  const targetParts = getZonedDateTimeParts(candidateInstant, targetZone);

  // Date difference if crosses midnight
  const dateShiftDays =
    localParts.day !== targetParts.day || localParts.month !== targetParts.month
      ? localParts.day > targetParts.day || (localParts.day === 1 && targetParts.day > 25)
        ? 1
        : -1
      : 0;

  return {
    nextInstant: candidateInstant,
    localHour: localParts.hour,
    localMinute: localParts.minute,
    dateShiftDays,
  };
}

/**
 * Evaluates how an alarm is affected when device moves from oldTimezone -> newTimezone
 */
export function evaluateAlarmTimezoneTransition(
  alarm: Alarm,
  oldTimezone: string,
  newTimezone: string,
  baseTime: number = Date.now()
): AffectedAlarmSummary {
  const behavior = alarm.timezoneBehavior || 'LOCAL_TIME';
  const originalHour = alarm.originalLocalHour ?? alarm.hour;
  const originalMinute = alarm.originalLocalMinute ?? alarm.minute;
  const originalZone = alarm.originalTimezoneId || oldTimezone;

  const { fullStr: formattedOriginalTime } = formatAlarmTime(originalHour, originalMinute);

  if (behavior === 'LOCAL_TIME') {
    // Alarm stays at clock time (e.g. 7:00 AM) in the new timezone
    const { nextInstant, localHour, localMinute } = calculateTimezoneAwareNextOccurrence(
      alarm,
      newTimezone,
      baseTime
    );
    const { fullStr: formattedNewTime } = formatAlarmTime(localHour, localMinute);

    return {
      alarmId: alarm.id,
      alarmName: alarm.name,
      originalHour,
      originalMinute,
      originalTimezoneId: originalZone,
      behavior: 'LOCAL_TIME',
      newLocalHour: localHour,
      newLocalMinute: localMinute,
      dateShiftDays: 0,
      nextTriggerInstant: nextInstant,
      formattedOriginalTime: `${formattedOriginalTime} (${originalZone.split('/').pop()})`,
      formattedNewTime: `${formattedNewTime} (${newTimezone.split('/').pop()})`,
      explanation: `Set to Local Time: will ring at ${formattedNewTime} local time in your new timezone.`,
    };
  } else {
    // Follows original timezone (e.g. 8:00 AM IST)
    const { nextInstant, localHour, localMinute, dateShiftDays } =
      calculateTimezoneAwareNextOccurrence(alarm, newTimezone, baseTime);
    const { fullStr: formattedNewTime } = formatAlarmTime(localHour, localMinute);

    let dateShiftText = '';
    if (dateShiftDays === 1) dateShiftText = ' (+1 day next morning)';
    if (dateShiftDays === -1) dateShiftText = ' (-1 day previous evening)';

    return {
      alarmId: alarm.id,
      alarmName: alarm.name,
      originalHour,
      originalMinute,
      originalTimezoneId: originalZone,
      behavior: 'ORIGINAL_TIMEZONE',
      newLocalHour: localHour,
      newLocalMinute: localMinute,
      dateShiftDays,
      nextTriggerInstant: nextInstant,
      formattedOriginalTime: `${formattedOriginalTime} ${originalZone.split('/').pop()}`,
      formattedNewTime: `${formattedNewTime} ${newTimezone.split('/').pop()}${dateShiftText}`,
      explanation: `Anchored to ${originalZone}: converted to ${formattedNewTime} in ${newTimezone.split('/').pop()}${dateShiftText}.`,
    };
  }
}

/**
 * Re-evaluates an individual AlarmOccurrence during a timezone change
 */
export function recalculateOccurrenceForTimezone(
  occurrence: AlarmOccurrence,
  parentAlarm: Alarm,
  newTimezoneId: string,
  baseTime: number = Date.now()
): AlarmOccurrence {
  const behavior = occurrence.timezoneBehavior || parentAlarm.timezoneBehavior || 'LOCAL_TIME';

  // If already fired, dismissed, or expired, leave untouched
  if (
    occurrence.status === 'FIRED' ||
    occurrence.status === 'DISMISSED' ||
    occurrence.status === 'EXPIRED'
  ) {
    return occurrence;
  }

  const { nextInstant, localHour, localMinute } = calculateTimezoneAwareNextOccurrence(
    parentAlarm,
    newTimezoneId,
    baseTime
  );

  const advanceMins = parentAlarm.askAdvanceMinutes || 720;
  const isAdaptive = parentAlarm.behavior === 'ASK_BEFORE' || parentAlarm.behavior === 'LOCATION_AWARE';
  const confirmationTime = isAdaptive ? nextInstant - advanceMins * 60000 : 0;

  return {
    ...occurrence,
    scheduledDateTime: nextInstant,
    confirmationScheduledTime: confirmationTime,
    timezoneId: newTimezoneId,
    timezoneBehavior: behavior,
    displayedLocalHour: localHour,
    displayedLocalMinute: localMinute,
    updatedTimestamp: baseTime,
  };
}
