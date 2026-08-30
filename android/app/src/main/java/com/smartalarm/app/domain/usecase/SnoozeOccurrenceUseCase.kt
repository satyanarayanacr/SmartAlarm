package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.scheduler.AlarmScheduler

/**
 * Snoozes a ringing occurrence: reschedules the SAME occurrence row (not a new one) to
 * `now + snoozeDurationMinutes`, and re-arms AlarmManager using the same occurrence id, so the
 * PendingIntent identity - and therefore de-duplication - stays intact across repeated snoozes.
 */
class SnoozeOccurrenceUseCase(
    private val repository: AlarmRepository,
    private val scheduler: AlarmScheduler,
) {
    suspend fun execute(
        occurrenceId: Long,
        nowMillis: Long = System.currentTimeMillis(),
    ): AlarmOccurrence? {
        val occurrence = repository.getOccurrence(occurrenceId) ?: return null
        // Only a currently-ringing (FIRED) or already-snoozed occurrence can be snoozed again;
        // this rejects a stale/duplicate snooze action against an occurrence already dismissed.
        if (occurrence.status != OccurrenceStatus.FIRED && occurrence.status != OccurrenceStatus.SNOOZED) {
            return null
        }
        val alarm = repository.getAlarm(occurrence.alarmId) ?: return null

        val newTriggerMillis = nowMillis + occurrence.snoozeDurationMinutes * 60_000L
        val updated = occurrence.copy(
            status = OccurrenceStatus.SNOOZED,
            scheduledTimeMillis = newTriggerMillis,
            updatedAt = nowMillis,
        )
        repository.saveOccurrence(updated)
        scheduler.scheduleExact(occurrenceId, alarm, newTriggerMillis)
        return updated
    }
}
