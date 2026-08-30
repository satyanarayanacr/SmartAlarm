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
 * Thin receiver for the Snooze/Dismiss notification action buttons (tapped directly from the
 * notification shade, without necessarily opening [com.smartalarm.app.ui.ringing.AlarmRingingActivity]).
 * Delegates to the exact same [com.smartalarm.app.domain.usecase.SnoozeOccurrenceUseCase] /
 * [com.smartalarm.app.domain.usecase.DismissOccurrenceUseCase] that the ringing screen's buttons
 * call, so there is a single source of truth for snooze/dismiss behavior.
 */
class AlarmActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val occurrenceId = intent.getLongExtra(EXTRA_OCCURRENCE_ID, -1L)
        if (occurrenceId == -1L) return

        val pendingResult = goAsync()
        val app = context.applicationContext as SmartAlarmApplication
        val locator = app.serviceLocator

        CoroutineScope(Dispatchers.Default).launch {
            try {
                when (intent.action) {
                    ACTION_SNOOZE -> locator.snoozeOccurrenceUseCase.execute(occurrenceId)
                    ACTION_DISMISS -> locator.dismissOccurrenceUseCase.execute(occurrenceId)
                }
                NotificationHelper.cancel(context, occurrenceId)
            } finally {
                pendingResult.finish()
            }
        }
    }

    companion object {
        const val ACTION_SNOOZE = "com.smartalarm.app.action.SNOOZE"
        const val ACTION_DISMISS = "com.smartalarm.app.action.DISMISS"
        const val EXTRA_OCCURRENCE_ID = "extra_occurrence_id"
    }
}
