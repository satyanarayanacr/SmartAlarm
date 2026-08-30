package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.ConfirmationTimeCalculator
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.scheduler.ConfirmationScheduler
import java.time.Instant
import java.time.ZoneId

/**
 * Reconciles confirmation schedules for all enabled alarms and their pending occurrences.
 * For each enabled alarm with [isConfirmationEnabled] = true, schedules a confirmation
 * trigger before its pending occurrence if the trigger is still in the future.
 */
class ScheduleDailyConfirmationUseCase(
    private val repository: AlarmRepository,
    private val confirmationScheduler: ConfirmationScheduler,
) {
    suspend fun execute(
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ) {
        val enabledAlarms = repository.getAllEnabledAlarms()
        var scheduledAny = false

        for (alarm in enabledAlarms) {
            val pendingOccurrences = repository.getPendingOccurrencesForAlarm(alarm.id)
            for (occurrence in pendingOccurrences) {
                if (occurrence.status != OccurrenceStatus.SCHEDULED) continue

                if (alarm.isConfirmationEnabled) {
                    val triggerInstant = ConfirmationTimeCalculator.confirmationTriggerForOccurrence(
                        alarm = alarm,
                        occurrenceTimeMillis = occurrence.scheduledTimeMillis,
                        zone = zone,
                    )
                    if (triggerInstant.isAfter(Instant.ofEpochMilli(nowMillis))) {
                        confirmationScheduler.scheduleExact(occurrence.id, triggerInstant.toEpochMilli())
                        scheduledAny = true
                    } else {
                        confirmationScheduler.cancel(occurrence.id)
                    }
                } else {
                    confirmationScheduler.cancel(occurrence.id)
                }
            }
        }

        if (!scheduledAny) {
            confirmationScheduler.cancelAll()
        }
    }
}

