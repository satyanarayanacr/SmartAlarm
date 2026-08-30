package com.smartalarm.app.domain

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.scheduler.AlarmScheduler
import com.smartalarm.app.scheduler.ConfirmationScheduler
import java.time.Instant
import java.time.ZoneId

/**
 * Shared scheduling logic used by every UseCase that can create, cancel, or re-arm an occurrence
 * and its associated confirmation event.
 */
class AlarmSchedulingCoordinator(
    private val repository: AlarmRepository,
    private val scheduler: AlarmScheduler,
    private val confirmationScheduler: ConfirmationScheduler? = null,
) {
    /** Cancels the OS alarm and confirmation, and marks CANCELLED every currently-pending occurrence of [alarmId]. */
    suspend fun cancelAllScheduled(alarmId: Long, nowMillis: Long = System.currentTimeMillis()) {
        val pending = repository.getPendingOccurrencesForAlarm(alarmId)
        for (occurrence in pending) {
            scheduler.cancel(occurrence.id)
            confirmationScheduler?.cancel(occurrence.id)
            repository.saveOccurrence(
                occurrence.copy(status = OccurrenceStatus.CANCELLED, updatedAt = nowMillis)
            )
        }
    }

    /**
     * Computes and persists the next occurrence for [alarm], schedules it with AlarmManager,
     * and schedules its confirmation event if confirmation is enabled.
     */
    suspend fun scheduleNextOccurrence(
        alarm: Alarm,
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
        fromInstant: Instant = Instant.ofEpochMilli(nowMillis),
    ): AlarmOccurrence? {
        val nextInstant = OccurrenceCalculator.nextOccurrence(alarm, fromInstant, zone)
            ?: return null

        val occurrence = AlarmOccurrence(
            alarmId = alarm.id,
            scheduledTimeMillis = nextInstant.toEpochMilli(),
            status = OccurrenceStatus.SCHEDULED,
            isVibrationEnabled = alarm.isVibrationEnabled,
            snoozeDurationMinutes = alarm.snoozeDurationMinutes,
            createdAt = nowMillis,
            updatedAt = nowMillis,
        )
        val id = repository.saveOccurrence(occurrence)
        val saved = occurrence.copy(id = id)
        scheduler.scheduleExact(id, alarm, saved.scheduledTimeMillis)

        if (alarm.isEnabled && alarm.isConfirmationEnabled && confirmationScheduler != null) {
            val triggerInstant = ConfirmationTimeCalculator.confirmationTriggerForOccurrence(
                alarm = alarm,
                occurrenceTimeMillis = saved.scheduledTimeMillis,
                zone = zone,
            )
            if (triggerInstant.isAfter(Instant.ofEpochMilli(nowMillis))) {
                confirmationScheduler.scheduleExact(saved.id, triggerInstant.toEpochMilli())
            } else {
                confirmationScheduler.cancel(saved.id)
            }
        } else {
            confirmationScheduler?.cancel(saved.id)
        }

        return saved
    }

    /** Cancels every pending occurrence for [alarm], then schedules a fresh next one if enabled. */
    suspend fun rescheduleAlarm(
        alarm: Alarm,
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ): AlarmOccurrence? {
        cancelAllScheduled(alarm.id, nowMillis)
        if (!alarm.isEnabled) return null
        return scheduleNextOccurrence(alarm, zone, nowMillis)
    }

    /**
     * Re-registers an already-persisted, still-future occurrence with AlarmManager and ConfirmationScheduler.
     */
    fun rearmExisting(
        occurrence: AlarmOccurrence,
        alarm: Alarm,
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ) {
        scheduler.scheduleExact(occurrence.id, alarm, occurrence.scheduledTimeMillis)
        if (alarm.isEnabled && alarm.isConfirmationEnabled && confirmationScheduler != null) {
            val triggerInstant = ConfirmationTimeCalculator.confirmationTriggerForOccurrence(
                alarm = alarm,
                occurrenceTimeMillis = occurrence.scheduledTimeMillis,
                zone = zone,
            )
            if (triggerInstant.isAfter(Instant.ofEpochMilli(nowMillis))) {
                confirmationScheduler.scheduleExact(occurrence.id, triggerInstant.toEpochMilli())
            } else {
                confirmationScheduler.cancel(occurrence.id)
            }
        } else {
            confirmationScheduler?.cancel(occurrence.id)
        }
    }

    /**
     * Removes [occurrenceId]'s entry from AlarmManager and ConfirmationScheduler without touching Room row.
     */
    fun cancelScheduledEntry(occurrenceId: Long) {
        scheduler.cancel(occurrenceId)
        confirmationScheduler?.cancel(occurrenceId)
    }
}
