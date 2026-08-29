import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Check,
  Volume2,
  Play,
  Square,
  Vibrate,
  Moon,
  Clock,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Sliders,
  Calendar,
  MapPin,
  Compass,
  Home,
  Briefcase,
  Dumbbell,
  Plane,
  Navigation,
  Globe2,
} from 'lucide-react';
import {
  Alarm,
  AlarmBehavior,
  GeoZone,
  LocationCondition,
  RepeatType,
  SoundOptionId,
  TimezoneBehavior,
  ZoneCategory,
} from '../types/alarm';
import {
  SOUND_OPTIONS,
  DAYS_MAP,
  ADVANCE_CONFIRMATION_OPTIONS,
  soundEngine,
  calculateNextOccurrence,
  calculateConfirmationTime,
  formatRemainingTime,
  formatAdvanceMinutesLabel,
  formatAlarmTime,
  formatFullDateTime,
} from '../utils/alarmScheduler';
import { formatDistance } from '../utils/locationEngine';
import {
  SUPPORTED_TIMEZONES,
  formatTimezoneDisplay,
  calculateTimezoneAwareNextOccurrence,
} from '../utils/timezoneEngine';

interface CreateEditAlarmModalProps {
  alarmToEdit?: Alarm | null;
  zones?: GeoZone[];
  deviceTimezone?: string;
  onSave: (
    alarmData: Omit<
      Alarm,
      'id' | 'createdTimestamp' | 'updatedTimestamp' | 'nextTriggerMillis' | 'isSkippedNext'
    > & { id?: string }
  ) => void;
  onClose: () => void;
  isDarkTheme: boolean;
}

