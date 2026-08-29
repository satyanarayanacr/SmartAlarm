import {
  Alarm,
  AlarmOccurrence,
  OccurrenceStatus,
  SoundOption,
  SoundOptionId,
} from '../types/alarm';

export const SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'gentle_chimes',
    name: 'Gentle Chimes',
    category: 'Relaxing',
    description: 'Soft harmonic glockenspiel chords designed for gentle waking'
  },
  {
    id: 'radar',
    name: 'Radar Alert',
    category: 'Standard',
    description: 'Crisp dual-tone rhythmic pulses with clear pitch progression'
  },
  {
    id: 'cosmic_pulse',
    name: 'Cosmic Pulse',
    category: 'Electronic',
    description: 'Warm analog synthesizer sequence with gentle resonance'
  },
  {
    id: 'digital_beep',
    name: 'Digital Classic',
    category: 'Classic',
    description: 'Traditional crisp digital bedside clock four-beat pattern'
  },
  {
    id: 'forest_birds',
    name: 'Forest Birds',
    category: 'Nature',
    description: 'Chirping natural acoustic frequencies with uplifting cadence'
  },
  {
    id: 'sunrise_aura',
    name: 'Sunrise Aura',
    category: 'Ambient',
    description: 'Gradual crescendo ambient swell with calming overtone'
  }
];

export const DAYS_MAP = [
  { id: 1, short: 'Mon', full: 'Monday' },
  { id: 2, short: 'Tue', full: 'Tuesday' },
  { id: 3, short: 'Wed', full: 'Wednesday' },
  { id: 4, short: 'Thu', full: 'Thursday' },
  { id: 5, short: 'Fri', full: 'Friday' },
  { id: 6, short: 'Sat', full: 'Saturday' },
  { id: 7, short: 'Sun', full: 'Sunday' },
];

export interface AdvanceOption {
  minutes: number;
  label: string;
  shortLabel: string;
}

export const ADVANCE_CONFIRMATION_OPTIONS: AdvanceOption[] = [
  { minutes: 15, label: '15 minutes before', shortLabel: '15m before' },
  { minutes: 30, label: '30 minutes before', shortLabel: '30m before' },
  { minutes: 60, label: '1 hour before', shortLabel: '1h before' },
  { minutes: 120, label: '2 hours before', shortLabel: '2h before' },
  { minutes: 240, label: '4 hours before', shortLabel: '4h before' },
  { minutes: 480, label: '8 hours before', shortLabel: '8h before' },
  { minutes: 720, label: '12 hours before', shortLabel: '12h before' },
  { minutes: 1440, label: '24 hours before', shortLabel: '24h before' },
];

/**
 * Calculates the exact next trigger timestamp (in milliseconds)
 * mirroring the Android Calendar / ZonedDateTime algorithm.
 * 
 * 1 (Mon) to 7 (Sun)
 */
export function calculateNextOccurrence(
  hour: number,
  minute: number,
  daysOfWeek: number[],
  isSkippedNext = false,
  baseTime: number = Date.now(),
  excludedDates: number[] = []
): number {
  const date = new Date(baseTime);
  date.setSeconds(0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(hour, minute, 0, 0);

  // If one-time alarm (no days selected or ONETIME repeat)
  if (!daysOfWeek || daysOfWeek.length === 0) {
    if (targetDate.getTime() <= baseTime) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    return targetDate.getTime();
  }

  // If repeating weekly on specific days:
  // Convert JS Day (0=Sun, 1=Mon, ..., 6=Sat) to ISO 1=Mon..7=Sun
  const getIsoDay = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay());

  const daysSet = new Set(daysOfWeek);
  let attempts = 0;

  // Helper to check if date is in excluded (skipped multi-day) list
  const isDateExcluded = (d: Date) => {
    return excludedDates.some((exTime) => {
      const exDate = new Date(exTime);
      return (
        exDate.getFullYear() === d.getFullYear() &&
        exDate.getMonth() === d.getMonth() &&
        exDate.getDate() === d.getDate()
      );
    });
  };

  // If today's target time is in the future and today is an active day, and not skipped/excluded:
  const currentIsoDay = getIsoDay(targetDate);
  if (
    targetDate.getTime() > baseTime &&
    daysSet.has(currentIsoDay) &&
    !isSkippedNext &&
    !isDateExcluded(targetDate)
  ) {
    return targetDate.getTime();
  }

  // Otherwise search day-by-day (up to 30 days for multi-day skip safety)
  let searchDate = new Date(targetDate);
  if (
    searchDate.getTime() <= baseTime ||
    ((isSkippedNext || isDateExcluded(searchDate)) &&
      searchDate.getTime() > baseTime &&
      daysSet.has(currentIsoDay))
  ) {
    searchDate.setDate(searchDate.getDate() + 1);
  }

  while (attempts < 30) {
    const isoDay = getIsoDay(searchDate);
    if (daysSet.has(isoDay) && !isDateExcluded(searchDate)) {
      return searchDate.getTime();
    }
    searchDate.setDate(searchDate.getDate() + 1);
    attempts++;
  }

  return targetDate.getTime();
}

