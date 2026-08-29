import React from 'react';
import { Wifi, BatteryMedium, Bell, Clock, Sun, Moon } from 'lucide-react';

interface AndroidFrameProps {
  children: React.ReactNode;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  hasActiveAlarms: boolean;
  currentTime: Date;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({
  children,
  isDarkTheme,
  onToggleTheme,
  hasActiveAlarms,
  currentTime,
}) => {
  const formatStatusTime = (date?: Date) => {
    const d = date instanceof Date ? date : new Date();
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div
      id="android-device-frame"
      className={`relative mx-auto w-full max-w-[430px] h-[860px] rounded-[48px] p-3 shadow-2xl border transition-all duration-300 flex flex-col ${
        isDarkTheme
          ? 'bg-slate-900 border-slate-800 shadow-slate-950/80 text-slate-100'
          : 'bg-slate-200/90 border-slate-300/80 shadow-2xl shadow-slate-300/50 text-slate-900'
      }`}
    >
      {/* Outer bezel rim */}
      <div
        className={`w-full h-full rounded-[40px] overflow-hidden flex flex-col relative border ${
          isDarkTheme ? 'bg-slate-950 border-slate-800/80' : 'bg-[#f7f9fc] border-slate-200/60'
        }`}
      >
        {/* Status Bar */}
        <div
          id="android-status-bar"
          className={`h-9 px-7 flex items-center justify-between z-30 select-none text-xs font-medium ${
            isDarkTheme ? 'text-slate-400 bg-slate-950' : 'text-slate-500 bg-[#f7f9fc]'
          }`}
        >
          {/* Time & Alarm indicator */}
          <div className="flex items-center space-x-2">
            <span className="font-medium tracking-tight">{formatStatusTime(currentTime)}</span>
            {hasActiveAlarms && (
              <span className="flex items-center text-indigo-600" title="Active Alarm Scheduled">
                <Bell className="w-3 h-3 fill-current animate-pulse" />
              </span>
            )}
          </div>

          {/* Center punch-hole camera */}
          <div className="w-3.5 h-3.5 rounded-full bg-slate-900 ring-2 ring-slate-800/40 shadow-inner flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-indigo-950/80" />
          </div>

          {/* System Icons & Theme toggle */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={onToggleTheme}
              className="p-1 rounded-full hover:bg-slate-500/10 active:scale-95 transition-transform cursor-pointer"
              title={isDarkTheme ? 'Switch to Light Theme (Clean Minimalism)' : 'Switch to Dark Theme'}
              aria-label="Toggle Theme"
            >
              {isDarkTheme ? (
                <Sun className="w-3 h-3 text-amber-400" />
              ) : (
                <Moon className="w-3 h-3 text-slate-600" />
              )}
            </button>
            <Wifi className="w-3.5 h-3.5" />
            <div className="w-4 h-2.5 border border-current rounded-xs relative after:content-[''] after:absolute after:top-0.5 after:-right-1 after:w-0.5 after:h-1.5 after:bg-current">
              <div className="h-full bg-current w-3/4 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Inner Content Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col">{children}</div>

        {/* Navigation Bar Pill */}
        <div
          id="android-nav-bar"
          className={`h-6 w-full flex items-center justify-center z-30 ${
            isDarkTheme ? 'bg-slate-950' : 'bg-[#f7f9fc]'
          }`}
        >
          <div
            className={`w-32 h-1.5 rounded-full transition-colors ${
              isDarkTheme ? 'bg-slate-700' : 'bg-slate-300'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
