package com.smartalarm.app

import android.content.Context
import androidx.room.Room
import com.smartalarm.app.data.local.SmartAlarmDatabase
import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.data.repository.RoomAlarmRepository
import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.usecase.AlarmFireUseCase
import com.smartalarm.app.domain.usecase.CreateOrUpdateAlarmUseCase
import com.smartalarm.app.domain.usecase.DeleteAlarmUseCase
import com.smartalarm.app.domain.usecase.DismissOccurrenceUseCase
import com.smartalarm.app.domain.usecase.GetTomorrowsConfirmableOccurrencesUseCase
import com.smartalarm.app.domain.usecase.KeepOccurrenceUseCase
import com.smartalarm.app.domain.usecase.KeepOccurrencesUseCase
import com.smartalarm.app.domain.usecase.RescheduleAllUseCase
import com.smartalarm.app.domain.usecase.ScheduleDailyConfirmationUseCase
import com.smartalarm.app.domain.usecase.SkipOccurrenceUseCase
import com.smartalarm.app.domain.usecase.SkipOccurrencesUseCase
import com.smartalarm.app.domain.usecase.SnoozeOccurrenceUseCase
import com.smartalarm.app.domain.usecase.ToggleAlarmEnabledUseCase
import com.smartalarm.app.domain.usecase.UpdateConfirmationSettingsUseCase
import com.smartalarm.app.scheduler.AlarmScheduler
import com.smartalarm.app.scheduler.AndroidAlarmScheduler
import com.smartalarm.app.scheduler.AndroidConfirmationScheduler
import com.smartalarm.app.scheduler.ConfirmationScheduler

/**
 * Hand-written composition root - deliberately not a DI framework (Hilt/Koin), per the Phase 1
 * spec's "no DI framework unless truly necessary". Everything here is a plain singleton built
 * once from [SmartAlarmApplication.onCreate] and reused by Activities, ViewModels, and
 * BroadcastReceivers alike, so there is exactly one Room database and one AlarmScheduler for the
 * whole process.
 */
class ServiceLocator(context: Context) {
    private val appContext = context.applicationContext

    val database: SmartAlarmDatabase by lazy {
        Room.databaseBuilder(appContext, SmartAlarmDatabase::class.java, SmartAlarmDatabase.DATABASE_NAME)
            .addMigrations(*SmartAlarmDatabase.MIGRATIONS)
            .build()
    }

    val repository: AlarmRepository by lazy {
        RoomAlarmRepository(database.alarmDao(), database.alarmOccurrenceDao(), database.confirmationSettingsDao())
    }

    val scheduler: AlarmScheduler by lazy { AndroidAlarmScheduler(appContext) }
    val confirmationScheduler: ConfirmationScheduler by lazy { AndroidConfirmationScheduler(appContext) }

    private val coordinator: AlarmSchedulingCoordinator by lazy {
        AlarmSchedulingCoordinator(repository, scheduler)
    }

    val createOrUpdateAlarmUseCase: CreateOrUpdateAlarmUseCase by lazy {
        CreateOrUpdateAlarmUseCase(repository, coordinator)
    }
    val toggleAlarmEnabledUseCase: ToggleAlarmEnabledUseCase by lazy {
        ToggleAlarmEnabledUseCase(repository, coordinator)
    }
    val deleteAlarmUseCase: DeleteAlarmUseCase by lazy { DeleteAlarmUseCase(repository, coordinator) }
    val alarmFireUseCase: AlarmFireUseCase by lazy { AlarmFireUseCase(repository, coordinator) }
    val snoozeOccurrenceUseCase: SnoozeOccurrenceUseCase by lazy {
        SnoozeOccurrenceUseCase(repository, scheduler)
    }
    val dismissOccurrenceUseCase: DismissOccurrenceUseCase by lazy {
        DismissOccurrenceUseCase(repository, scheduler)
    }

    // Phase 1.1: daily alarm confirmation.
    val scheduleDailyConfirmationUseCase: ScheduleDailyConfirmationUseCase by lazy {
        ScheduleDailyConfirmationUseCase(repository, confirmationScheduler)
    }
    val updateConfirmationSettingsUseCase: UpdateConfirmationSettingsUseCase by lazy {
        UpdateConfirmationSettingsUseCase(repository, scheduleDailyConfirmationUseCase)
    }
    val getTomorrowsConfirmableOccurrencesUseCase: GetTomorrowsConfirmableOccurrencesUseCase by lazy {
        GetTomorrowsConfirmableOccurrencesUseCase(repository)
    }
    val keepOccurrenceUseCase: KeepOccurrenceUseCase by lazy { KeepOccurrenceUseCase(repository) }
    val keepOccurrencesUseCase: KeepOccurrencesUseCase by lazy { KeepOccurrencesUseCase(keepOccurrenceUseCase) }
    val skipOccurrenceUseCase: SkipOccurrenceUseCase by lazy { SkipOccurrenceUseCase(repository, coordinator) }
    val skipOccurrencesUseCase: SkipOccurrencesUseCase by lazy { SkipOccurrencesUseCase(skipOccurrenceUseCase) }

    val rescheduleAllUseCase: RescheduleAllUseCase by lazy {
        RescheduleAllUseCase(repository, coordinator, scheduleDailyConfirmationUseCase)
    }

    companion object {
        @Volatile private var instance: ServiceLocator? = null

        fun from(context: Context): ServiceLocator =
            instance ?: synchronized(this) {
                instance ?: ServiceLocator(context.applicationContext).also { instance = it }
            }
    }
}
