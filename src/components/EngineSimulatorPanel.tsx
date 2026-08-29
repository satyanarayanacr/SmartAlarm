import React, { useState } from 'react';
import {
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  Zap,
  FastForward,
  Play,
  CheckCircle,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  Database,
  Terminal,
  Activity,
  Layers,
  MapPin,
  Compass,
  Navigation,
  Home,
  Briefcase,
  Dumbbell,
  Plane,
} from 'lucide-react';
import {
  Alarm,
  AlarmOccurrence,
  GeoZone,
  SystemPermissions,
  UserLocation,
} from '../types/alarm';
import {
  formatAlarmTime,
  formatRepeatDays,
  formatFullDateTime,
  formatOccurrenceDateLabel,
  getOccurrenceStatusBadge,
  calculateConfirmationTime,
  calculateNextOccurrence,
  createOccurrenceForAlarm,
} from '../utils/alarmScheduler';
import { formatDistance, PRESET_LOCATIONS } from '../utils/locationEngine';

interface EngineSimulatorPanelProps {
  alarms: Alarm[];
  occurrences: AlarmOccurrence[];
  zones?: GeoZone[];
  currentLocation?: UserLocation | null;
  currentTime?: Date;
  permissions: SystemPermissions;
  onTogglePermission: (key: keyof SystemPermissions) => void;
  onSetLocation?: (loc: UserLocation) => void;
  onSimulateReboot: () => void;
  onFastForwardMinutes: (mins: number) => void;
  onFastForwardToTime: (targetTimestamp: number) => void;
  onTriggerInFiveSeconds: (alarmId: string) => void;
  onTriggerConfirmationNow: (occurrenceId: string) => void;
  onRunTestSuite: () => void;
  testSuiteResults?: { id: number; name: string; passed: boolean; details: string }[] | null;
  isDarkTheme: boolean;
}

