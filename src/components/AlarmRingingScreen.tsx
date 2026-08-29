import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Volume2, Moon, X } from 'lucide-react';
import { Alarm } from '../types/alarm';
import { soundEngine } from '../utils/alarmScheduler';

interface AlarmRingingScreenProps {
  alarm: Alarm;
  onDismiss: () => void;
  onSnooze: () => void;
}

export const AlarmRingingScreen: React.FC<AlarmRingingScreenProps> = ({
  alarm,
  onDismiss,
  onSnooze,
}) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Start continuous audio playback
    soundEngine.startAlarm(alarm.soundSelection, alarm.isVibrationEnabled);

    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
      soundEngine.stop();
    };
  }, [alarm]);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const pad = (n: number) => n.toString().padStart(2, '0');

  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const amPm = hours >= 12 ? 'PM' : 'AM';

  return (
    <div
      id="alarm-ringing-fullscreen"
      className="absolute inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6 overflow-hidden select-none"
    >
      {/* Background Animated Sound Pulse Waves */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-25">
        <motion.div
          animate={{ scale: [1, 1.8, 2.4], opacity: [0.5, 0.15, 0] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: 'easeOut' }}
          className="absolute w-72 h-72 rounded-full border border-indigo-400 bg-indigo-600/10"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 2.0], opacity: [0.6, 0.2, 0] }}
          transition={{ repeat: Infinity, duration: 2.6, delay: 0.9, ease: 'easeOut' }}
          className="absolute w-56 h-56 rounded-full border border-indigo-400/60 bg-indigo-500/10"
        />
      </div>

      {/* Top Header */}
      <div className="relative z-10 flex flex-col items-center pt-8 text-center">
        <motion.div
          animate={{ rotate: [-6, 6, -6] }}
          transition={{ repeat: Infinity, duration: 0.6, ease: 'easeInOut' }}
          className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-600/20 mb-4"
        >
          <Bell className="w-8 h-8 text-indigo-400 fill-indigo-400/40" />
        </motion.div>

        <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60 flex items-center gap-1.5">
          <Volume2 className="w-3.5 h-3.5 animate-pulse" />
          Ringing Now
        </span>

        <h1 className="text-2xl font-semibold mt-3 text-white max-w-[280px] truncate">
          {alarm.name || 'Alarm'}
        </h1>
      </div>

      {/* Big Digital Clock */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="flex items-baseline space-x-2">
          <span className="text-7xl font-light tracking-tighter text-white drop-shadow-sm">
            {pad(displayHour)}:{pad(minutes)}
          </span>
          <div className="flex flex-col">
            <span className="text-xl font-medium text-indigo-400">{amPm}</span>
            <span className="text-xs text-slate-500 font-mono">{pad(seconds)}s</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-2 font-medium">
          {time.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </p>

        {alarm.isSnoozeEnabled && (
          <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-800/40">
            <Moon className="w-3 h-3" />
            Snooze preset: {alarm.snoozeDurationMinutes} minutes
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="relative z-10 pb-8 flex flex-col items-center gap-4">
        <div className="flex items-center justify-center gap-4 w-full max-w-xs">
          {/* Snooze Button */}
          {alarm.isSnoozeEnabled && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={onSnooze}
              id="btn-alarm-snooze"
              className="flex-1 py-4 px-4 rounded-3xl bg-slate-900 hover:bg-slate-800 active:bg-slate-900 text-slate-200 font-semibold border border-slate-800 shadow-lg flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <Moon className="w-5 h-5 text-amber-400" />
              <span className="text-sm">Snooze</span>
              <span className="text-[10px] text-slate-500 font-normal">+{alarm.snoozeDurationMinutes}m</span>
            </motion.button>
          )}

          {/* Dismiss Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onClick={onDismiss}
            id="btn-alarm-dismiss"
            className="flex-1 py-4 px-4 rounded-3xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold shadow-xl shadow-rose-950/40 border border-rose-500/30 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
            <span className="text-sm">Dismiss</span>
            <span className="text-[10px] text-rose-200/80 font-normal">Stop audio</span>
          </motion.button>
        </div>

        <p className="text-[11px] text-slate-500">
          Audio will continue looping until dismissed or snoozed
        </p>
      </div>
    </div>
  );
};
