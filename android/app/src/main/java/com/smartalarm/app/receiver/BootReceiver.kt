package com.smartalarm.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.smartalarm.app.SmartAlarmApplication
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Thin receiver: reschedules all pending alarms from Room after a device reboot (AlarmManager
 * loses every scheduled alarm on reboot; Room does not). All the actual logic lives in
 * [com.smartalarm.app.domain.usecase.RescheduleAllUseCase].
 *
 * Listens for both BOOT_COMPLETED (cold boot) and MY_PACKAGE_REPLACED (app updated/reinstalled),
 * since AlarmManager alarms are also cleared when the app is updated.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != Intent.ACTION_MY_PACKAGE_REPLACED
        ) {
            return
        }

        val pendingResult = goAsync()
        val app = context.applicationContext as SmartAlarmApplication
        val locator = app.serviceLocator

        CoroutineScope(Dispatchers.Default).launch {
            try {
                locator.rescheduleAllUseCase.execute()
            } finally {
                pendingResult.finish()
            }
        }
    }
}
