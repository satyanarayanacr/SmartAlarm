package com.smartalarm.app.scheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.smartalarm.app.receiver.ConfirmationReceiver

/**
 * Real AlarmManager-backed implementation of [ConfirmationScheduler]. Mirrors
 * [AndroidAlarmScheduler]'s duplicate-prevention approach (same action/request code every time,
 * `FLAG_UPDATE_CURRENT`) but for a single, fixed event rather than one per occurrence id - there
 * is only ever one daily confirmation, so a single fixed request code is sufficient and correct:
 * scheduling again always replaces the previous confirmation event rather than adding a second
 * one, satisfying the spec's "do not create duplicate confirmation events".
 */
class AndroidConfirmationScheduler(private val context: Context) : ConfirmationScheduler {

    private val alarmManager: AlarmManager
        get() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    // Same exact-alarm constraint Phase 1's AndroidAlarmScheduler already enforces (see the spec's
    // "confirmation scheduling must respect the same Android exact-alarm constraints already
    // handled by Phase 1") - duplicated here as a tiny, self-contained check rather than sharing
    // one across both schedulers, consistent with each scheduler owning its own AlarmManager calls.
    private fun canScheduleExactAlarms(): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else {
            true
        }

    override fun scheduleExact(triggerAtMillis: Long) {
        if (!canScheduleExactAlarms()) {
            // Fail safe, same as AndroidAlarmScheduler: never schedule something the OS would
            // reject. ScheduleDailyConfirmationUseCase is re-invoked on every app open, alarm
            // change, and boot, so this is naturally retried once permission is granted.
            return
        }
        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent())
    }

    override fun cancel() {
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent(),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE,
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    private fun intent(): Intent =
        Intent(context, ConfirmationReceiver::class.java).apply {
            action = ConfirmationReceiver.ACTION_DAILY_CONFIRMATION
        }

    private fun pendingIntent(): PendingIntent =
        PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent(),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

    private companion object {
        // Fixed and unique to this one confirmation event - never derived from an occurrence/alarm
        // id, and never collides with AndroidAlarmScheduler's request codes because PendingIntent
        // identity also includes the target component (ConfirmationReceiver vs AlarmReceiver).
        const val REQUEST_CODE = 0
    }
}