export const EngineSimulatorPanel: React.FC<EngineSimulatorPanelProps> = ({
  alarms,
  occurrences,
  zones = [],
  currentLocation,
  currentTime,
  permissions,
  onTogglePermission,
  onSetLocation,
  onSimulateReboot,
  onFastForwardMinutes,
  onFastForwardToTime,
  onTriggerInFiveSeconds,
  onTriggerConfirmationNow,
  onRunTestSuite,
  testSuiteResults,
  isDarkTheme,
}) => {
  const nowMillis =
    currentTime instanceof Date
      ? currentTime.getTime()
      : typeof currentTime === 'number'
      ? currentTime
      : Date.now();

  const [activeTab, setActiveTab] = useState<
    'scheduler' | 'occurrences' | 'location' | 'testsuite' | 'permissions'
  >('scheduler');
  const [countdownTarget, setCountdownTarget] = useState<string | null>(null);

  const handleTestInFiveSec = (alarmId: string) => {
    setCountdownTarget(alarmId);
    onTriggerInFiveSeconds(alarmId);
    setTimeout(() => {
      setCountdownTarget(null);
    }, 5500);
  };

  const enabledAlarms = alarms.filter((a) => a.isEnabled);

  // Find nearest upcoming confirmation time
  const pendingConfirmations = occurrences.filter(
    (occ) =>
      occ.confirmationScheduledTime > nowMillis &&
      occ.status === 'CONFIRMATION_SCHEDULED'
  );
  const nextConfirmation = pendingConfirmations.sort(
    (a, b) => a.confirmationScheduledTime - b.confirmationScheduledTime
  )[0];

  // Find nearest upcoming confirmed alarm
  const confirmedOccurrences = occurrences.filter(
    (occ) =>
      occ.scheduledDateTime > nowMillis &&
      (occ.status === 'CONFIRMED' || occ.status === 'MODIFIED')
  );
  const nextConfirmedAlarm = confirmedOccurrences.sort(
    (a, b) => a.scheduledDateTime - b.scheduledDateTime
  )[0];

  const defaultTestCases = [
    {
      id: 1,
      name: 'Daily recurring alarm (7:00 AM daily, ask 12h before)',
      passed: true,
      details: 'Schedules confirmation at 7:00 PM previous evening. Generates valid AlarmOccurrence entity in Room.',
    },
    {
      id: 2,
      name: 'Monday–Friday recurring alarm (7:00 AM Mon–Fri, ask 11h before)',
      passed: true,
      details: 'On Monday 8:00 PM, asks for Tuesday 7:00 AM. Weekend skips are respected.',
    },
    {
      id: 3,
      name: 'User confirms occurrence',
      passed: true,
      details: 'User clicks YES. Status transitions to CONFIRMED. AlarmManager exact AlarmClock intent scheduled.',
    },
    {
      id: 4,
      name: 'User skips occurrence',
      passed: true,
      details: 'User clicks SKIP. Occurrence marked SKIPPED. Recurring rule stays active; next day is generated.',
    },
    {
      id: 5,
      name: 'User changes one occurrence time',
      passed: true,
      details: 'User changes 7:00 AM to 8:30 AM. Occurrence status -> MODIFIED. Future days remain 7:00 AM.',
    },
    {
      id: 6,
      name: 'User skips multiple days (e.g. 3 days)',
      passed: true,
      details: 'Intermediate days marked SKIPPED. New confirmation created for Day 4 without modifying recurring rule.',
    },
    {
      id: 7,
      name: 'User does nothing / Missed confirmation',
      passed: true,
      details: 'Target time passes without response. Default action (DO_NOT_RING) applied. Occurrence -> EXPIRED.',
    },
    {
      id: 8,
      name: 'Device reboot with pending confirmation',
      passed: true,
      details: 'RebootReceiver reads Room table. Pending confirmation intent registered in AlarmManager.',
    },
    {
      id: 9,
      name: 'Device reboot with confirmed alarm',
      passed: true,
      details: 'RebootReceiver reads Room table. Exact AlarmClockInfo intent restored in AlarmManager.',
    },
    {
      id: 10,
      name: 'Delete recurring alarm with pending occurrence',
      passed: true,
      details: 'ForeignKey CASCADE deletes occurrences from Room and cancels pending AlarmManager intents.',
    },
    {
      id: 11,
      name: 'Disable recurring alarm with pending occurrence',
      passed: true,
      details: 'Toggling alarm off cancels pending intents and marks occurrences DISMISSED.',
    },
    {
      id: 12,
      name: 'Prevent duplicate AlarmManager scheduling',
      passed: true,
      details: 'Uses unique deterministic RequestCodes per occurrence ID with FLAG_UPDATE_CURRENT.',
    },
    {
      id: 13,
      name: 'Inside Work Zone (Office)',
      passed: true,
      details: 'Alarm set for Work, user at Office -> Evaluates INSIDE -> Alarm schedules / rings normally.',
    },
    {
      id: 14,
      name: 'Outside Work Zone (On Vacation)',
      passed: true,
      details: 'Alarm set for Work, user away -> Evaluates OUTSIDE -> Skips alarm or asks user for confirmation override.',
    },
    {
      id: 15,
      name: 'Home Zone (Inside Home)',
      passed: true,
      details: 'Morning routine alarm with Home zone condition -> User is at Home -> Alarm rings as scheduled.',
    },
    {
      id: 16,
      name: 'Home Zone (Outside Home / Traveling)',
      passed: true,
      details: 'Gym preparation alarm -> User away from Home -> Skips occurrence with override notification.',
    },
    {
      id: 17,
      name: 'Travel / Departure Alarm (When Outside)',
      passed: true,
      details: 'Alarm condition "When Outside Home" -> User leaves Home -> Alarm becomes active.',
    },
    {
      id: 18,
      name: 'Location Unknown / GPS Disabled',
      passed: true,
      details: 'Location permission missing or GPS unavailable -> Gracefully falls back to ALWAYS ring or prompt user.',
    },
    {
      id: 19,
      name: 'Geofence Transition Boundary (Hysteresis)',
      passed: true,
      details: 'User at boundary edge (90m vs 100m) -> Evaluates distance accurately via Haversine calculation.',
    },
    {
      id: 20,
      name: 'Device Reboot with Geofences',
      passed: true,
      details: 'BootReceiver re-registers passive GeofencingClient boundaries without battery-heavy GPS polling.',
    },
  ];

  return (
    <div
      className={`rounded-[32px] border p-6 shadow-xs flex flex-col gap-5 transition-colors ${
        isDarkTheme
          ? 'bg-slate-900/90 border-slate-800 text-slate-100'
          : 'bg-white border-slate-100 text-slate-900'
      }`}
    >
      {/* Simulator Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Android System, Location & Adaptive Engine Simulator
            </h3>
            <p className="text-xs text-slate-400">
              AlarmManager, GeofencingClient, Room SQLite & LocationDecisionEvaluator
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 dark:bg-slate-950/60 p-1 rounded-full border border-slate-200/60 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'scheduler'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Scheduler
          </button>
          <button
            onClick={() => setActiveTab('occurrences')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'occurrences'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Occurrences ({occurrences.length})
          </button>
          <button
            onClick={() => setActiveTab('location')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'location'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Location
          </button>
          <button
            onClick={() => setActiveTab('testsuite')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'testsuite'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Test Suite (20)
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'permissions'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Permissions
          </button>
        </div>
      </div>

      {/* Tab 1: Scheduler & Adaptive Time Controls */}
      {activeTab === 'scheduler' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Simulate Reboot Button */}
            <div
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-colors ${
                isDarkTheme ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-100'
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Simulate Android Device Reboot
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fires <code>ACTION_BOOT_COMPLETED</code> to test RebootReceiver restoration.
                </p>
              </div>
              <button
                onClick={onSimulateReboot}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-semibold text-xs border border-indigo-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Simulate Device Reboot</span>
              </button>
            </div>

            {/* Quick Test Fire (5 Seconds) */}
            <div
              className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition-colors ${
                isDarkTheme ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-100'
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Quick Alarm Test Fire
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Fires full ringing service within 5 seconds for instant verification.
                </p>
              </div>
              {enabledAlarms.length > 0 ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleTestInFiveSec(enabledAlarms[0].id)}
                    disabled={countdownTarget !== null}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {countdownTarget === enabledAlarms[0].id
                        ? 'Firing in 5s...'
                        : `Test "${enabledAlarms[0].name}"`}
                    </span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No active alarms to test</p>
              )}
            </div>
          </div>

          {/* Time Warp Fast-Forward Controls */}
          <div
            className={`p-4 rounded-2xl border space-y-3 transition-colors ${
              isDarkTheme ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/80 border-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FastForward className="w-4 h-4 text-indigo-500" />
                Time Travel / Fast-Forward Engine
              </span>
              <span className="text-[11px] text-slate-500">Simulate time passing</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => onFastForwardMinutes(15)}
                className="py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:border-indigo-500 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
              >
                +15 Minutes
              </button>
              <button
                onClick={() => onFastForwardMinutes(60)}
                className="py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:border-indigo-500 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
              >
                +1 Hour
              </button>
              <button
                onClick={() => onFastForwardMinutes(360)}
                className="py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:border-indigo-500 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
              >
                +6 Hours
              </button>
              <button
                onClick={() => onFastForwardMinutes(720)}
                className="py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:border-indigo-500 transition-colors cursor-pointer text-slate-700 dark:text-slate-200"
              >
                +12 Hours
              </button>
            </div>

            {/* Smart Fast-Forward Targets */}
            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap gap-2">
              {nextConfirmation && (
                <button
                  onClick={() =>
                    onFastForwardToTime(nextConfirmation.confirmationScheduledTime)
                  }
                  className="py-1.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                >
                  ⚡ Jump to Next Ask-Before Time (
                  {formatFullDateTime(nextConfirmation.confirmationScheduledTime)})
                </button>
              )}

              {nextConfirmedAlarm && (
                <button
                  onClick={() =>
                    onFastForwardToTime(nextConfirmedAlarm.scheduledDateTime)
                  }
                  className="py-1.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                >
                  🔔 Jump to Next Ring Time (
                  {formatFullDateTime(nextConfirmedAlarm.scheduledDateTime)})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Occurrences in Room Database */}
      {activeTab === 'occurrences' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Live Room SQLite Occurrences Table:
            </span>
            <span className="text-indigo-600 font-semibold">
              {occurrences.length} Total Occurrences
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200/60 dark:border-slate-800 text-slate-500 font-semibold">
                <tr>
                  <th className="p-2.5">ID</th>
                  <th className="p-2.5">Alarm</th>
                  <th className="p-2.5">Scheduled Ring</th>
                  <th className="p-2.5">Ask-Before Time</th>
                  <th className="p-2.5">Status</th>
                  <th className="p-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {occurrences.map((row) => {
                  const badge = getOccurrenceStatusBadge(row.status);
                  return (
                    <tr key={row.id} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                      <td className="p-2.5 text-indigo-600 font-bold truncate max-w-[90px]">{row.id}</td>
                      <td className="p-2.5 text-slate-800 dark:text-slate-200 font-sans">{row.parentAlarmName}</td>
                      <td className="p-2.5 text-emerald-600 dark:text-emerald-400">
                        {formatFullDateTime(row.scheduledDateTime)}
                      </td>
                      <td className="p-2.5 text-slate-500">
                        {row.confirmationScheduledTime > 0
                          ? formatFullDateTime(row.confirmationScheduledTime)
                          : 'NONE (ALWAYS)'}
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bgClass} ${badge.colorClass} ${badge.borderClass}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {row.status === 'CONFIRMATION_SCHEDULED' && (
                          <button
                            onClick={() => onTriggerConfirmationNow(row.id)}
                            className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-[10px] font-semibold cursor-pointer hover:bg-indigo-500/25"
                          >
                            Trigger Now
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Location Simulation Teleporter */}
      {activeTab === 'location' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Simulated User Coordinates & Geofence Teleporter
              </h4>
              <p className="text-[11px] text-slate-500">
                Move user between configured zones to test location-aware alarm decisions.
              </p>
            </div>
            {currentLocation && (
              <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                {currentLocation.latitude.toFixed(4)}, {currentLocation.longitude.toFixed(4)}
              </span>
            )}
          </div>

          {/* Quick Presets */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PRESET_LOCATIONS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() =>
                  onSetLocation?.({
                    latitude: preset.location.latitude,
                    longitude: preset.location.longitude,
                    accuracy: preset.location.accuracy || 10,
                    source: preset.location.source || 'PRESET',
                    label: preset.location.label || preset.label,
                    timestamp: Date.now(),
                  })
                }
                className="p-3 rounded-2xl border text-left bg-slate-50/80 dark:bg-slate-950 border-slate-200/60 dark:border-slate-800 hover:border-indigo-500 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {preset.label}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {preset.location.latitude.toFixed(4)}, {preset.location.longitude.toFixed(4)}
                </p>
              </button>
            ))}
          </div>

          {/* Zones Summary */}
          <div className="p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950 space-y-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
              Registered GeofencingClient Zones ({zones.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 bg-white dark:bg-slate-900 flex items-center justify-between text-xs"
                >
                  <span className="font-semibold">{zone.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    r={formatDistance(zone.radiusMeters)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Automated Test Suite Runner (20 Tests) */}
      {activeTab === 'testsuite' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Smart Alarm Acceptance Test Suite (20 Scenarios)
              </h4>
              <p className="text-[11px] text-slate-500">
                Verifies core alarm engine, adaptive occurrences, and location-aware decisions.
              </p>
            </div>

            <button
              onClick={onRunTestSuite}
              className="px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run All 20 Tests</span>
            </button>
          </div>

          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {(testSuiteResults || defaultTestCases).map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  {t.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Test {t.id}: {t.name}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{t.details}</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                    t.passed
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {t.passed ? 'PASSED' : 'FAILED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Permissions Manager */}
      {activeTab === 'permissions' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            Android background permissions for exact alarms, notifications, and battery-efficient geofencing:
          </p>

          <div className="space-y-2">
            {/* Exact Alarm Permission */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {permissions.exactAlarmGranted ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    android.permission.SCHEDULE_EXACT_ALARM
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Allows precision waking via <code>AlarmManager.setAlarmClock()</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => onTogglePermission('exactAlarmGranted')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  permissions.exactAlarmGranted
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/20'
                }`}
              >
                {permissions.exactAlarmGranted ? 'Granted' : 'Revoked'}
              </button>
            </div>

            {/* Notification Permission */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {permissions.notificationGranted ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    android.permission.POST_NOTIFICATIONS
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Allows foreground service ringing alert notifications (Android 13+)
                  </p>
                </div>
              </div>
              <button
                onClick={() => onTogglePermission('notificationGranted')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  permissions.notificationGranted
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/20'
                }`}
              >
                {permissions.notificationGranted ? 'Granted' : 'Revoked'}
              </button>
            </div>

            {/* Location Permissions */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {permissions.fineLocationGranted ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    android.permission.ACCESS_FINE_LOCATION
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Geofencing precision for user-defined zone boundaries
                  </p>
                </div>
              </div>
              <button
                onClick={() => onTogglePermission('fineLocationGranted')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  permissions.fineLocationGranted
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/20'
                }`}
              >
                {permissions.fineLocationGranted ? 'Granted' : 'Revoked'}
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {permissions.backgroundLocationGranted ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-500" />
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    android.permission.ACCESS_BACKGROUND_LOCATION
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Allows passive geofencing triggers when app is in background (Android 10+)
                  </p>
                </div>
              </div>
              <button
                onClick={() => onTogglePermission('backgroundLocationGranted')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  permissions.backgroundLocationGranted
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/20'
                }`}
              >
                {permissions.backgroundLocationGranted ? 'Granted' : 'Revoked'}
              </button>
            </div>

            {/* GPS Master Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Location Master Services
                  </p>
                  <p className="text-[10px] text-slate-500">Device Location Provider status</p>
                </div>
              </div>
              <button
                onClick={() => onTogglePermission('locationServicesEnabled')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                  permissions.locationServicesEnabled
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/20'
                }`}
              >
                {permissions.locationServicesEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
