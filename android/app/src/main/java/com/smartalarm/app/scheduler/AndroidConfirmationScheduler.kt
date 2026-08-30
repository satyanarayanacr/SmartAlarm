package com.smartalarm.app.scheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import com.smartalarm.app.receiver.ConfirmationReceiver

/**
 * Real AlarmManager-backed implementation of [ConfirmationScheduler].
 * Schedules per-occurrence confirmation alarms using distinct PendingIntents (action + data uri + request code).
 */
class AndroidConfirmationScheduler(private val context: Context) : ConfirmationScheduler {

    private val alarmManager: AlarmManager
        get() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private fun canScheduleExactAlarms(): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else {
            true
        }

    override fun scheduleExact(occurrenceId: Long, triggerAtMillis: Long) {
        if (!canScheduleExactAlarms()) {
            return
        }
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerAtMillis,
            pendingIntent(occurrenceId)
        )
    }

    override fun cancel(occurrenceId: Long) {
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCodeFor(occurrenceId),
            intent(occurrenceId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE,
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    override fun cancelAll() {
        cancel(0L)
    }

    private fun intent(occurrenceId: Long): Intent =
        Intent(context, ConfirmationReceiver::class.java).apply {
            action = ConfirmationReceiver.ACTION_DAILY_CONFIRMATION
            data = Uri.parse("smartalarm://confirmation/$occurrenceId")
            putExtra(ConfirmationReceiver.EXTRA_OCCURRENCE_ID, occurrenceId)
        }

    private fun pendingIntent(occurrenceId: Long): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            requestCodeFor(occurrenceId),
            intent(occurrenceId),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private fun requestCodeFor(occurrenceId: Long): Int =
        (occurrenceId.toInt() * 37) + 1000
}