/**
 * Calculates confirmation trigger time given an occurrence time and lead minutes
 */
export function calculateConfirmationTime(
  scheduledTimeMs: number,
  advanceMinutes: number
): number {
  return scheduledTimeMs - advanceMinutes * 60 * 1000;
}

/**
 * Creates or synchronizes an AlarmOccurrence entity for an Alarm
 */
export function createOccurrenceForAlarm(
  alarm: Alarm,
  baseTime: number = Date.now(),
  excludedDates: number[] = []
): AlarmOccurrence {
  const scheduledTime = calculateNextOccurrence(
    alarm.hour,
    alarm.minute,
    alarm.daysOfWeek,
    alarm.isSkippedNext,
    baseTime,
    excludedDates
  );

  const advanceMins = alarm.askAdvanceMinutes || 720;
  const confirmationTime = calculateConfirmationTime(scheduledTime, advanceMins);

  const isAskBefore = alarm.behavior === 'ASK_BEFORE';
  const isLocationAware = alarm.behavior === 'LOCATION_AWARE';

  return {
    id: `occ_${alarm.id}_${scheduledTime}`,
    parentAlarmId: alarm.id,
    parentAlarmName: alarm.name,
    scheduledDateTime: scheduledTime,
    originalScheduledDateTime: scheduledTime,
    confirmationScheduledTime: isAskBefore || isLocationAware ? confirmationTime : 0,
    status: isAskBefore ? 'CONFIRMATION_SCHEDULED' : 'CONFIRMED',
    confirmationStatus: isAskBefore ? 'UNTRIGGERED' : 'CONFIRMED',
    locationZoneId: alarm.locationZoneId,
    locationCondition: alarm.locationCondition || 'WHEN_INSIDE',
    locationEvaluationState: 'NOT_APPLICABLE',
    soundSelection: alarm.soundSelection,
    isVibrationEnabled: alarm.isVibrationEnabled,
    snoozeDurationMinutes: alarm.snoozeDurationMinutes,
    createdTimestamp: baseTime,
    updatedTimestamp: baseTime,
  };
}

/**
 * Formats hour/minute into a 12-hour AM/PM string
 */
export function formatAlarmTime(hour: number, minute: number, is24Hour = false): {
  timeStr: string;
  periodStr: string;
  fullStr: string;
} {
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (is24Hour) {
    const full = `${pad(hour)}:${pad(minute)}`;
    return { timeStr: full, periodStr: '', fullStr: full };
  }

  const periodStr = hour >= 12 ? 'PM' : 'AM';
  let displayHour = hour % 12;
  if (displayHour === 0) displayHour = 12;

  const timeStr = `${displayHour}:${pad(minute)}`;
  return { timeStr, periodStr, fullStr: `${timeStr} ${periodStr}` };
}

/**
 * Formats date relative to base time (e.g. "Today", "Tomorrow", "Tuesday, Aug 30")
 */
export function formatOccurrenceDateLabel(
  timestamp: number,
  baseTime: number = Date.now()
): string {
  const target = new Date(timestamp);
  const base = new Date(baseTime);

  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const baseDay = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();

  const diffDays = Math.round((targetDay - baseDay) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';

  const dayName = target.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = target.toLocaleDateString('en-US', { month: 'short' });
  return `${dayName}, ${monthName} ${target.getDate()}`;
}

/**
 * Formats full date and time (e.g., "Monday, Aug 29 • 8:00 PM")
 */
export function formatFullDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
  const monthName = d.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = d.getDate();
  const { fullStr } = formatAlarmTime(d.getHours(), d.getMinutes());

  return `${dayName}, ${monthName} ${dayNum} • ${fullStr}`;
}

/**
 * Formats advance confirmation lead time into a human label
 */
