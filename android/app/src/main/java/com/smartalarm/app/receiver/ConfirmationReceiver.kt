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
 * Thin receiver: fired by AlarmManager at the configured daily-confirmation time. Finds tomorrow's
 * confirmable (WEEKLY, still-SCHEDULED) occurrences and shows the confirmation notification if
 * there are any - per the spec, a day with nothing to confirm shows no notification at all, it is
 * never forced.
 *
 * Always reschedules the *next* daily confirmation before finishing (mirrors how a WEEKLY alarm's
 * own [com.smartalarm.app.domain.usecase.AlarmFireUseCase] schedules its following week's
 * occurrence when it fires) - this is what makes the confirmation a real recurring daily event
 * rather than a one-shot that silently stops after firing once. If the feature has since been
 * disabled, [com.smartalarm.app.domain.usecase.ScheduleDailyConfirmationUseCase] simply cancels
 * instead of scheduling again.
 */
class ConfirmationReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_DAILY_CONFIRMATION) return

        val pendingResult = goAsync()
        val locator = (context.applicationContext as SmartAlarmApplication).serviceLocator

        CoroutineScope(Dispatchers.Default).launch {
            try {
                val confirmable = locator.getTomorrowsConfirmableOccurrencesUseCase.execute()
                if (confirmable.isNotEmpty()) {
                    NotificationHelper.showDailyConfirmation(context, confirmable)
                }
                locator.scheduleDailyConfirmationUseCase.execute()
            } finally {
                pendingResult.finish()
            }
        }
    }

    companion object {
        const val ACTION_DAILY_CONFIRMATION = "com.smartalarm.app.action.DAILY_CONFIRMATION"
    }
}
