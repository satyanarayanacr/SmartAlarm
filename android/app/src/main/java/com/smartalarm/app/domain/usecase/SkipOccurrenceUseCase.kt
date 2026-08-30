package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.domain.model.RepeatType
import java.time.Instant
import java.time.ZoneId

/**
 * Skips exactly one upcoming occurrence: marks it SKIPPED and cancels its AlarmManager entry.
 * Deliberately touches only that occurrence's row - never the parent
 * [com.smartalarm.app.domain.model.Alarm.isEnabled] flag and never any sibling occurrence - so
 * skipping tomorrow's ring of a WEEKLY alarm never disables the day after (spec: "future
 * occurrences remain unaffected"). Mirrors [DismissOccurrenceUseCase]'s shape closely; the
 * differences are the terminal status and that skipping a still-enabled WEEKLY alarm must also
 * schedule the *next* occurrence after this one, since - unlike a live "fire" - there is nothing
 * else that will ever advance this alarm past the skipped day on its own.
 *
 * Idempotency (spec race conditions):
 *  - already SKIPPED: no-op, returns the occurrence unchanged (case 4 - double SKIP is safe and
 *    never double-schedules the following occurrence).
 *  - already FIRED/DISMISSED/SNOOZED/MISSED/CANCELLED: no-op, returns the occurrence unchanged -
 *    never modifies an occurrence confirmation processing arrived at too late for (case 3).
 */
class SkipOccurrenceUseCase(
    private val repository: AlarmRepository,
    private val coordinator: AlarmSchedulingCoordinator,
) {
    suspend fun execute(
        occurrenceId: Long,
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ): AlarmOccurrence? {
        val occurrence = repository.getOccurrence(occurrenceId) ?: return null
        if (occurrence.status != OccurrenceStatus.SCHEDULED) {
            return occurrence // already SKIPPED, or fired/dismissed/etc. in the meantime - no-op.
        }
        val alarm = repository.getAlarm(occurrence.alarmId) ?: return null

        coordinator.cancelScheduledEntry(occurrence.id)
        val skipped = occurrence.copy(status = OccurrenceStatus.SKIPPED, updatedAt = nowMillis)
        repository.saveOccurrence(skipped)

        // The recurring rule stays enabled; schedule whatever comes after the skipped day. Search
        // strictly after the SKIPPED occurrence's own scheduled time (not "from now") - the daily
        // confirmation runs well before that time, so searching from now would just find this same
        // occurrence again instead of advancing to the day after it.
        if (alarm.repeatType == RepeatType.WEEKLY && alarm.isEnabled) {
            coordinator.scheduleNextOccurrence(
                alarm = alarm,
                zone = zone,
                nowMillis = nowMillis,
                fromInstant = Instant.ofEpochMilli(occurrence.scheduledTimeMillis),
            )
        }
        return skipped
    }
}