export function formatAdvanceMinutesLabel(minutes: number): string {
  const opt = ADVANCE_CONFIRMATION_OPTIONS.find((o) => o.minutes === minutes);
  if (opt) return opt.label;

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours > 1 ? 's' : ''} before`;
  }
  return `${minutes} minutes before`;
}

/**
 * Formats occurrence status for UI tags
 */
export function getOccurrenceStatusBadge(status: OccurrenceStatus): {
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
} {
  switch (status) {
    case 'CONFIRMATION_SCHEDULED':
      return {
        label: 'Confirmation Scheduled',
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        bgClass: 'bg-indigo-50 dark:bg-indigo-950/40',
        borderClass: 'border-indigo-200 dark:border-indigo-800/60',
      };
    case 'WAITING_FOR_USER':
      return {
        label: 'Waiting for Confirmation',
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-50 dark:bg-amber-950/40',
        borderClass: 'border-amber-200 dark:border-amber-800/60',
      };
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
        borderClass: 'border-emerald-200 dark:border-emerald-800/60',
      };
    case 'MODIFIED':
      return {
        label: 'Modified Time',
        colorClass: 'text-sky-600 dark:text-sky-400',
        bgClass: 'bg-sky-50 dark:bg-sky-950/40',
        borderClass: 'border-sky-200 dark:border-sky-800/60',
      };
    case 'SKIPPED':
      return {
        label: 'Skipped',
        colorClass: 'text-slate-500 dark:text-slate-400',
        bgClass: 'bg-slate-100 dark:bg-slate-800/50',
        borderClass: 'border-slate-200 dark:border-slate-700',
      };
    case 'FIRED':
      return {
        label: 'Ringing',
        colorClass: 'text-rose-600 dark:text-rose-400',
        bgClass: 'bg-rose-50 dark:bg-rose-950/40',
        borderClass: 'border-rose-200 dark:border-rose-800/60',
      };
    case 'DISMISSED':
      return {
        label: 'Dismissed',
        colorClass: 'text-slate-500 dark:text-slate-400',
        bgClass: 'bg-slate-100 dark:bg-slate-800/40',
        borderClass: 'border-slate-200 dark:border-slate-700',
      };
    case 'SNOOZED':
      return {
        label: 'Snoozed',
        colorClass: 'text-purple-600 dark:text-purple-400',
        bgClass: 'bg-purple-50 dark:bg-purple-950/40',
        borderClass: 'border-purple-200 dark:border-purple-800/60',
      };
    case 'EXPIRED':
      return {
        label: 'Expired (Unconfirmed)',
        colorClass: 'text-rose-500 dark:text-rose-400',
        bgClass: 'bg-rose-50 dark:bg-rose-950/40',
        borderClass: 'border-rose-200 dark:border-rose-800/60',
      };
    default:
      return {
        label: status,
        colorClass: 'text-slate-500',
        bgClass: 'bg-slate-100 dark:bg-slate-800',
        borderClass: 'border-slate-200 dark:border-slate-700',
      };
  }
}

/**
 * Decision Engine Interface for Phase 2 and future expansion
 * (Future compatibility for location, calendar, AI, etc.)
 */
export interface AlarmDecisionEngine {
  evaluate(alarm: Alarm, occurrence: AlarmOccurrence, currentTime: number): {
    decision: 'ALWAYS' | 'ASK_USER' | 'SKIP' | 'MODIFY' | 'WAIT';
    reason: string;
  };
}

export const defaultAlarmDecisionEngine: AlarmDecisionEngine = {
  evaluate(alarm: Alarm, occurrence: AlarmOccurrence, currentTime: number) {
    if (alarm.behavior === 'ALWAYS') {
      return { decision: 'ALWAYS', reason: 'Alarm configured to Always ring automatically.' };
    }

    if (occurrence.status === 'CONFIRMED') {
      return { decision: 'ALWAYS', reason: 'Occurrence confirmed by user.' };
    }

    if (occurrence.status === 'SKIPPED') {
      return { decision: 'SKIP', reason: 'Occurrence skipped by user.' };
    }

    if (occurrence.status === 'MODIFIED') {
      return { decision: 'MODIFY', reason: 'Occurrence time adjusted by user.' };
    }

    if (currentTime >= occurrence.confirmationScheduledTime) {
      if (occurrence.status === 'WAITING_FOR_USER') {
        return { decision: 'WAIT', reason: 'Waiting for user confirmation.' };
      }
      return { decision: 'ASK_USER', reason: 'Confirmation lead time reached; notifying user.' };
    }

    return { decision: 'WAIT', reason: 'Occurrence scheduled in advance.' };
  },
};

/**
 * Formats repeat days into standard Android alarm label
 */
export function formatRepeatDays(daysOfWeek: number[]): string {
  if (!daysOfWeek || daysOfWeek.length === 0) {
    return 'One-time';
  }
  if (daysOfWeek.length === 7) {
    return 'Every day';
  }
  
  const sorted = [...daysOfWeek].sort((a, b) => a - b);
  const isWeekdays = sorted.length === 5 && sorted.every((d, i) => d === i + 1);
  if (isWeekdays) return 'Mon – Fri (Weekdays)';

  const isWeekends = sorted.length === 2 && sorted.includes(6) && sorted.includes(7);
  if (isWeekends) return 'Sat, Sun (Weekends)';

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return sorted.map((d) => dayNames[d - 1]).join(' ');
}

/**
 * Formats remaining time until next occurrence into "In X hours Y minutes"
 */
export function formatRemainingTime(triggerMillis: number, currentTime = Date.now()): string {
  const diffMs = triggerMillis - currentTime;
  if (diffMs <= 0) return 'Ringing now';

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hr${hours > 1 ? 's' : ''}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} min${minutes !== 1 ? 's' : ''}`);

  return `In ${parts.join(' ')}`;
}

