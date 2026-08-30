package com.smartalarm.app

import android.app.Application
import com.smartalarm.app.notification.NotificationHelper
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Application entry point for Smart Alarm.
 *
 * Phase 1: builds the process-wide [ServiceLocator] (Room database, repository, AlarmScheduler,
 * use cases) and registers the alarm notification channels here, so alarm state is initialized
 * consistently whether the app was launched by the user, woken up by [com.smartalarm.app.receiver.AlarmReceiver],
 * or woken up by [com.smartalarm.app.receiver.BootReceiver] after a reboot.
 *
 * Phase 1.1: also (re)schedules the daily confirmation event on every process start. This is
 * belt-and-braces alongside [com.smartalarm.app.domain.usecase.RescheduleAllUseCase]'s own call
 * on boot: it is what gets a device that upgraded from Phase 1 (never had this feature, so never
 * had anything scheduled for it) onto the new schedule the first time the app is simply opened,
 * without requiring a reboot. Re-deriving it is idempotent either way (see
 * ScheduleDailyConfirmationUseCase), so calling it unconditionally here is safe.
 */
class SmartAlarmApplication : Application() {

    lateinit var serviceLocator: ServiceLocator
        private set

    override fun onCreate() {
        super.onCreate()
        serviceLocator = ServiceLocator.from(this)
        NotificationHelper.ensureChannel(this)
        CoroutineScope(Dispatchers.Default).launch {
            serviceLocator.scheduleDailyConfirmationUseCase.execute()
        }
    }
}
