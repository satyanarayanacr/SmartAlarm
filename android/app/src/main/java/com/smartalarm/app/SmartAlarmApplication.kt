package com.smartalarm.app

import android.app.Application
import com.smartalarm.app.notification.NotificationHelper

/**
 * Application entry point for Smart Alarm.
 *
 * Phase 1: builds the process-wide [ServiceLocator] (Room database, repository, AlarmScheduler,
 * use cases) and registers the alarm notification channel here, so alarm state is initialized
 * consistently whether the app was launched by the user, woken up by [com.smartalarm.app.receiver.AlarmReceiver],
 * or woken up by [com.smartalarm.app.receiver.BootReceiver] after a reboot.
 */
class SmartAlarmApplication : Application() {

    lateinit var serviceLocator: ServiceLocator
        private set

    override fun onCreate() {
        super.onCreate()
        serviceLocator = ServiceLocator.from(this)
        NotificationHelper.ensureChannel(this)
    }
}
