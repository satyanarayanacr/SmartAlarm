import {
  Alarm,
  AlarmDecisionContext,
  AlarmOccurrence,
  DecisionResult,
  GeoZone,
  SystemPermissions,
  UserLocation,
  ZoneLocationState,
} from '../types/alarm';
import { formatAlarmTime } from './alarmScheduler';
import {
  calculateTimezoneAwareNextOccurrence,
  getZonedDateTimeParts,
} from './timezoneEngine';

// Pre-populated default zones
export const INITIAL_GEO_ZONES: GeoZone[] = [
  {
    id: 'zone_home_hyd',
    name: 'Home',
    category: 'HOME',
    latitude: 17.4435,
    longitude: 78.3772,
    radiusMeters: 250,
    isEnabled: true,
    address: 'Madhapur / Jubilee Hills, Hyderabad',
    createdTimestamp: Date.now() - 86400000 * 5,
    updatedTimestamp: Date.now() - 86400000 * 5,
  },
  {
    id: 'zone_office_hitec',
    name: 'Office',
    category: 'WORK',
    latitude: 17.4486,
    longitude: 78.3808,
    radiusMeters: 300,
    isEnabled: true,
    address: 'Cyber Towers, HITEC City, Hyderabad',
    createdTimestamp: Date.now() - 86400000 * 4,
    updatedTimestamp: Date.now() - 86400000 * 4,
  },
  {
    id: 'zone_gym_near_home',
    name: 'Gym',
    category: 'GYM',
    latitude: 17.441,
    longitude: 78.375,
    radiusMeters: 150,
    isEnabled: true,
    address: 'Fitness Hub, Madhapur, Hyderabad',
    createdTimestamp: Date.now() - 86400000 * 3,
    updatedTimestamp: Date.now() - 86400000 * 3,
  },
  {
    id: 'zone_airport_rgi',
    name: 'Airport',
    category: 'AIRPORT',
    latitude: 17.2403,
    longitude: 78.4294,
    radiusMeters: 1000,
    isEnabled: true,
    address: 'Rajiv Gandhi International Airport, Shamshabad',
    createdTimestamp: Date.now() - 86400000 * 2,
    updatedTimestamp: Date.now() - 86400000 * 2,
  },
];

export const LOCATION_PRESETS: { label: string; location: UserLocation; description: string }[] = [
  {
    label: 'At Home (Hyderabad)',
    description: 'Inside Home zone (Madhapur)',
    location: {
      latitude: 17.4435,
      longitude: 78.3772,
      accuracy: 10,
      source: 'PRESET',
      label: 'Home (Madhapur, Hyderabad)',
      timestamp: Date.now(),
    },
  },
  {
    label: 'At Office (HITEC City)',
    description: 'Inside Office zone (Cyber Towers)',
    location: {
      latitude: 17.4486,
      longitude: 78.3808,
      accuracy: 12,
      source: 'PRESET',
      label: 'Office (HITEC City, Hyderabad)',
      timestamp: Date.now(),
    },
  },
  {
    label: 'At Gym (Near Home)',
    description: 'Inside Gym zone (150m radius)',
    location: {
      latitude: 17.441,
      longitude: 78.375,
      accuracy: 15,
      source: 'PRESET',
      label: 'Gym (Near Home, Hyderabad)',
      timestamp: Date.now(),
    },
  },
  {
    label: 'At Airport (Shamshabad)',
    description: 'Inside Rajiv Gandhi Int’l Airport zone',
    location: {
      latitude: 17.2403,
      longitude: 78.4294,
      accuracy: 25,
      source: 'PRESET',
      label: 'Airport (RGIA, Shamshabad)',
      timestamp: Date.now(),
    },
  },
  {
    label: 'Vacation / Away (Goa Beach)',
    description: 'Outside all zones (Travel / Out of town)',
    location: {
      latitude: 15.2993,
      longitude: 74.124,
      accuracy: 30,
      source: 'PRESET',
      label: 'Goa (Outside Hyderabad zones)',
      timestamp: Date.now(),
    },
  },
];

export const PRESET_LOCATIONS = LOCATION_PRESETS;

/**
 * Calculates geodesic distance in meters using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Evaluates whether device is INSIDE, OUTSIDE, or UNKNOWN relative to a zone
 */
