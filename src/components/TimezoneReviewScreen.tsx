import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Globe2,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Shield,
  Sliders,
  Check,
  X,
  Bell,
} from 'lucide-react';
import {
  Alarm,
  AffectedAlarmSummary,
  TimezoneBehavior,
  TimezoneChangeEvent,
} from '../types/alarm';
import { formatTimezoneDisplay } from '../utils/timezoneEngine';
import { formatAlarmTime } from '../utils/alarmScheduler';

interface TimezoneReviewScreenProps {
  changeEvent: TimezoneChangeEvent;
  alarms: Alarm[];
  onApplyResolution: (
    updatedAlarms: Alarm[],
    resolutionType: 'ALL_LOCAL' | 'ALL_ORIGINAL' | 'CUSTOM' | 'DISMISSED'
  ) => void;
  onDismiss: () => void;
  isDarkTheme: boolean;
}

export const TimezoneReviewScreen: React.FC<TimezoneReviewScreenProps> = ({
  changeEvent,
  alarms,
  onApplyResolution,
  onDismiss,
  isDarkTheme,
}) => {
  // Local state for per-alarm resolution choices
  const [alarmChoices, setAlarmChoices] = useState<Record<string, TimezoneBehavior>>(() => {
    const map: Record<string, TimezoneBehavior> = {};
    changeEvent.affectedAlarms.forEach((item) => {
      map[item.alarmId] = item.behavior;
    });
    return map;
  });

  const [mode, setMode] = useState<'summary' | 'individual'>('summary');

  const { previousTimezoneId, newTimezoneId, affectedAlarms } = changeEvent;

  // Global Action Handlers
  const handleKeepAllLocal = () => {
    const updated = alarms.map((alarm) => {
      const isAffected = affectedAlarms.some((a) => a.alarmId === alarm.id);
      if (isAffected) {
        return {
          ...alarm,
          timezoneBehavior: 'LOCAL_TIME' as TimezoneBehavior,
          currentTimezoneId: newTimezoneId,
          // Clock time remains same in new timezone
        };
      }
      return alarm;
    });
    onApplyResolution(updated, 'ALL_LOCAL');
  };

  const handleKeepOriginalTimezones = () => {
    const updated = alarms.map((alarm) => {
      const isAffected = affectedAlarms.some((a) => a.alarmId === alarm.id);
      if (isAffected) {
        return {
          ...alarm,
          timezoneBehavior: 'ORIGINAL_TIMEZONE' as TimezoneBehavior,
          currentTimezoneId: newTimezoneId,
        };
      }
      return alarm;
    });
    onApplyResolution(updated, 'ALL_ORIGINAL');
  };

  const handleApplyCustomChoices = () => {
    const updated = alarms.map((alarm) => {
      if (alarmChoices[alarm.id]) {
        const choice = alarmChoices[alarm.id];
        if (choice === 'DISABLED') {
          return {
            ...alarm,
            isEnabled: false,
            timezoneBehavior: choice,
            currentTimezoneId: newTimezoneId,
          };
        }
        return {
          ...alarm,
          timezoneBehavior: choice,
          currentTimezoneId: newTimezoneId,
        };
      }
      return alarm;
    });
    onApplyResolution(updated, 'CUSTOM');
  };

  const setSingleAlarmChoice = (alarmId: string, choice: TimezoneBehavior) => {
    setAlarmChoices((prev) => ({
      ...prev,
      [alarmId]: choice,
    }));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none relative">
      {/* Screen Top Header */}
      <div
        className={`px-6 pt-5 pb-4 flex items-center justify-between border-b transition-colors ${
          isDarkTheme ? 'border-slate-800 bg-slate-950 text-white' : 'border-slate-200 bg-[#f7f9fc] text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">Timezone Changed</h1>
            <p className="text-[11px] text-slate-500">Review schedule adjustments</p>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
            isDarkTheme ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-200'
          }`}
          title="Do nothing for now"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Scrollable Review Area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-24">
        {/* Timezone Transition Card */}
        <div
          className={`p-4 rounded-[28px] border transition-colors ${
            isDarkTheme
              ? 'bg-slate-900/90 border-slate-800 text-slate-100'
              : 'bg-white border-slate-100 text-slate-900 shadow-xs'
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 dark:text-indigo-400 block mb-2">
            Device Travel Shift Detected
          </span>

          <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800">
            <div className="flex-1">
              <span className="text-[10px] text-slate-400 block">From</span>
              <p className="text-xs font-bold truncate">
                {previousTimezoneId.split('/').pop()?.replace(/_/g, ' ')}
              </p>
              <p className="text-[10px] text-slate-500">{formatTimezoneDisplay(previousTimezoneId)}</p>
            </div>

            <div className="w-7 h-7 rounded-full bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>

            <div className="flex-1 text-right">
              <span className="text-[10px] text-slate-400 block">To</span>
              <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">
                {newTimezoneId.split('/').pop()?.replace(/_/g, ' ')}
              </p>
              <p className="text-[10px] text-slate-500">{formatTimezoneDisplay(newTimezoneId)}</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
            You moved to a new timezone. Choose how your existing alarms should respond to this change.
          </p>
        </div>

        {/* Global Action Presets */}
        {mode === 'summary' && (
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 px-1">
              Recommended Actions
            </h3>

            {/* Option 1: Keep all at local time */}
            <div
              onClick={handleKeepAllLocal}
              className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                isDarkTheme
                  ? 'bg-slate-900 border-slate-800 hover:border-indigo-500'
                  : 'bg-white border-slate-200 hover:border-indigo-400 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Keep all alarms at Local Time
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    All alarms (e.g. 7:00 AM wake-up) will ring at 7:00 AM in your new timezone.
                  </p>
                </div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Select
                </span>
              </div>
            </div>

            {/* Option 2: Keep original timezone */}
            <div
              onClick={handleKeepOriginalTimezones}
              className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${
                isDarkTheme
                  ? 'bg-slate-900 border-slate-800 hover:border-indigo-500'
                  : 'bg-white border-slate-200 hover:border-indigo-400 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Globe2 className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Follow Original Timezone for affected alarms
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Preserve international meeting times (e.g. 8:00 AM IST becomes 6:30 AM in Dubai).
                  </p>
                </div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Select
                </span>
              </div>
            </div>

            {/* Option 3: Review individually */}
            <button
              type="button"
              onClick={() => setMode('individual')}
              className={`w-full p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isDarkTheme
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span>Review & Configure Individually ({affectedAlarms.length} alarms)</span>
            </button>
          </div>
        )}

        {/* Individual Alarms List */}
        {mode === 'individual' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Affected Alarms ({affectedAlarms.length})
              </h3>
              <button
                type="button"
                onClick={() => setMode('summary')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
              >
                ← Back to presets
              </button>
            </div>

            {affectedAlarms.map((item) => {
              const currentChoice = alarmChoices[item.alarmId] || item.behavior;

              return (
                <div
                  key={item.alarmId}
                  className={`p-4 rounded-2xl border space-y-3 transition-colors ${
                    isDarkTheme
                      ? 'bg-slate-900/90 border-slate-800 text-slate-100'
                      : 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold">{item.alarmName}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Original: {item.formattedOriginalTime}
                      </p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        currentChoice === 'LOCAL_TIME'
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                          : currentChoice === 'ORIGINAL_TIMEZONE'
                          ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800'
                          : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {currentChoice.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Calculated new time badge */}
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 text-xs flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                      New Local Time:
                    </span>
                    <strong className="text-indigo-600 dark:text-indigo-400 font-semibold text-[11px]">
                      {currentChoice === 'LOCAL_TIME'
                        ? `${formatAlarmTime(item.originalHour, item.originalMinute).fullStr} ${newTimezoneId.split('/').pop()}`
                        : item.formattedNewTime}
                    </strong>
                  </div>

                  {/* 3-Button Choice Selector */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setSingleAlarmChoice(item.alarmId, 'LOCAL_TIME')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                        currentChoice === 'LOCAL_TIME'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : isDarkTheme
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Local Time
                    </button>

                    <button
                      type="button"
                      onClick={() => setSingleAlarmChoice(item.alarmId, 'ORIGINAL_TIMEZONE')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                        currentChoice === 'ORIGINAL_TIMEZONE'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : isDarkTheme
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Original Timezone
                    </button>

                    <button
                      type="button"
                      onClick={() => setSingleAlarmChoice(item.alarmId, 'DISABLED')}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer ${
                        currentChoice === 'DISABLED'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                          : isDarkTheme
                          ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Disable
                    </button>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              onClick={handleApplyCustomChoices}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Apply Individual Choices
            </button>
          </div>
        )}

        {/* Safety Note & Do Nothing */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium underline cursor-pointer"
          >
            Do nothing (leave alarms as-is and review later)
          </button>
        </div>
      </div>
    </div>
  );
};
