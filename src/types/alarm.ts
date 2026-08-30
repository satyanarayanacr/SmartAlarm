export type RepeatType = 'ONETIME' | 'WEEKLY';

export type AlarmBehavior = 'ALWAYS' | 'ASK_BEFORE' | 'LOCATION_AWARE';

export type LocationCondition = 'WHEN_INSIDE' | 'WHEN_OUTSIDE';

export type ZoneLocationState = 'INSIDE' | 'OUTSIDE' | 'UNKNOWN' | 'NOT_APPLICABLE';

/**
 * Timezone behavior options for alarms:
 * - LOCAL_TIME: Alarms ring at the specified clock time in the current local timezone of the device.
 *   (e.g., 7:00 AM wake-up stays 7:00 AM wherever you travel).
 * - ORIGINAL_TIMEZONE: Alarms preserve their original anchor timezone / absolute instant.
 *   (e.g., 8:00 AM IST office standup becomes 6:30 AM in Dubai).
 * - DISABLED: Alarm disabled due to timezone shift or user choice.
 */
export type TimezoneBehavior = 'LOCAL_TIME' | 'ORIGINAL_TIMEZONE' | 'DISABLED';

export type OccurrenceStatus =
  | 'PENDING'
  | 'CONFIRMATION_SCHEDULED'
  | 'WAITING_FOR_USER'
  | 'CONFIRMED'
  | 'SKIPPED'
  | 'MODIFIED'
  | 'FIRED'
  | 'DISMISSED'
  | 'SNOOZED'
  | 'EXPIRED';

export type OccurrenceConfirmationStatus =
  | 'UNTRIGGERED'
  | 'NOTIFIED'
  | 'CONFIRMED'
  | 'SKIPPED'
  | 'MODIFIED'
  | 'DECIDE_LATER'
  | 'EXPIRED';

export type SoundOptionId =
  | 'radar'
  | 'gentle_chimes'
  | 'cosmic_pulse'
  | 'digital_beep'
  | 'forest_birds'
  | 'sunrise_aura';

export interface SoundOption {
  id: SoundOptionId;
  name: string;
  category: string;
  description: string;
}

export type ZoneCategory = 'HOME' | 'WORK' | 'GYM' | 'AIRPORT' | 'CUSTOM';

export interface GeoZone {
  id: string; // UUID in Kotlin / Room
  name: string; // e.g. "Home - Hyderabad", "Office - HITEC City"
  category: ZoneCategory;
  latitude: number;
  longitude: number;
  radiusMeters: number; // 100, 250, 500, 1000, or custom (default 250)
  isEnabled: boolean;
  address?: string;
  createdTimestamp: number;
  updatedTimestamp: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: 'GPS' | 'SIMULATED' | 'PRESET';
  label?: string;
  timestamp: number;
}

/**
 * Timezone Information structure
 */
export interface TimezoneInfo {
  id: string; // IANA Timezone ID, e.g. "Asia/Kolkata", "Asia/Dubai", "Europe/London", "America/New_York"
  label: string; // Human readable name, e.g. "India Standard Time (IST)"
  city: string; // Primary city, e.g. "Hyderabad / Kolkata", "Dubai", "London", "New York"
  currentOffsetMinutes: number; // Current UTC offset in minutes (+330 for IST, +240 for GST)
  hasDst: boolean; // Whether this timezone observes Daylight Saving Time
}

/**
 * Details of an affected alarm during a timezone transition
 */
export interface AffectedAlarmSummary {
  alarmId: string;
  alarmName: string;
  originalHour: number;
  originalMinute: number;
  originalTimezoneId: string;
  behavior: TimezoneBehavior;
  newLocalHour: number;
  newLocalMinute: number;
  dateShiftDays: number; // -1, 0, or +1 if crosses midnight
  nextTriggerInstant: number;
  userChoice?: TimezoneBehavior;
  formattedOriginalTime: string;
  formattedNewTime: string;
  explanation: string;
}

export interface TimezoneChangeEvent {
  id: string;
  previousTimezoneId: string;
  newTimezoneId: string;
  detectedTimestamp: number;
  affectedAlarms: AffectedAlarmSummary[];
  isResolved: boolean;
  resolutionType?: 'ALL_LOCAL' | 'ALL_ORIGINAL' | 'CUSTOM' | 'DISMISSED';
}

export interface Alarm {
  id: string; // Unique ID (Long in Kotlin)
  name: string; // Alarm name/label
  hour: number; // 0-23
  minute: number; // 0-59
  isEnabled: boolean; // Enabled/disabled status
  repeatType: RepeatType; // One-time or Weekly
  daysOfWeek: number[]; // 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun (or empty for one-time)
  behavior: AlarmBehavior; // 'ALWAYS', 'ASK_BEFORE', or 'LOCATION_AWARE'
  