export const CreateEditAlarmModal: React.FC<CreateEditAlarmModalProps> = ({
  alarmToEdit,
  zones = [],
  deviceTimezone = 'Asia/Kolkata',
  onSave,
  onClose,
  isDarkTheme,
}) => {
  const initialHour = alarmToEdit ? alarmToEdit.hour : 7;
  const initialMinute = alarmToEdit ? alarmToEdit.minute : 0;

  const [hour, setHour] = useState<number>(initialHour);
  const [minute, setMinute] = useState<number>(initialMinute);
  const [name, setName] = useState<string>(alarmToEdit ? alarmToEdit.name : 'Morning Alarm');
  const [repeatType, setRepeatType] = useState<RepeatType>(
    alarmToEdit ? alarmToEdit.repeatType : 'WEEKLY'
  );
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(
    alarmToEdit ? alarmToEdit.daysOfWeek : [1, 2, 3, 4, 5]
  );
  const [behavior, setBehavior] = useState<AlarmBehavior>(
    alarmToEdit ? alarmToEdit.behavior || 'ALWAYS' : 'ALWAYS'
  );
  
  // Phase 4: Timezone behavior & original timezone
  const [timezoneBehavior, setTimezoneBehavior] = useState<TimezoneBehavior>(
    alarmToEdit?.timezoneBehavior || 'LOCAL_TIME'
  );
  const [originalTimezoneId, setOriginalTimezoneId] = useState<string>(
    alarmToEdit?.originalTimezoneId || deviceTimezone
  );

  const [locationZoneId, setLocationZoneId] = useState<string | null>(
    alarmToEdit?.locationZoneId || null
  );
  const [locationCondition, setLocationCondition] = useState<LocationCondition>(
    alarmToEdit?.locationCondition || 'WHEN_INSIDE'
  );
  const [askAdvanceMinutes, setAskAdvanceMinutes] = useState<number>(
    alarmToEdit ? alarmToEdit.askAdvanceMinutes || 720 : 720
  );
  const [missedConfirmationDefault, setMissedConfirmationDefault] = useState<
    'DO_NOT_RING' | 'RING_ANYWAY'
  >(alarmToEdit?.missedConfirmationDefault || 'DO_NOT_RING');

  const [soundSelection, setSoundSelection] = useState<SoundOptionId>(
    alarmToEdit ? alarmToEdit.soundSelection : 'radar'
  );
  const [isVibrationEnabled, setIsVibrationEnabled] = useState<boolean>(
    alarmToEdit ? alarmToEdit.isVibrationEnabled : true
  );
  const [isSnoozeEnabled, setIsSnoozeEnabled] = useState<boolean>(
    alarmToEdit ? alarmToEdit.isSnoozeEnabled : true
  );
  const [snoozeDurationMinutes, setSnoozeDurationMinutes] = useState<number>(
    alarmToEdit ? alarmToEdit.snoozeDurationMinutes : 9
  );

  const [previewingSound, setPreviewingSound] = useState<SoundOptionId | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedZone = zones.find((z) => z.id === locationZoneId);

  const getCategoryIcon = (category: ZoneCategory) => {
    switch (category) {
      case 'HOME':
        return <Home className="w-4 h-4" />;
      case 'WORK':
        return <Briefcase className="w-4 h-4" />;
      case 'GYM':
        return <Dumbbell className="w-4 h-4" />;
      case 'AIRPORT':
        return <Plane className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  // Time conversion for 12h display
  const isPm = hour >= 12;
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;

  const handlePeriodToggle = (toPm: boolean) => {
    if (toPm && !isPm) {
      setHour((h) => (h + 12) % 24);
    } else if (!toPm && isPm) {
      setHour((h) => (h - 12) % 24);
    }
  };

  const handleDisplayHourChange = (newDisplayHour: number) => {
    const clamped = Math.max(1, Math.min(12, newDisplayHour));
    if (isPm) {
      setHour(clamped === 12 ? 12 : clamped + 12);
    } else {
      setHour(clamped === 12 ? 0 : clamped);
    }
  };

  const toggleDay = (dayId: number) => {
    if (daysOfWeek.includes(dayId)) {
      const updated = daysOfWeek.filter((d) => d !== dayId);
      setDaysOfWeek(updated);
      if (updated.length === 0) {
        setRepeatType('ONETIME');
      }
    } else {
      const updated = [...daysOfWeek, dayId].sort((a, b) => a - b);
      setDaysOfWeek(updated);
      setRepeatType('WEEKLY');
    }
  };

  const setPresetDays = (preset: 'weekdays' | 'weekends' | 'everyday' | 'once') => {
    switch (preset) {
      case 'weekdays':
        setDaysOfWeek([1, 2, 3, 4, 5]);
        setRepeatType('WEEKLY');
        break;
      case 'weekends':
        setDaysOfWeek([6, 7]);
        setRepeatType('WEEKLY');
        break;
      case 'everyday':
        setDaysOfWeek([1, 2, 3, 4, 5, 6, 7]);
        setRepeatType('WEEKLY');
        break;
      case 'once':
        setDaysOfWeek([]);
        setRepeatType('ONETIME');
        break;
    }
  };

  const handleSoundPreview = (soundId: SoundOptionId) => {
    if (previewingSound === soundId) {
      soundEngine.stop();
      setPreviewingSound(null);
    } else {
      soundEngine.playPreview(soundId, 4);
      setPreviewingSound(soundId);
      setTimeout(() => {
        setPreviewingSound(null);
      }, 4000);
    }
  };

  const handleSave = () => {
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      setValidationError('Please specify a valid time');
      return;
    }

    soundEngine.stop();

    onSave({
      id: alarmToEdit?.id,
      name: name.trim() || 'Alarm',
      hour,
      minute,
      isEnabled: true,
      repeatType: daysOfWeek.length === 0 ? 'ONETIME' : repeatType,
      daysOfWeek,
      behavior,
      timezoneBehavior,
      originalTimezoneId,
      originalLocalHour: hour,
      originalLocalMinute: minute,
      currentTimezoneId: deviceTimezone,
      locationZoneId: locationZoneId === 'anywhere' ? null : locationZoneId,
      locationCondition,
      askAdvanceMinutes,
      missedConfirmationDefault,
      soundSelection,
      isVibrationEnabled,
      isSnoozeEnabled,
      snoozeDurationMinutes,
    });
  };

  // Calculate live preview of next occurrence and confirmation time
  const previewNextOccurrence = calculateNextOccurrence(hour, minute, daysOfWeek);
  const remainingText = formatRemainingTime(previewNextOccurrence);
  const previewConfirmationTime = calculateConfirmationTime(previewNextOccurrence, askAdvanceMinutes);
  const confirmationFormatted = formatFullDateTime(previewConfirmationTime);

  return (
    <div className="absolute inset-0 z-40 bg-slate-950/40 backdrop-blur-xs flex flex-col justify-end">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className={`w-full max-h-[92%] rounded-t-[36px] overflow-hidden flex flex-col shadow-2xl border-t transition-colors ${
          isDarkTheme
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Modal Top Bar */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b transition-colors ${
            isDarkTheme ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'
          }`}
        >
          <button
            onClick={() => {
              soundEngine.stop();
              onClose();
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDarkTheme
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-base font-semibold tracking-tight">
            {alarmToEdit ? 'Edit Alarm' : 'New Alarm'}
          </h2>

          <button
            onClick={handleSave}
            id="btn-save-alarm"
            className="flex items-center gap-1 px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Validation Banner */}
          {validationError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Time Picker Card (Clean Minimalism style) */}
          <div
            className={`p-6 rounded-[28px] text-center border flex flex-col items-center justify-center transition-colors ${
              isDarkTheme
                ? 'bg-slate-950/70 border-slate-800'
                : 'bg-slate-50/80 border-slate-100'
            }`}
          >
            <div className="flex items-center justify-center gap-3">
              {/* Hour Input */}
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={displayHour}
                  onChange={(e) => handleDisplayHourChange(parseInt(e.target.value) || 12)}
                  className={`w-24 h-20 rounded-2xl text-center text-5xl font-light tracking-tighter border focus:ring-2 focus:ring-indigo-500 outline-hidden transition-colors ${
                    isDarkTheme
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                  }`}
                />
                <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  Hour
                </span>
              </div>

              <span className="text-4xl font-light text-indigo-600 -mt-5">:</span>

              {/* Minute Input */}
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minute.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setMinute(Math.max(0, Math.min(59, val)));
                  }}
                  className={`w-24 h-20 rounded-2xl text-center text-5xl font-light tracking-tighter border focus:ring-2 focus:ring-indigo-500 outline-hidden transition-colors ${
                    isDarkTheme
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                  }`}
                />
                <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                  Minute
                </span>
              </div>

              {/* AM / PM Segmented Switch */}
              <div className="flex flex-col gap-1.5 ml-2">
                <button
                  type="button"
                  onClick={() => handlePeriodToggle(false)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    !isPm
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isDarkTheme
                      ? 'bg-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-200/80 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodToggle(true)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isPm
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : isDarkTheme
                      ? 'bg-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-200/80 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Next occurrence calculation banner */}
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-indigo-600 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>Alarm set for {remainingText}</span>
            </div>
          </div>

          {/* Alarm Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Alarm Label
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work, Morning Yoga, Medication..."
              maxLength={40}
              className={`w-full px-4 py-3 rounded-2xl text-sm font-medium border focus:ring-2 focus:ring-indigo-500 outline-hidden transition-colors ${
                isDarkTheme
                  ? 'bg-slate-950 border-slate-800 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
            {/* Quick label suggestions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['Morning Alarm', 'Work', 'Workout', 'Wake Up', 'Medication'].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setName(suggestion)}
                  className={`text-[11px] px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                    name === suggestion
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : isDarkTheme
                      ? 'border-slate-800 text-slate-400 hover:bg-slate-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Repeat Days Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Repeat Schedule
              </label>
              <span className="text-xs text-indigo-600 font-medium">
                {daysOfWeek.length === 0
                  ? 'One-time'
                  : daysOfWeek.length === 7
                  ? 'Every day'
                  : `${daysOfWeek.length} days / week`}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {[
                { id: 'weekdays', label: 'Mon–Fri' },
                { id: 'weekends', label: 'Weekends' },
                { id: 'everyday', label: 'Everyday' },
                { id: 'once', label: 'Once' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPresetDays(preset.id as any)}
                  className={`text-xs px-3.5 py-1.5 rounded-full font-medium border whitespace-nowrap transition-colors cursor-pointer ${
                    (preset.id === 'weekdays' &&
                      daysOfWeek.length === 5 &&
                      !daysOfWeek.includes(6) &&
                      !daysOfWeek.includes(7)) ||
                    (preset.id === 'weekends' &&
                      daysOfWeek.length === 2 &&
                      daysOfWeek.includes(6) &&
                      daysOfWeek.includes(7)) ||
                    (preset.id === 'everyday' && daysOfWeek.length === 7) ||
                    (preset.id === 'once' && daysOfWeek.length === 0)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : isDarkTheme
                      ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Day of Week Circle Chips */}
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_MAP.map((day) => {
                const isSelected = daysOfWeek.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`h-11 rounded-2xl flex flex-col items-center justify-center font-semibold text-xs border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                        : isDarkTheme
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>{day.short}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Phase 3: Location / Zone Association */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Location & Geofencing
              </label>
              <span className="text-[11px] text-indigo-600 font-semibold">
                {locationZoneId && locationZoneId !== 'anywhere'
                  ? selectedZone?.name || 'Custom Zone'
                  : 'Anywhere'}
              </span>
            </div>

            {/* Zone Selector Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Option 1: Anywhere */}
              <button
                type="button"
                onClick={() => setLocationZoneId(null)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  !locationZoneId || locationZoneId === 'anywhere'
                    ? isDarkTheme
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-2xs'
                    : isDarkTheme
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Anywhere</p>
                    <p className="text-[10px] text-slate-400">Ring regardless of location</p>
                  </div>
                </div>
                {(!locationZoneId || locationZoneId === 'anywhere') && (
                  <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                )}
              </button>

              {/* Dynamic Zones from ZoneRepository */}
              {zones.map((zone) => {
                const isSelected = locationZoneId === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => setLocationZoneId(zone.id)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? isDarkTheme
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-2xs'
                        : isDarkTheme
                        ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        {getCategoryIcon(zone.category)}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{zone.name}</p>
                        <p className="text-[10px] text-slate-400">Radius: {formatDistance(zone.radiusMeters)}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Location Condition: When inside vs When outside */}
            {locationZoneId && locationZoneId !== 'anywhere' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`p-3.5 rounded-2xl border space-y-2 transition-colors ${
                  isDarkTheme
                    ? 'bg-slate-950/80 border-indigo-900/50'
                    : 'bg-indigo-50/50 border-indigo-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Location Condition
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {locationCondition === 'WHEN_INSIDE' ? 'Inside Zone' : 'Outside Zone'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocationCondition('WHEN_INSIDE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      locationCondition === 'WHEN_INSIDE'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : isDarkTheme
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    When Inside
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationCondition('WHEN_OUTSIDE')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      locationCondition === 'WHEN_OUTSIDE'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                        : isDarkTheme
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    When Outside (Travel)
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Alarm Behavior (Always vs. Ask Before vs. Location-Aware) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Alarm Behavior
              </label>
              <span className="text-[11px] text-indigo-600 font-semibold uppercase">
                {behavior === 'ALWAYS'
                  ? 'Standard'
                  : behavior === 'ASK_BEFORE'
                  ? 'Adaptive'
                  : 'Location-Aware'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option 1: ALWAYS */}
              <div
                onClick={() => setBehavior('ALWAYS')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  behavior === 'ALWAYS'
                    ? isDarkTheme
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-2xs'
                    : isDarkTheme
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">Always</span>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      behavior === 'ALWAYS'
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-400'
                    }`}
                  >
                    {behavior === 'ALWAYS' && <Check className="w-2 h-2 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Rings automatically on scheduled dates.
                </p>
              </div>

              {/* Option 2: ASK_BEFORE */}
              <div
                onClick={() => setBehavior('ASK_BEFORE')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  behavior === 'ASK_BEFORE'
                    ? isDarkTheme
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-2xs'
                    : isDarkTheme
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span className="text-xs font-bold">Ask Before</span>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      behavior === 'ASK_BEFORE'
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-400'
                    }`}
                  >
                    {behavior === 'ASK_BEFORE' && <Check className="w-2 h-2 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Notifies you in advance to confirm or skip.
                </p>
              </div>

              {/* Option 3: LOCATION_AWARE */}
              <div
                onClick={() => setBehavior('LOCATION_AWARE')}
                className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  behavior === 'LOCATION_AWARE'
                    ? isDarkTheme
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-2xs'
                    : isDarkTheme
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-indigo-500" />
                    <span className="text-xs font-bold">Location-Aware</span>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      behavior === 'LOCATION_AWARE'
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-400'
                    }`}
                  >
                    {behavior === 'LOCATION_AWARE' && <Check className="w-2 h-2 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Auto-schedules in zone; skips when outside (with override).
                </p>
              </div>
            </div>

            {/* Configurable Ask-Before / Location-Aware Lead Time */}
            {(behavior === 'ASK_BEFORE' || behavior === 'LOCATION_AWARE') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`p-4 rounded-2xl border space-y-3 transition-colors ${
                  isDarkTheme
                    ? 'bg-slate-950/80 border-indigo-900/50'
                    : 'bg-indigo-50/50 border-indigo-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {behavior === 'LOCATION_AWARE'
                        ? 'Location evaluation lead time'
                        : 'Ask me before the alarm'}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {formatAdvanceMinutesLabel(askAdvanceMinutes)}
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {ADVANCE_CONFIRMATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.minutes}
                      type="button"
                      onClick={() => setAskAdvanceMinutes(opt.minutes)}
                      className={`text-[11px] py-1.5 px-2 rounded-xl border text-center font-medium transition-all cursor-pointer ${
                        askAdvanceMinutes === opt.minutes
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : isDarkTheme
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {opt.shortLabel}
                    </button>
                  ))}
                </div>

                {/* Live Confirmation Preview Callout */}
                <div className="pt-2 border-t border-indigo-200/40 dark:border-indigo-900/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span>
                    Context check triggered at: <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">{confirmationFormatted}</strong>
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Timezone Behavior Section (Phase 4) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Timezone Behavior
              </label>
              <span className="text-[11px] text-indigo-600 font-semibold uppercase">
                {timezoneBehavior === 'LOCAL_TIME' ? 'Local Wall Clock' : 'Anchor Timezone'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: LOCAL_TIME */}
              <div
                onClick={() => setTimezoneBehavior('LOCAL_TIME')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  timezoneBehavior === 'LOCAL_TIME'
                    ? isDarkTheme
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-2xs'
                    : isDarkTheme
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-bold">Local Time</span>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      timezoneBehavior === 'LOCAL_TIME'
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-400'
                    }`}
                  >
                    {timezoneBehavior === 'LOCAL_TIME' && <Check className="w-2 h-2 stroke-[3]" />}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Always rings at {formatAlarmTime(hour, minute).fullStr} in whatever timezone the device is in (ideal for wake-up & daily routines).
                </p>
              </div>

              {/* Option 2: ORIGINAL_TIMEZONE */}
              <div
                onClick={() => setTimezoneBehavior('ORIGINAL_TIMEZONE')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  timezoneBehavior === 'ORIGINAL_TIMEZONE'
                    ? isDarkTheme
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                      : 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-2xs'
                    : isDarkTheme
                    ? 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-xs font-bold">Original Timezone</span>
                  </div>
                  <div
                    className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                      timezoneBehavior === 'ORIGINAL_TIMEZONE'
                        ? 'border-indigo-600 bg-indigo-600 text-white'
                        : 'border-slate-400'
                    }`}
                  >
                    {timezoneBehavior === 'ORIGINAL_TIMEZONE' && (
                      <Check className="w-2 h-2 stroke-[3]" />
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Preserves original instant anchored to {originalTimezoneId.split('/').pop()} (ideal for remote meetings & standups).
                </p>
              </div>
            </div>

            {/* Timezone anchor selector */}
            <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Anchor Zone:
                </span>
              </div>

              <select
                value={originalTimezoneId}
                onChange={(e) => setOriginalTimezoneId(e.target.value)}
                className="text-xs font-semibold bg-transparent text-indigo-600 dark:text-indigo-400 border-none outline-hidden cursor-pointer"
              >
                {SUPPORTED_TIMEZONES.map((tz) => (
                  <option key={tz.id} value={tz.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                    {tz.label} ({tz.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sound Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Ringtone Sound
            </label>
            <div className="grid grid-cols-1 gap-2">
              {SOUND_OPTIONS.map((snd) => {
                const isSelected = soundSelection === snd.id;
                const isPreviewing = previewingSound === snd.id;
                return (
                  <div
                    key={snd.id}
                    onClick={() => setSoundSelection(snd.id)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? isDarkTheme
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                          : 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                        : isDarkTheme
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : isDarkTheme
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{snd.name}</p>
                        <p className="text-[10px] text-slate-400">{snd.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSoundPreview(snd.id);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                        isPreviewing
                          ? 'bg-rose-600 text-white border-rose-500'
                          : isDarkTheme
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isPreviewing ? (
                        <Square className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                      <span className="text-[11px]">{isPreviewing ? 'Stop' : 'Preview'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vibration & Snooze Settings */}
          <div className="space-y-3 pt-1">
            {/* Vibration Toggle */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${
                isDarkTheme ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600">
                  <Vibrate className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Vibration</p>
                  <p className="text-[11px] text-slate-400">Haptic vibration pattern</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isVibrationEnabled}
                onChange={(e) => setIsVibrationEnabled(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded-md cursor-pointer"
              />
            </div>

            {/* Snooze Toggle */}
            <div
              className={`p-4 rounded-2xl border space-y-3 transition-colors ${
                isDarkTheme ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Snooze</p>
                    <p className="text-[11px] text-slate-400">Allow temporary snooze</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isSnoozeEnabled}
                  onChange={(e) => setIsSnoozeEnabled(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded-md cursor-pointer"
                />
              </div>

              {isSnoozeEnabled && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 text-xs">
                  <span className="text-slate-400">Snooze Duration</span>
                  <div className="flex gap-1.5">
                    {[3, 5, 9, 10, 15].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setSnoozeDurationMinutes(mins)}
                        className={`px-2.5 py-1 rounded-lg font-semibold text-xs transition-colors cursor-pointer ${
                          snoozeDurationMinutes === mins
                            ? 'bg-indigo-600 text-white'
                            : isDarkTheme
                            ? 'bg-slate-800 text-slate-400 hover:text-white'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

