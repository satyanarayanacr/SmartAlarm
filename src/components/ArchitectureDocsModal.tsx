import React from 'react';
import { motion } from 'motion/react';
import { X, Layers } from 'lucide-react';

interface ArchitectureDocsModalProps {
  onClose: () => void;
}

export const ArchitectureDocsModal: React.FC<ArchitectureDocsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-3xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl flex flex-col text-slate-100"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Smart Alarm: Architecture & Design</h2>
              <p className="text-xs text-slate-400">
                Core foundation for Kotlin, Jetpack Compose, Room & AlarmManager
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                1
              </span>
              Project Architecture (MVVM & Clean Architecture)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The system strictly enforces separation of concerns across clean boundaries:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs text-slate-400">
              <li>
                <strong className="text-slate-200">UI Layer:</strong> 100% Jetpack Compose with Material 3 design tokens, unidirectional data flow (UDF), and dynamic color schemes.
              </li>
              <li>
                <strong className="text-slate-200">ViewModel Layer:</strong> <code>AlarmViewModel</code> and <code>CreateEditAlarmViewModel</code> expose immutable <code>StateFlow&lt;AlarmUiState&gt;</code> to Compose.
              </li>
              <li>
                <strong className="text-slate-200">Repository Layer:</strong> <code>AlarmRepository</code> serves as the single source of truth, synchronizing Room database state with the OS scheduler.
              </li>
              <li>
                <strong className="text-slate-200">Scheduler Component:</strong> <code>AlarmScheduler</code> interface abstracts the underlying Android <code>AlarmManager</code>, decoupling UI from system APIs.
              </li>
              <li>
                <strong className="text-slate-200">BroadcastReceivers & Service:</strong> <code>AlarmReceiver</code> wakes the device via <code>WakeLock</code> and launches the full-screen ringing activity, while <code>AlarmService</code> manages continuous foreground audio.
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                2
              </span>
              Main Data Models & Room Schema
            </h3>
            <p className="text-xs text-slate-400">
              The <code>Alarm</code> entity stores all user configurations and execution state:
            </p>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-slate-300">
              <span className="text-indigo-400">@Entity</span>(tableName = "alarms")<br />
              <span className="text-purple-400">data class</span> <span className="text-emerald-400">Alarm</span>(<br />
              &nbsp;&nbsp;id: Long = 0, name: String, hour: Int, minute: Int,<br />
              &nbsp;&nbsp;isEnabled: Boolean, repeatType: RepeatType, daysOfWeek: Set&lt;Int&gt;,<br />
              &nbsp;&nbsp;soundSelection: String, isVibrationEnabled: Boolean, isSnoozeEnabled: Boolean,<br />
              &nbsp;&nbsp;snoozeDurationMinutes: Int, nextTriggerMillis: Long, isSkippedNext: Boolean,<br />
              &nbsp;&nbsp;createdTimestamp: Long, updatedTimestamp: Long<br />
              )
            </div>
          </div>

          {/* Section 3 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                3
              </span>
              Alarm Scheduling Strategy (AlarmManager.setAlarmClock)
            </h3>
            <p className="text-xs text-slate-400">
              We utilize <code>AlarmManager.setAlarmClock()</code> rather than imprecise repeat methods:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-slate-400">
              <li>
                <strong className="text-slate-200">Guaranteed Doze Bypass:</strong> Automatically wakes the device from low-power Doze and App Standby modes.
              </li>
              <li>
                <strong className="text-slate-200">Status Bar Integration:</strong> The OS renders the official alarm clock icon and displays the next trigger in Quick Settings and lockscreens.
              </li>
              <li>
                <strong className="text-slate-200">Permission Compliance:</strong> Handles <code>SCHEDULE_EXACT_ALARM</code> and <code>USE_EXACT_ALARM</code> on Android 12 through Android 14+.
              </li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                4
              </span>
              Repeating Alarms: Dynamic Cycle Calculation
            </h3>
            <p className="text-xs text-slate-400">
              Instead of rigid, OS-level periodic scheduling, <code>AlarmUtils.calculateNextOccurrence()</code> calculates the exact next timestamp based on selected days (1=Mon to 7=Sun).
            </p>
            <p className="text-xs text-slate-400">
              When an occurrence triggers and is dismissed, the repository calculates the subsequent day in the schedule and registers a fresh single exact alarm. This architecture prevents drift, supports arbitrary day combinations, and allows individual day skipping without disabling the schedule.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                5
              </span>
              Persistence & Reboot Recovery
            </h3>
            <p className="text-xs text-slate-400">
              Android clears <code>AlarmManager</code> queues when a device powers down. Our <code>RebootReceiver</code> registers for <code>ACTION_BOOT_COMPLETED</code> and <code>ACTION_MY_PACKAGE_REPLACED</code>:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-xs text-slate-400">
              <li>Uses <code>goAsync()</code> and coroutines on <code>Dispatchers.IO</code>.</li>
              <li>Queries Room for all alarms where <code>isEnabled == true</code>.</li>
              <li>Re-schedules all active alarms with the OS <code>AlarmManager</code> seamlessly.</li>
            </ul>
          </div>

          {/* Section 6 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                6
              </span>
              Future-Proofing for Intelligent Context Engine
            </h3>
            <p className="text-xs text-slate-400">
              The architecture is explicitly crafted to support upcoming assistant features:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <p className="font-semibold text-indigo-400 mb-1">Single Occurrence Skip Token</p>
                <p className="text-slate-400">
                  The <code>isSkippedNext</code> flag in <code>Alarm</code> and <code>calculateNextOccurrence()</code> allows an AI assistant to suggest skipping tomorrow's alarm without deleting or disabling the weekly schedule.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs">
                <p className="font-semibold text-indigo-400 mb-1">Context Pre-Scheduling Middleware</p>
                <p className="text-slate-400">
                  The standalone <code>AlarmScheduler</code> and <code>AlarmRepository</code> interfaces allow injecting calendar, weather, or location checks before committing triggers to the system.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            Close Documentation
          </button>
        </div>
      </motion.div>
    </div>
  );
};
