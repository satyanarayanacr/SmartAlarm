import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  AlarmClock,
  Trash2,
  Edit2,
  Volume2,
  FastForward,
  Play,
  Clock,
  Vibrate,
  Moon,
  Sparkles,
  Settings,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  Compass,
  Globe2,
} from 'lucide-react';
import { Alarm, AlarmOccurrence, GeoZone } from '../types/alarm';
import {
  formatAlarmTime,
  formatRepeatDays,
  formatRemainingTime,
  formatAdvanceMinutesLabel,
  formatOccurrenceDateLabel,
  getOccurrenceStatusBadge,
  SOUND_OPTIONS,
} from '../utils/alarmScheduler';
import { formatTimezoneDisplay } from '../utils/timezoneEngine';

interface AlarmListScreenProps {
  alarms: Alarm[];
  occurrences: AlarmOccurrence[];
  zones?: GeoZone[];
  deviceTimezone?: string;
  currentTime?: Date;
  onAddAlarm: () => void;
  onEditAlarm: (alarm: Alarm) => void;
  onToggleAlarm: (id: string, isEnabled: boolean) => void;
  onDeleteAlarm: (id: string) => void;
  onToggleSkipNext: (id: string) => void;
  onTriggerTestAlarm: (alarm: Alarm) => void;
  onOpenConfirmation: (occurrence: AlarmOccurrence) => void;
  onOpenTimezoneReview?: () => void;
  isDarkTheme: boolean;
}