  // Phase 4: Timezone attributes (optional for backwards compatibility)
  timezoneBehavior?: TimezoneBehavior; // 'LOCAL_TIME' (default) or 'ORIGINAL_TIMEZONE'
  originalTimezoneId?: string; // IANA ID where alarm was created (e.g. "Asia/Kolkata")
  originalLocalHour?: number; // Hour in original timezone
  originalLocalMinute?: number; // Minute in original timezone
  currentTimezoneId?: string; // Last active timezone ID
  
  locationZoneId?: string | null; // null/undefined or 'anywhere' = Anywhere
  locationCondition?: LocationCondition; // 'WHEN_INSIDE' (default) or 'WHEN_OUTSIDE'
  askAdvanceMinutes: number; // Advance confirmation lead time in minutes (e.g. 720 = 12h)
  missedConfirmationDefault: 'DO_NOT_RING' | 'RING_ANYWAY'; // Configurable default
  soundSelection: SoundOptionId; // Sound selection URI/identifier
  isVibrationEnabled: boolean; // Vibration toggle
  isSnoozeEnabled: boolean; // Snooze toggle
  snoozeDurationMinutes: number; // Snooze duration in minutes (e.g. 5, 9, 10, 15)
  nextTriggerMillis: number; // Exact calculated Unix timestamp in ms (Instant)
  isSkippedNext: boolean; // Legacy/quick skip token
  createdTimestamp: number;
  updatedTimestamp: number;
}

export interface AlarmOccurrence {
  id: string; // UUID/Long primary key in Room
  parentAlarmId: string; // Foreign key referencing Alarm.id
  parentAlarmName: string;
  scheduledDateTime: number; // Target timestamp in ms (Instant) when alarm would/will fire
  originalScheduledDateTime: number; // Original scheduled timestamp before single-occurrence edit
  confirmationScheduledTime: number; // Timestamp when confirmation notification triggers
  status: OccurrenceStatus;
  confirmationStatus: OccurrenceConfirmationStatus;
  
  // Phase 4: Timezone attributes on occurrence level (optional for backwards compatibility)
  timezoneId?: string; // IANA ZoneId for this occurrence
  timezoneBehavior?: TimezoneBehavior;
  originalTimezoneId?: string;
  displayedLocalHour?: number;
  displayedLocalMinute?: number;
  
  locationZoneId?: string | null;
  locationZoneName?: string;
  locationCondition?: LocationCondition;
  locationEvaluationState?: ZoneLocationState;
  locationDecisionReason?: string;
  isLocationOverridden?: boolean;
  modifiedHour?: number;
  modifiedMinute?: number;
  skipReason?: string;
  skipDaysCount?: number;
  soundSelection: SoundOptionId;
  isVibrationEnabled: boolean;
  snoozeDurationMinutes: number;
  createdTimestamp: number;
  updatedTimestamp: number;
}

export interface SystemPermissions {
  exactAlarmGranted: boolean; // Android 12+ SCHEDULE_EXACT_ALARM
  notificationGranted: boolean; // Android 13+ POST_NOTIFICATIONS
  batteryOptIgnored: boolean; // REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
  fineLocationGranted: boolean; // ACCESS_FINE_LOCATION
  coarseLocationGranted: boolean; // ACCESS_COARSE_LOCATION
  backgroundLocationGranted: boolean; // ACCESS_BACKGROUND_LOCATION
  locationServicesEnabled: boolean; // Device GPS / Location Master Toggle
}

/**
 * Unified Context Object for Alarm Decision Engine (Phase 4 + Future Calendar/Email/AI compatibility)
 */
export interface AlarmDecisionContext {
  currentTime: number; // Instant millis
  currentDeviceTimezone: string; // IANA ZoneId, e.g. "Asia/Dubai"
  alarm: Alarm;
  occurrence: AlarmOccurrence;
  userLocation: UserLocation | null;
  zone?: GeoZone | null;
  zoneState: ZoneLocationState;
  permissions: SystemPermissions;
  
  // Future contextual hooks (stubbed for future phases)
  calendarEvents?: Array<{ id: string; title: string; start: number; end: number }>;
  emailEvents?: Array<{ id: string; subject: string; time: number }>;
  userPreferences?: Record<string, unknown>;
}

export interface DecisionResult {
  action: 'SCHEDULE' | 'ASK_USER' | 'SKIP' | 'MODIFY' | 'WAIT';
  reason: string;
  effectiveTriggerTime?: number; // Calculated instant
  notificationTitle?: string;
  notificationBody?: string;
  canOverride?: boolean;
}