// ----------------------------------------------------
// Web Audio Synthesizer for high-fidelity native tones
// ----------------------------------------------------
class SoundEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private intervalId: number | null = null;
  private activeNodes: (AudioNode | number)[] = [];

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPreview(soundId: SoundOptionId, durationSeconds = 3.5) {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    this.playToneLoop(soundId);
    setTimeout(() => {
      this.stop();
    }, durationSeconds * 1000);
  }

  startAlarm(soundId: SoundOptionId, isVibrating = true) {
    this.stop();
    this.initCtx();
    if (!this.ctx) return;

    this.isPlaying = true;
    this.playToneLoop(soundId);

    if (isVibrating && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 800, 400]);
      } catch {
        // ignore
      }
    }
  }

  private playToneLoop(soundId: SoundOptionId) {
    if (!this.ctx) return;

    const playSequence = () => {
      if (!this.isPlaying && this.intervalId === null) return;
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      switch (soundId) {
        case 'gentle_chimes': {
          const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
          notes.forEach((freq, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.35);
            gain.gain.setValueAtTime(0.001, now + idx * 0.35);
            gain.gain.exponentialRampToValueAtTime(0.35, now + idx * 0.35 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.35 + 1.2);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now + idx * 0.35);
            osc.stop(now + idx * 0.35 + 1.3);
          });
          break;
        }

        case 'radar': {
          [0, 0.25, 0.6, 0.85].forEach((offset) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, now + offset);
            osc.frequency.exponentialRampToValueAtTime(1320, now + offset + 0.12);
            gain.gain.setValueAtTime(0.4, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.2);
          });
          break;
        }

        case 'digital_beep': {
          [0, 0.15, 0.3, 0.45].forEach((offset) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(1046.5, now + offset);
            gain.gain.setValueAtTime(0.25, now + offset);
            gain.gain.setValueAtTime(0, now + offset + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.09);
          });
          break;
        }

        case 'cosmic_pulse': {
          const osc = this.ctx!.createOscillator();
          const gain = this.ctx!.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.linearRampToValueAtTime(440, now + 0.8);
          osc.frequency.linearRampToValueAtTime(330, now + 1.4);
          gain.gain.setValueAtTime(0.01, now);
          gain.gain.linearRampToValueAtTime(0.3, now + 0.4);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
          osc.connect(gain);
          gain.connect(this.ctx!.destination);
          osc.start(now);
          osc.stop(now + 1.6);
          break;
        }

        case 'forest_birds': {
          [0, 0.2, 0.35, 0.7, 0.9].forEach((offset, idx) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            const baseFreq = idx % 2 === 0 ? 2400 : 2800;
            osc.frequency.setValueAtTime(baseFreq, now + offset);
            osc.frequency.linearRampToValueAtTime(baseFreq + 600, now + offset + 0.08);
            gain.gain.setValueAtTime(0.25, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.13);
          });
          break;
        }

        case 'sunrise_aura':
        default: {
          const freqs = [329.63, 493.88, 659.25, 987.77];
          freqs.forEach((freq) => {
            const osc = this.ctx!.createOscillator();
            const gain = this.ctx!.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.8);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
            osc.connect(gain);
            gain.connect(this.ctx!.destination);
            osc.start(now);
            osc.stop(now + 1.9);
          });
          break;
        }
      }
    };

    playSequence();
    this.intervalId = window.setInterval(playSequence, 2200);
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const soundEngine = new SoundEngine();