export function evaluateZoneLocationState(
  zone: GeoZone | null | undefined,
  userLocation: UserLocation | null,
  permissions: SystemPermissions
): {
  state: ZoneLocationState;
  distanceMeters?: number;
  reason: string;
} {
  if (!zone) {
    return {
      state: 'NOT_APPLICABLE',
      reason: 'No location zone configured for this alarm (Anywhere).',
    };
  }

  // Check Android location permissions & GPS service state
  if (!permissions.locationServicesEnabled) {
    return {
      state: 'UNKNOWN',
      reason: 'Device Location Services (GPS) are currently disabled.',
    };
  }

  if (!permissions.coarseLocationGranted && !permissions.fineLocationGranted) {
    return {
      state: 'UNKNOWN',
      reason: 'Location permission (ACCESS_COARSE_LOCATION / ACCESS_FINE_LOCATION) is not granted.',
    };
  }

  if (!userLocation) {
    return {
      state: 'UNKNOWN',
      reason: 'Current device location coordinates could not be acquired.',
    };
  }

  const distance = calculateDistanceMeters(
    userLocation.latitude,
    userLocation.longitude,
    zone.latitude,
    zone.longitude
  );

  const isInside = distance <= zone.radiusMeters;

  return {
    state: isInside ? 'INSIDE' : 'OUTSIDE',
    distanceMeters: distance,
    reason: isInside
      ? `Within ${zone.name} zone (${distance}m from center, radius: ${zone.radiusMeters}m)`
      : `Outside ${zone.name} zone (${distance}m away, radius: ${zone.radiusMeters}m)`,
  };
}

export const evaluateZoneState = (
  userLocation: UserLocation | null,
  zone: GeoZone | null | undefined,
  permissions: SystemPermissions
) => evaluateZoneLocationState(zone, userLocation, permissions);

/**
 * Format distance helper
 */
