import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Check, FastForward, Clock, ChevronRight, X } from 'lucide-react';
import { AlarmOccurrence } from '../types/alarm';
import {
  formatAlarmTime,
  formatOccurrenceDateLabel,
} from '../utils/alarmScheduler';

interface AndroidNotificationBannerProps {
  occurrence: AlarmOccurrence;
  currentTime?: Date;
  onOpenConfirmation?: (occurrence: AlarmOccurrence) => void;
  onOpenModal?: () => void;
  onQuickConfirm: (occurrenceId: string) => void;
  onQuickSkip: (occurrenceId: string) => void;
  onQuickChangeTime?: (occurrence: AlarmOccurrence) => void;
  onDismissNotification?: () => void;
  onDismiss?: () => void;
  isDarkTheme?: boolean;
}

export const AndroidNotificationBanner: React.FC<AndroidNotificationBannerProps> = ({
  occurrence,
  currentTime,
  onOpenConfirmation,
  onOpenModal,
  onQuickConfirm,
  onQuickSkip,
  onQuickChangeTime,
  onDismissNotification,
  onDismiss,
  isDarkTheme = true,
}) => {
  const targetDate = new Date(occurrence.scheduledDateTime || Date.now());
  const hour = occurrence.modifiedHour !== undefined ? occurrence.modifiedHour : targetDate.getHours();
  const minute = occurrence.modifiedMinute !== undefined ? occurrence.modifiedMinute : targetDate.getMinutes();
  const { fullStr: timeFormatted } = formatAlarmTime(hour, minute);

  const nowMillis =
    currentTime instanceof Date
      ? currentTime.getTime()
      : typeof currentTime === 'number'
      ? currentTime
      : Date.now();

  const dateRelative = formatOccurrenceDateLabel(
    occurrence.scheduledDateTime,
    nowMillis
  ).toLowerCase();

  const handleOpen = () => {
    if (onOpenConfirmation) {
      onOpenConfirmation(occurrence);
    } else if (onOpenModal) {
      onOpenModal();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.96 }}
      transition={{ type: 'spring', damping: 24, stiffness: 320 }}
      className={`mx-3 my-2 rounded-[24px] p-4 shadow-xl border relative overflow-hidden transition-all select-none z-30 ${
        isDarkTheme
          ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-slate-950/70'
          : 'bg-white border-slate-200/90 text-slate-900 shadow-slate-300/40'
      }`}
    >
      {/* Top Header info (App & Channel) */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
        <div className="flex items-center space-x-1.5">
          <div className="w-4 h-4 rounded-md bg-indigo-600 flex items-center justify-center text-white">
            <Bell className="w-2.5 h-2.5" />
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">Smart Alarm</span>
          <span>•</span>
          <span>Adaptive Confirmation</span>
        </div>
        <span className="text-[10px] text-slate-400">Now</span>
      </div>

      {/* Main Notification Body (Clickable to open confirmation screen) */}
      <div
        onClick={handleOpen}
        className="cursor-pointer group"
      >
        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
          <span>Alarm confirmation</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
          Do you need your <strong className="text-indigo-600 dark:text-indigo-400">{occurrence.parentAlarmName}</strong> alarm {dateRelative} at <strong>{timeFormatted}</strong>?
        </p>
      </div>

      {/* Action Buttons (Actionable from notification shade directly) */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickConfirm(occurrence.id);
          }}
          className="flex-1 py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
        >
          <Check className="w-3 h-3 stroke-[2.5]" />
          <span>SET ALARM</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickSkip(occurrence.id);
          }}
          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
            isDarkTheme
              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-400'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-amber-600'
          }`}
        >
          <FastForward className="w-3 h-3" />
          <span>SKIP</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickChangeTime(occurrence);
          }}
          className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
            isDarkTheme
              ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
          }`}
        >
          <Clock className="w-3 h-3 text-sky-500" />
          <span className="hidden sm:inline">CHANGE TIME</span>
          <span className="sm:hidden">TIME</span>
        </button>
      </div>
    </motion.div>
  );
};
