package com.smartalarm.app

import android.app.Application

/**
 * Application entry point for Smart Alarm.
 *
 * This is intentionally minimal for the Phase 4.5 foundation milestone. Future phases will
 * initialize process-wide singletons here (the Room database via a repository holder,
 * notification channel registration, WorkManager/AlarmManager reconciliation on cold start,
 * etc.) rather than in individual Activities, so that alarm state is consistent whether the
 * app was launched by the user or woken up by a BroadcastReceiver/Service.
 */
class SmartAlarmApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        // No-op for the foundation milestone.
    }
}
