package com.smartalarm.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.smartalarm.app.SmartAlarmApplication
import com.smartalarm.app.notification.NotificationHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Thin receiver: fired by AlarmManager at the exact scheduled instant. Contains no business
 * logic itself - it only extracts the occurrence id and hands off to [com.smartalarm.app.domain.usecase.AlarmFireUseCase],
 * then (if the use case says the occurrence is genuinely due) shows the ringing notification.
 *
 * Uses `goAsync()` because the work (Room read/write, possibly a next-occurrence schedule) is
 * asynchronous and must not be dropped when `onReceive` returns before it completes.
 */
class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_ALARM_FIRED) return
        val occurrenceId = intent.getLongExtra(EXTRA_OCCURRENCE_ID, -1L)
        if (occurrenceId == -1L) return

        val pendingResult = goAsync()
        val app = context.applicationContext as SmartAlarmApplication
        val locator = app.serviceLocator

        CoroutineScope(Dispatchers.Default).launch {
            try {
                val result = locator.alarmFireUseCase.execute(occurrenceId)
                if (result != null) {
                    NotificationHelper.showRinging(context, result.alarm, occurrenceId)
                }
            } finally {
                pendingResult.finish()
            }
        }
    }

    companion object {
        const val ACTION_ALARM_FIRED = "com.smartalarm.app.action.ALARM_FIRED"
        const val EXTRA_OCCURRENCE_ID = "extra_occurrence_id"
        const val EXTRA_ALARM_ID = "extra_alarm_id"
    }
}
