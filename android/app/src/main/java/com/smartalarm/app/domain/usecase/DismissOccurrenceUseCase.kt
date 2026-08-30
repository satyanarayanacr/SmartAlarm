package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.scheduler.AlarmScheduler

/**
 * Dismisses exactly one occurrence. Deliberately touches only that occurrence's row - never the
 * parent [com.smartalarm.app.domain.model.Alarm.isEnabled] flag and never any sibling occurrence
 * - so dismissing today's ring of a WEEKLY alarm never disables tomorrow's (or next week's).
 */
class DismissOccurrenceUseCase(
    private val repository: AlarmRepository,
    private val scheduler: AlarmScheduler,
) {
    suspend fun execute(
        occurrenceId: Long,
        nowMillis: Long = System.currentTimeMillis(),
    ): AlarmOccurrence? {
        val occurrence = repository.getOccurrence(occurrenceId) ?: return null
        if (occurrence.status == OccurrenceStatus.DISMISSED) return occurrence // idempotent no-op

        scheduler.cancel(occurrenceId) // defensive: no pending alarm should remain for it
        val updated = occurrence.copy(status = OccurrenceStatus.DISMISSED, updatedAt = nowMillis)
        repository.saveOccurrence(updated)
        return updated
    }
}
