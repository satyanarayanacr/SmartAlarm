package com.smartalarm.app.scheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.receiver.AlarmReceiver

/**
 * Real AlarmManager-backed implementation of [AlarmScheduler]. This is the only class in Phase 1
 * that calls into `android.app.AlarmManager` directly.
 *
 * Duplicate-prevention: every PendingIntent is built with the *same* action, data Uri, and
 * request code for a given `occurrenceId` every time (see [pendingIntentFor]), combined with
 * `FLAG_UPDATE_CURRENT`. That means calling [scheduleExact] twice for the same occurrence (e.g.
 * the user edits the alarm again before it fires) updates the existing system alarm in place
 * instead of creating a second one, and [cancel] is guaranteed to match whatever [scheduleExact]
 * most recently registered for that occurrence.
 */
class AndroidAlarmScheduler(private val context: Context) : AlarmScheduler {

    private val alarmManager: AlarmManager
        get() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    override fun canScheduleExactAlarms(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else {
            // Below API 31, SCHEDULE_EXACT_ALARM did not exist as a user-toggled permission -
            // exact alarms were always allowed for a normal-permission-holding app.
            true
        }
    }

    override fun scheduleExact(occurrenceId: Long, alarm: Alarm, triggerAtMillis: Long) {
        val pendingIntent = pendingIntentFor(occurrenceId, alarm)

        if (!canScheduleExactAlarms()) {
            // Caller (the UseCase) is expected to have already surfaced the permission request
            // to the user via MainActivity; we still fail safe here rather than silently no-op,
            // by NOT scheduling anything the OS would immediately reject. The occurrence row
            // stays in Room so it can be rescheduled once permission is granted.
            return
        }

        // setExactAndAllowWhileIdle: fires at the exact time even during Doze, which is required
        // for a real alarm-clock app. This is the API the Phase 1 spec explicitly calls for
        // (rather than the setAlarmClock() convenience API) so exact-alarm permission handling
        // is real and testable.
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerAtMillis,
            pendingIntent,
        )
    }

    override fun cancel(occurrenceId: Long) {
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCodeFor(occurrenceId),
            intentFor(occurrenceId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE,
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    private fun intentFor(occurrenceId: Long): Intent =
        Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_ALARM_FIRED
            data = android.net.Uri.parse("smartalarm://occurrence/$occurrenceId")
            putExtra(AlarmReceiver.EXTRA_OCCURRENCE_ID, occurrenceId)
        }

    private fun pendingIntentFor(occurrenceId: Long, alarm: Alarm): PendingIntent {
        val intent = intentFor(occurrenceId).apply {
            putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarm.id)
        }
        return PendingIntent.getBroadcast(
            context,
            requestCodeFor(occurrenceId),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    /**
     * Stable, deterministic request code derived from the occurrence's Room primary key so the
     * same occurrence always maps to the same PendingIntent identity (required for both
     * idempotent re-scheduling and reliable cancellation). Room ids are assigned sequentially
     * starting at 1, so truncation to Int is safe well beyond any realistic number of alarms.
     */
    private fun requestCodeFor(occurrenceId: Long): Int = occurrenceId.toInt()
}
