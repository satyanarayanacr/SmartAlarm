package com.smartalarm.app.domain

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.scheduler.AlarmScheduler
import java.time.Instant
import java.time.ZoneId

/**
 * Shared scheduling logic used by every UseCase that can create, cancel, or re-arm an occurrence.
 * Centralizing this here (rather than duplicating it in each UseCase) is what guarantees the
 * duplicate-prevention rules stay consistent everywhere: create/edit, enable/disable, delete,
 * alarm-fire (weekly rollover), and boot recovery all go through the exact same two operations.
 */
class AlarmSchedulingCoordinator(
    private val repository: AlarmRepository,
    private val scheduler: AlarmScheduler,
) {
    /** Cancels the OS alarm and marks CANCELLED every currently-pending (SCHEDULED/SNOOZED) occurrence of [alarmId]. */
    suspend fun cancelAllScheduled(alarmId: Long, nowMillis: Long = System.currentTimeMillis()) {
        val pending = repository.getPendingOccurrencesForAlarm(alarmId)
        for (occurrence in pending) {
            scheduler.cancel(occurrence.id)
            repository.saveOccurrence(
                occurrence.copy(status = OccurrenceStatus.CANCELLED, updatedAt = nowMillis)
            )
        }
    }

    /**
     * Computes and persists the next occurrence for [alarm] (if any - null when disabled, or when
     * occurrence math finds nothing), and schedules it with AlarmManager. Returns the saved
     * occurrence, or null if none was scheduled.
     */
    suspend fun scheduleNextOccurrence(
        alarm: Alarm,
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ): AlarmOccurrence? {
        val nextInstant = OccurrenceCalculator.nextOccurrence(alarm, Instant.ofEpochMilli(nowMillis), zone)
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
     * Re-registers an already-persisted, still-future occurrence with AlarmManager using its
     * existing id (so the request code matches exactly what was cancelled-on-reboot). Used only
     * by boot recovery - Room survives a reboot, AlarmManager's in-memory alarms do not.
     */
    fun rearmExisting(occurrence: AlarmOccurrence, alarm: Alarm) {
        scheduler.scheduleExact(occurrence.id, alarm, occurrence.scheduledTimeMillis)
    }

    /**
     * Removes [occurrenceId]'s entry from AlarmManager without touching its Room row's status.
     * Used by [AlarmFireUseCase][com.smartalarm.app.domain.usecase.AlarmFireUseCase] right after
     * an occurrence fires: the occurrence's own status transition (FIRED) is the repository's
     * concern, but AlarmManager's bookkeeping for that specific occurrence id must also be
     * cleared so it never reads as still "active" - a real device's AlarmManager auto-consumes a
     * one-shot exact alarm the instant it fires, and this keeps our own scheduler abstraction
     * consistent with that.
     */
    fun cancelScheduledEntry(occurrenceId: Long) {
        scheduler.cancel(occurrenceId)
    }
}
