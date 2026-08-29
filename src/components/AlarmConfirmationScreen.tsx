import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check,
  FastForward,
  Clock,
  Calendar,
  ChevronRight,
  Bell,
  X,
  Sparkles,
  ArrowRight,
  Sliders,
  CalendarDays,
} from 'lucide-react';
import { Alarm, AlarmOccurrence } from '../types/alarm';
import {
  formatAlarmTime,
  formatOccurrenceDateLabel,
  formatFullDateTime,
} from '../utils/alarmScheduler';

interface AlarmConfirmationScreenProps {
  occurrence: AlarmOccurrence;
  parentAlarm?: Alarm | null;
  currentTime?: Date;
  onConfirm: (occurrence: AlarmOccurrence) => void;
  onSkipTomorrow: (occurrence: AlarmOccurrence) => void;
  onSkipMultipleDays?: (occurrence: AlarmOccurrence, daysCount: number) => void;
  onSkipMultiDay?: (daysCount: number) => void;
  onChangeTime: (newHour: number, newMinute: number) => void;
  onDecideLater: (occurrence: AlarmOccurrence) => void;
  onClose: () => void;
  isDarkTheme?: boolean;
}

export const AlarmConfirmationScreen: React.FC<AlarmConfirmationScreenProps> = ({
  occurrence,
  parentAlarm,
  currentTime,
  onConfirm,
  onSkipTomorrow,
  onSkipMultipleDays,
  onSkipMultiDay,
  onChangeTime,
  onDecideLater,
  onClose,
  isDarkTheme = true,
}) => {
  // Modal modes: 'main' | 'change_time' | 'skip_multiple'
  const [modalMode, setModalMode] = useState<'main' | 'change_time' | 'skip_multiple'>('main');

  // Change Time state
  const targetDate = new Date(occurrence.scheduledDateTime || Date.now());
  const [editHour, setEditHour] = useState<number>(
    occurrence.modifiedHour !== undefined ? occurrence.modifiedHour : targetDate.getHours()
  );
  const [editMinute, setEditMinute] = useState<number>(
    occurrence.modifiedMinute !== undefined ? occurrence.modifiedMinute : targetDate.getMinutes()
  );
  const [selectedSkipDays, setSelectedSkipDays] = useState<number>(3);

  const originalTimeMs = occurrence.originalScheduledDateTime || occurrence.scheduledDateTime || Date.now();
  const { fullStr: originalTimeFormatted } = formatAlarmTime(
    new Date(originalTimeMs).getHours(),
    new Date(originalTimeMs).getMinutes()
  );

  const { fullStr: currentTimeFormatted } = formatAlarmTime(editHour, editMinute);
  const isPm = editHour >= 12;
  const displayHour = editHour % 12 === 0 ? 12 : editHour % 12;

  const nowMillis =
    currentTime instanceof Date
      ? currentTime.getTime()
      : typeof currentTime === 'number'
      ? currentTime
      : Date.now();

  const dateRelative = formatOccurrenceDateLabel(
    occurrence.scheduledDateTime,
    nowMillis
  );
  const fullDateText = formatFullDateTime(occurrence.scheduledDateTime);

  const handlePeriodToggle = (toPm: boolean) => {
    if (toPm && !isPm) setEditHour((h) => (h + 12) % 24);
    else if (!toPm && isPm) setEditHour((h) => (h - 12) % 24);
  };

  const handleDisplayHourChange = (newDisplayHour: number) => {
    const clamped = Math.max(1, Math.min(12, newDisplayHour));
    if (isPm) setEditHour(clamped === 12 ? 12 : clamped + 12);
    else setEditHour(clamped === 12 ? 0 : clamped);
  };

  return (
    <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex flex-col justify-end p-0">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className={`w-full max-h-[94%] rounded-t-[36px] overflow-hidden flex flex-col shadow-2xl border-t transition-colors ${
          isDarkTheme
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Top Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b transition-colors ${
            isDarkTheme ? 'border-slate-800/80 bg-slate-900' : 'border-slate-100 bg-white'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 block">
                Alarm Confirmation
              </span>
              <h3 className="text-xs font-semibold truncate max-w-[200px]">
                {occurrence.parentAlarmName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isDarkTheme
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {modalMode === 'main' && (
            <div className="space-y-6">
              {/* Question & Target Time Card */}
              <div
                className={`p-6 rounded-[30px] border text-center relative overflow-hidden transition-colors ${
                  isDarkTheme
                    ? 'bg-slate-950/70 border-slate-800'
                    : 'bg-slate-50/80 border-slate-100'
                }`}
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-xs font-semibold mb-3">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{dateRelative}</span>
                </div>

                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-light tracking-tighter">
                    {currentTimeFormatted}
                  </span>
                </div>

                <h2 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-2">
                  {occurrence.parentAlarmName}
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  {fullDateText}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/80 flex items-center justify-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Do you need this alarm?
                  </p>
                </div>
              </div>

              {/* Action Buttons Stack */}
              <div className="space-y-2.5">
                {/* 1. Primary YES button */}
                <button
                  onClick={() => onConfirm(occurrence)}
                  id="btn-confirm-alarm-yes"
                  className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-600/30 flex items-center justify-between transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white stroke-[3]" />
                    </div>
                    <span className="text-base">Yes — {currentTimeFormatted}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-80 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* 2. CHANGE TIME button */}
                <button
                  onClick={() => setModalMode('change_time')}
                  id="btn-confirm-alarm-change-time"
                  className={`w-full py-3.5 px-5 rounded-2xl border font-medium text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isDarkTheme
                      ? 'bg-slate-950/60 border-slate-800 text-slate-200 hover:bg-slate-800/80'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-sky-500" />
                    <span>Change time for this occurrence only</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* 3. SKIP TOMORROW button */}
                <button
                  onClick={() => onSkipTomorrow(occurrence)}
                  id="btn-confirm-alarm-skip-tomorrow"
                  className={`w-full py-3.5 px-5 rounded-2xl border font-medium text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isDarkTheme
                      ? 'bg-slate-950/60 border-slate-800 text-amber-400 hover:bg-amber-500/10'
                      : 'bg-white border-slate-200 text-amber-600 hover:bg-amber-50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FastForward className="w-4 h-4 text-amber-500" />
                    <span>Skip {dateRelative.toLowerCase()}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Rule stays active</span>
                </button>

                {/* 4. SKIP SEVERAL DAYS button */}
                <button
                  onClick={() => setModalMode('skip_multiple')}
                  id="btn-confirm-alarm-skip-multiple"
                  className={`w-full py-3.5 px-5 rounded-2xl border font-medium text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isDarkTheme
                      ? 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <CalendarDays className="w-4 h-4 text-indigo-500" />
                    <span>Skip for several days...</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                {/* 5. DECIDE LATER button */}
                <button
                  onClick={() => onDecideLater(occurrence)}
                  id="btn-confirm-alarm-decide-later"
                  className={`w-full py-3 px-5 rounded-2xl font-medium text-xs transition-colors cursor-pointer text-center ${
                    isDarkTheme
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  Decide later (Keep persistent reminder in shade)
                </button>
              </div>

              {/* Explanatory footer notice */}
              <p className="text-[11px] text-slate-500 text-center leading-relaxed px-4">
                Skipping or modifying an occurrence will <strong className="text-slate-700 dark:text-slate-300">not</strong> disable or alter your recurring {parentAlarm?.name} weekly schedule.
              </p>
            </div>
          )}

          {/* Sub-view: CHANGE TIME for this occurrence only */}
          {modalMode === 'change_time' && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-semibold">
                  Change Time (This occurrence only)
                </h4>
                <p className="text-xs text-slate-500">
                  Normal recurring time is {originalTimeFormatted}. Future days will stay at {originalTimeFormatted}.
                </p>
              </div>

              {/* Time Picker Controls */}
              <div
                className={`p-6 rounded-[28px] text-center border flex flex-col items-center justify-center transition-colors ${
                  isDarkTheme
                    ? 'bg-slate-950/70 border-slate-800'
                    : 'bg-slate-50/80 border-slate-100'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  {/* Hour */}
                  <div className="flex flex-col items-center">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={displayHour}
                      onChange={(e) => handleDisplayHourChange(parseInt(e.target.value) || 12)}
                      className={`w-20 h-18 rounded-2xl text-center text-4xl font-light tracking-tighter border focus:ring-2 focus:ring-indigo-500 outline-hidden transition-colors ${
                        isDarkTheme
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                      }`}
                    />
                    <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                      Hour
                    </span>
                  </div>

                  <span className="text-3xl font-light text-indigo-600 -mt-5">:</span>

                  {/* Minute */}
                  <div className="flex flex-col items-center">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={editMinute.toString().padStart(2, '0')}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setEditMinute(Math.max(0, Math.min(59, val)));
                      }}
                      className={`w-20 h-18 rounded-2xl text-center text-4xl font-light tracking-tighter border focus:ring-2 focus:ring-indigo-500 outline-hidden transition-colors ${
                        isDarkTheme
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                      }`}
                    />
                    <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">
                      Minute
                    </span>
                  </div>

                  {/* AM/PM */}
                  <div className="flex flex-col gap-1 ml-2">
                    <button
                      type="button"
                      onClick={() => handlePeriodToggle(false)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        !isPm
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isDarkTheme
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePeriodToggle(true)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isPm
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isDarkTheme
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  {[
                    { label: '+30m', mins: 30 },
                    { label: '+1h', mins: 60 },
                    { label: '+1.5h', mins: 90 },
                    { label: '8:00 AM', h: 8, m: 0 },
                    { label: '8:30 AM', h: 8, m: 30 },
                  ].map((quick, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (quick.h !== undefined) {
                          setEditHour(quick.h);
                          setEditMinute(quick.m || 0);
                        } else if (quick.mins) {
                          const newTotal = (editHour * 60 + editMinute + quick.mins) % (24 * 60);
                          setEditHour(Math.floor(newTotal / 60));
                          setEditMinute(newTotal % 60);
                        }
                      }}
                      className="text-[11px] px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                    >
                      {quick.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode('main')}
                  className="flex-1 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => onChangeTime(editHour, editMinute)}
                  className="flex-1 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Set for {currentTimeFormatted}
                </button>
              </div>
            </div>
          )}

          {/* Sub-view: SKIP SEVERAL DAYS */}
          {modalMode === 'skip_multiple' && (
            <div className="space-y-6">
              <div className="text-center space-y-1">
                <h4 className="text-sm font-semibold">
                  Skip for Several Days
                </h4>
                <p className="text-xs text-slate-500">
                  Select how many days to temporarily pause alarms for {occurrence.parentAlarmName}.
                </p>
              </div>

              {/* Day selection pills */}
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { days: 1, label: '1 Day (Skip next occurrence only)' },
                  { days: 2, label: '2 Days (Resume in 48 hours)' },
                  { days: 3, label: '3 Days (Skip next 3 occurrences)' },
                  { days: 5, label: '5 Days (Full work week skip)' },
                  { days: 7, label: '7 Days (Skip for 1 full week)' },
                ].map((opt) => (
                  <div
                    key={opt.days}
                    onClick={() => setSelectedSkipDays(opt.days)}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedSkipDays === opt.days
                        ? isDarkTheme
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                        : isDarkTheme
                        ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          selectedSkipDays === opt.days
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {opt.days}d
                      </div>
                      <span className="text-xs font-medium">{opt.label}</span>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedSkipDays === opt.days
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-400'
                      }`}
                    >
                      {selectedSkipDays === opt.days && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode('main')}
                  className="flex-1 py-3 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onSkipMultiDay) {
                      onSkipMultiDay(selectedSkipDays);
                    } else if (onSkipMultipleDays) {
                      onSkipMultipleDays(occurrence, selectedSkipDays);
                    }
                  }}
                  className="flex-1 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Confirm Skip ({selectedSkipDays} Days)
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