export const AlarmListScreen: React.FC<AlarmListScreenProps> = ({
  alarms,
  occurrences,
  zones = [],
  deviceTimezone = 'Asia/Kolkata',
  currentTime,
  onAddAlarm,
  onEditAlarm,
  onToggleAlarm,
  onDeleteAlarm,
  onToggleSkipNext,
  onTriggerTestAlarm,
  onOpenConfirmation,
  onOpenTimezoneReview,
  isDarkTheme,
}) => {
  const nowMillis =
    currentTime instanceof Date
      ? currentTime.getTime()
      : typeof currentTime === 'number'
      ? currentTime
      : Date.now();

  // Sort alarms by hour and minute
  const sortedAlarms = [...alarms].sort((a, b) => {
    if (a.hour !== b.hour) return a.hour - b.hour;
    return a.minute - b.minute;
  });

  // Calculate nearest upcoming enabled alarm
  const enabledAlarms = alarms.filter(
    (a) => a.isEnabled && a.nextTriggerMillis > nowMillis
  );
  const nextUpcoming = enabledAlarms.sort(
    (a, b) => a.nextTriggerMillis - b.nextTriggerMillis
  )[0];

  return (
    <div
      className={`flex-1 flex flex-col relative h-full overflow-hidden select-none transition-colors ${
        isDarkTheme ? 'bg-slate-950 text-slate-100' : 'bg-[#f7f9fc] text-slate-900'
      }`}
    >
      {/* Top Header / App Bar (Clean Minimalism) */}
      <header
        className={`px-6 pt-5 pb-3 flex justify-between items-end border-b transition-colors ${
          isDarkTheme ? 'border-slate-800/80 bg-slate-950' : 'border-slate-200/50 bg-[#f7f9fc]'
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={`text-2xl font-semibold tracking-tight ${
                isDarkTheme ? 'text-white' : 'text-slate-900'
              }`}
            >
              Smart Alarm
            </h1>
            <button
              type="button"
              onClick={onOpenTimezoneReview}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 flex items-center gap-1 cursor-pointer"
              title="Current device timezone"
            >
              <Globe2 className="w-2.5 h-2.5" />
              <span>{deviceTimezone.split('/').pop()?.replace(/_/g, ' ')}</span>
            </button>
          </div>
          <p className="text-slate-500 mt-0.5 text-xs font-medium">
            {nextUpcoming
              ? `Next in ${formatRemainingTime(nextUpcoming.nextTriggerMillis, nowMillis)}`
              : alarms.length > 0
              ? 'No active alarms'
              : 'Add your first alarm schedule'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddAlarm}
            title="Create Alarm"
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all cursor-pointer ${
              isDarkTheme
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                : 'bg-slate-200/90 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Alarms List Scrollable View */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-28">
        {sortedAlarms.length === 0 ? (
          /* Empty state matching Clean Minimalism dashed card */
          <div
            onClick={onAddAlarm}
            className={`rounded-[32px] p-8 flex flex-col items-center justify-center text-center gap-2 cursor-pointer transition-all border-2 border-dashed ${
              isDarkTheme
                ? 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900/70'
                : 'bg-slate-100/80 border-slate-200 text-slate-400 hover:bg-slate-200/50'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-2xl font-light ${
                isDarkTheme ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-500'
              }`}
            >
              +
            </div>
            <p className="font-medium text-sm mt-1">Add alarm</p>
            <p className="text-xs text-slate-500 max-w-[200px]">
              Set repetitive schedules, custom tones, and reliable exact waking
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedAlarms.map((alarm) => {
              const { timeStr, periodStr } = formatAlarmTime(alarm.hour, alarm.minute);
              const daysLabel = formatRepeatDays(alarm.daysOfWeek);
              const soundObj = SOUND_OPTIONS.find((s) => s.id === alarm.soundSelection);
              const soundName = soundObj ? soundObj.name : 'Default';

              // Find active upcoming occurrence for this alarm
              const occurrence = occurrences.find(
                (occ) => occ.parentAlarmId === alarm.id && occ.status !== 'DISMISSED' && occ.status !== 'EXPIRED'
              );

              const occBadge = occurrence ? getOccurrenceStatusBadge(occurrence.status) : null;
              const occDateLabel = occurrence
                ? formatOccurrenceDateLabel(occurrence.scheduledDateTime, nowMillis)
                : null;

              return (
                <motion.div
                  key={alarm.id}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className={`group relative rounded-[32px] p-6 shadow-xs border transition-all ${
                    alarm.isEnabled
                      ? isDarkTheme
                        ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-slate-950/40'
                        : 'bg-white border-slate-100 text-slate-900 shadow-slate-200/50'
                      : isDarkTheme
                      ? 'bg-slate-950/60 border-slate-900 text-slate-500 opacity-60'
                      : 'bg-white border-slate-100 text-slate-400 opacity-60'
                  }`}
                >
                  {/* Top Badges Row */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {/* Behavior badge: Standard vs Adaptive vs Location */}
                    {alarm.behavior === 'ASK_BEFORE' ? (
                      <div className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-500 text-[10px] font-semibold inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Ask before ({formatAdvanceMinutesLabel(alarm.askAdvanceMinutes || 720)})</span>
                      </div>
                    ) : alarm.behavior === 'LOCATION_AWARE' ? (
                      <div className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-[10px] font-semibold inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>Location-Aware</span>
                      </div>
                    ) : (
                      <div className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] font-semibold inline-flex items-center gap-1">
                        <span>Always</span>
                      </div>
                    )}

                    {/* Timezone Badge (Phase 4) */}
                    {alarm.timezoneBehavior === 'ORIGINAL_TIMEZONE' && (
                      <div className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-[10px] font-semibold inline-flex items-center gap-1">
                        <Globe2 className="w-2.5 h-2.5" />
                        <span>{alarm.originalTimezoneId?.split('/').pop() || 'Original TZ'}</span>
                      </div>
                    )}

                    {/* Zone Badge if configured */}
                    {alarm.locationZoneId && (
                      <div className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold inline-flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>
                          {zones.find((z) => z.id === alarm.locationZoneId)?.name || 'Zone'}{' '}
                          ({alarm.locationCondition === 'WHEN_INSIDE' ? 'Inside' : 'Outside'})
                        </span>
                      </div>
                    )}

                    {/* Occurrence status tag */}
                    {occurrence && occBadge && (
                      <div
                        onClick={() => onOpenConfirmation(occurrence)}
                        className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity ${occBadge.bgClass} ${occBadge.borderClass} ${occBadge.colorClass}`}
                      >
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{occDateLabel}: {occBadge.label}</span>
                      </div>
                    )}

                    {/* Skip Badge Indicator */}
                    {alarm.isSkippedNext && alarm.isEnabled && (
                      <div className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-[10px] font-semibold inline-flex items-center gap-1">
                        <FastForward className="w-3 h-3" />
                        <span>Skipping next</span>
                      </div>
                    )}
                  </div>

                  {/* Main Time & Clean Switch Row */}
                  <div className="flex justify-between items-start">
                    <div
                      onClick={() => onEditAlarm(alarm)}
                      className="cursor-pointer flex-1 group-hover:opacity-95 transition-opacity"
                    >
                      <div className="flex items-baseline gap-1">
                        <span
                          className={`text-5xl font-light tracking-tighter ${
                            alarm.isEnabled
                              ? isDarkTheme
                                ? 'text-white'
                                : 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {timeStr}
                        </span>
                        <span className="text-lg font-medium text-slate-400 ml-1">
                          {periodStr}
                        </span>
                      </div>

                      <h3
                        className={`text-base font-medium mt-2 truncate max-w-[200px] ${
                          alarm.isEnabled
                            ? isDarkTheme
                              ? 'text-slate-200'
                              : 'text-slate-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {alarm.name}
                      </h3>

                      <p
                        className={`text-xs font-semibold mt-1 uppercase tracking-wider ${
                          alarm.isEnabled
                            ? 'text-indigo-600'
                            : isDarkTheme
                            ? 'text-slate-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {daysLabel}
                      </p>
                    </div>

                    {/* Clean Minimalism Pill Switch */}
                    <div
                      onClick={() => onToggleAlarm(alarm.id, !alarm.isEnabled)}
                      className={`w-14 h-8 rounded-full relative cursor-pointer transition-colors duration-200 shrink-0 ${
                        alarm.isEnabled
                          ? 'bg-indigo-600'
                          : isDarkTheme
                          ? 'bg-slate-800'
                          : 'bg-slate-200'
                      }`}
                    >
                      <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md ${
                          alarm.isEnabled ? 'right-1' : 'left-1'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Adaptive Occurrence Quick Action Callout */}
                  {alarm.isEnabled && occurrence && (occurrence.status === 'WAITING_FOR_USER' || occurrence.status === 'CONFIRMATION_SCHEDULED') && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {occurrence.status === 'WAITING_FOR_USER' ? 'Confirmation requested:' : 'Upcoming occurrence:'}
                      </span>
                      <button
                        onClick={() => onOpenConfirmation(occurrence)}
                        className="text-xs font-semibold px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800/60 transition-colors cursor-pointer"
                      >
                        Confirm / Change
                      </button>
                    </div>
                  )}

                  {/* Card Bottom / Divider & Metadata */}
                  <div
                    className={`mt-4 pt-3.5 border-t flex items-center justify-between text-xs transition-colors ${
                      isDarkTheme ? 'border-slate-800/80 text-slate-400' : 'border-slate-100 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate font-medium">
                      <span className="flex items-center gap-1 truncate max-w-[120px]">
                        <Volume2 className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{soundName}</span>
                      </span>

                      {alarm.isVibrationEnabled && (
                        <span className="hidden sm:flex items-center gap-1">
                          <Vibrate className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span>Vibrate</span>
                        </span>
                      )}

                      {alarm.isSnoozeEnabled ? (
                        <span className="flex items-center gap-1">
                          <Moon className="w-3 h-3 shrink-0 text-slate-400" />
                          <span>{alarm.snoozeDurationMinutes}m</span>
                        </span>
                      ) : (
                        <span className="text-slate-400/80">No Snooze</span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-1">
                      {/* Test Ring Button */}
                      <button
                        onClick={() => onTriggerTestAlarm(alarm)}
                        title="Test Alarm Ring"
                        className={`px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                          isDarkTheme
                            ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600'
                        }`}
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>Test</span>
                      </button>

                      {/* Skip Next Occurrence Button */}
                      {alarm.repeatType === 'WEEKLY' && alarm.daysOfWeek.length > 0 && (
                        <button
                          onClick={() => onToggleSkipNext(alarm.id)}
                          title={alarm.isSkippedNext ? 'Cancel Skip' : 'Skip Next Occurrence'}
                          className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                            alarm.isSkippedNext
                              ? 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                              : isDarkTheme
                              ? 'hover:bg-slate-800 border-slate-800 text-slate-400'
                              : 'hover:bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          <FastForward className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Edit Button */}
                      <button
                        onClick={() => onEditAlarm(alarm)}
                        title="Edit Alarm"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDarkTheme
                            ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                            : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => onDeleteAlarm(alarm.id)}
                        title="Delete Alarm"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDarkTheme
                            ? 'hover:bg-rose-500/20 text-slate-400 hover:text-rose-400'
                            : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Floating Action Button (Clean Minimalism FAB) */}
      <div className="absolute bottom-7 right-7 z-20">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.94 }}
          onClick={onAddAlarm}
          id="btn-create-alarm-fab"
          aria-label="Create new alarm"
          className="w-16 h-16 rounded-3xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xl shadow-indigo-600/30 flex items-center justify-center transition-all cursor-pointer"
        >
          <Plus className="w-8 h-8 stroke-[2.5]" />
        </motion.button>
      </div>
    </div>
  );
};