export function formatDistance(meters?: number): string {
  if (meters === undefined || isNaN(meters)) return 'Unknown distance';
  if (meters < 1000) {
    return `${meters} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Unified Decision Engine for Phase 4 (Time + Recurrence + Adaptive + Location + Timezone)
 * Future-proof context receiver.
 */
export class ContextDecisionEvaluator {
  static evaluate(context: AlarmDecisionContext): DecisionResult {
    const {
      alarm,
      occurrence,
      zoneState,
      zone,
      currentTime,
      currentDeviceTimezone,
    } = context;

    // 1. Check for manual user overrides or prior confirmation
    if (occurrence.status === 'CONFIRMED' || occurrence.isLocationOverridden) {
      return {
        action: 'SCHEDULE',
        effectiveTriggerTime: occurrence.scheduledDateTime,
        reason: 'Occurrence confirmed or overridden by user.',
      };
    }

    if (occurrence.status === 'SKIPPED') {
      return {
        action: 'SKIP',
        reason: 'Occurrence explicitly skipped for this date.',
      };
    }

    if (occurrence.status === 'MODIFIED') {
      return {
        action: 'SCHEDULE',
        effectiveTriggerTime: occurrence.scheduledDateTime,
        reason: 'Occurrence scheduled at user-modified time.',
      };
    }

    // 2. Timezone context evaluation
    const tzBehavior = alarm.timezoneBehavior || 'LOCAL_TIME';
    const isOriginalTz = tzBehavior === 'ORIGINAL_TIMEZONE';
    const originalTzId = alarm.originalTimezoneId || currentDeviceTimezone;

    // Compute effective local time in current device timezone for notification copy
    const { localHour, localMinute, nextInstant } = calculateTimezoneAwareNextOccurrence(
      alarm,
      currentDeviceTimezone,
      currentTime
    );
    const { fullStr: localTimeStr } = formatAlarmTime(localHour, localMinute);
    const { fullStr: originalTimeStr } = formatAlarmTime(
      alarm.originalLocalHour ?? alarm.hour,
      alarm.originalLocalMinute ?? alarm.minute
    );

    const tzContextLabel = isOriginalTz
      ? `${localTimeStr} local time (${originalTimeStr} ${originalTzId.split('/').pop()})`
      : `${localTimeStr} local time`;

    const condition = alarm.locationCondition || 'WHEN_INSIDE';
    const zoneName = zone?.name || 'Selected Location';

    // 3. Anywhere Alarms (Location = Anywhere)
    if (!alarm.locationZoneId || alarm.locationZoneId === 'anywhere' || !zone) {
      if (alarm.behavior === 'ALWAYS') {
        return {
          action: 'SCHEDULE',
          effectiveTriggerTime: nextInstant,
          reason: `Everywhere alarm set to Always. Timezone mode: ${tzBehavior}. Scheduled for ${tzContextLabel}.`,
        };
      }

      // Behavior is ASK_BEFORE
      if (currentTime >= occurrence.confirmationScheduledTime) {
        return {
          action: 'ASK_USER',
          effectiveTriggerTime: nextInstant,
          reason: `Advance confirmation window reached. Prompting user in current timezone (${currentDeviceTimezone}).`,
          notificationTitle: `Upcoming Alarm: ${alarm.name}`,
          notificationBody: isOriginalTz
            ? `Do you need your ${alarm.name} alarm tomorrow at ${localTimeStr} local time (${originalTimeStr} in ${originalTzId.split('/').pop()})?`
            : `Do you need your ${alarm.name} alarm tomorrow at ${localTimeStr}?`,
        };
      }

      return {
        action: 'WAIT',
        effectiveTriggerTime: nextInstant,
        reason: 'Anywhere alarm waiting for confirmation window.',
      };
    }

    // 4. Location-Associated Alarms
    const isConditionMet =
      (condition === 'WHEN_INSIDE' && zoneState === 'INSIDE') ||
      (condition === 'WHEN_OUTSIDE' && zoneState === 'OUTSIDE');

    // Case A: Location is UNKNOWN (Safe fallback)
    if (zoneState === 'UNKNOWN') {
      if (currentTime >= occurrence.confirmationScheduledTime) {
        return {
          action: 'ASK_USER',
          effectiveTriggerTime: nextInstant,
          reason: `Location for ${zoneName} unknown. Safe fallback: prompt user.`,
          notificationTitle: `Location Check: ${alarm.name}`,
          notificationBody: `Your location could not be determined. Do you need your ${alarm.name} alarm tomorrow at ${tzContextLabel}?`,
          canOverride: true,
        };
      }
      return {
        action: 'WAIT',
        effectiveTriggerTime: nextInstant,
        reason: 'Waiting for location confirmation window.',
      };
    }

    // Case B: Behavior = ALWAYS (with Location attached)
    if (alarm.behavior === 'ALWAYS') {
      if (isConditionMet) {
        return {
          action: 'SCHEDULE',
          effectiveTriggerTime: nextInstant,
          reason: `User is ${zoneState.toLowerCase()} ${zoneName}. Condition met. Scheduled for ${tzContextLabel}.`,
        };
      } else {
        if (currentTime >= occurrence.confirmationScheduledTime) {
          return {
            action: 'ASK_USER',
            effectiveTriggerTime: nextInstant,
            reason: `User is currently ${zoneState.toLowerCase()} ${zoneName}. Asking user if alarm is still needed.`,
            notificationTitle: `Location Notice: ${alarm.name}`,
            notificationBody: `You're currently ${zoneState.toLowerCase()} your ${zoneName} zone. Do you need your ${alarm.name} alarm tomorrow at ${tzContextLabel}?`,
            canOverride: true,
          };
        }
        return {
          action: 'WAIT',
          effectiveTriggerTime: nextInstant,
          reason: 'Waiting for confirmation lead time.',
        };
      }
    }

    // Case C: Behavior = ASK_BEFORE (Adaptive + Location + Timezone)
    if (alarm.behavior === 'ASK_BEFORE') {
      if (currentTime >= occurrence.confirmationScheduledTime) {
        return {
          action: 'ASK_USER',
          effectiveTriggerTime: nextInstant,
          reason: `Lead time reached. Notifying user with location & timezone context.`,
          notificationTitle: isConditionMet
            ? `Upcoming Alarm: ${alarm.name}`
            : `Location Notice: ${alarm.name}`,
          notificationBody: !isConditionMet
            ? `You're currently ${zoneState.toLowerCase()} your ${zoneName} zone. Do you need your ${alarm.name} alarm tomorrow at ${tzContextLabel}?`
            : `Do you need your ${alarm.name} alarm tomorrow at ${tzContextLabel}?`,
          canOverride: true,
        };
      }
      return {
        action: 'WAIT',
        effectiveTriggerTime: nextInstant,
        reason: 'Waiting for confirmation lead time.',
      };
    }

    // Case D: Behavior = LOCATION_AWARE
    if (alarm.behavior === 'LOCATION_AWARE') {
      if (isConditionMet) {
        return {
          action: 'SCHEDULE',
          effectiveTriggerTime: nextInstant,
          reason: `Location-aware condition verified (${zoneState.toLowerCase()} ${zoneName}). Scheduled for ${tzContextLabel}.`,
        };
      } else {
        return {
          action: 'SKIP',
          reason: `${alarm.name} skipped because you are ${zoneState.toLowerCase()} your ${zoneName} zone.`,
          notificationTitle: `Alarm Skipped: ${alarm.name}`,
          notificationBody: `${alarm.name} was skipped because you are ${zoneState.toLowerCase()} your ${zoneName} zone. Tap to enable anyway.`,
          canOverride: true,
        };
      }
    }

    return {
      action: 'WAIT',
      effectiveTriggerTime: nextInstant,
      reason: 'Evaluating context state.',
    };
  }
}

// Backward-compatible alias
export const LocationDecisionEvaluator = ContextDecisionEvaluator;
