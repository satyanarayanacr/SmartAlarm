package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.domain.model.RepeatType
import java.time.ZoneId

data class AlarmFireResult(val alarm: Alarm, val occurrence: AlarmOccurrence)

/**
 * Business logic for "an alarm's exact time has arrived", invoked by [com.smartalarm.app.receiver.AlarmReceiver].
 * The receiver itself does nothing but parse the intent and delegate here.
 *
 * Idempotency: only occurrences still in SCHEDULED or SNOOZED state are handled; a duplicate or
 * stale broadcast redelivery for an occurrence that already fired, was dismissed, or was
 * cancelled is silently ignored (returns null) rather than re-showing the ringing UI.
 *
 * ONE_TIME alarms auto-disable once they fire, matching standard alarm-clock behavior and
 * preventing boot-recovery from resurrecting a "one time" alarm indefinitely (see
 * RescheduleAllUseCase). WEEKLY alarms immediately get their following week's occurrence
 * scheduled, so dismissing (or ignoring) today's ring can never block next week's.
 */
class AlarmFireUseCase(
    private val repository: AlarmRepository,
    private val coordinator: AlarmSchedulingCoordinator,
) {
    suspend fun execute(
        occurrenceId: Long,
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ): AlarmFireResult? {
        val occurrence = repository.getOccurrence(occurrenceId) ?: return null
        if (occurrence.status != OccurrenceStatus.SCHEDULED && occurrence.status != OccurrenceStatus.SNOOZED) {
            return null
        }
        val alarm = repository.getAlarm(occurrence.alarmId) ?: return null

        val firedOccurrence = occurrence.copy(status = OccurrenceStatus.FIRED, updatedAt = nowMillis)
        repository.saveOccurrence(firedOccurrence)
        // A real AlarmManager exact alarm is one-shot and auto-consumed the instant it fires, but
        // our own scheduler abstraction/fake only tracks "scheduled" vs "cancelled" via explicit
        // calls - without this, activeCount()-style bookkeeping would keep reporting the just-fired
        // occurrence as still active. (Found via a real failing unit test, not by inspection.)
        coordinator.cancelScheduledEntry(occurrence.id)

        var effectiveAlarm = alarm
        if (alarm.repeatType == RepeatType.WEEKLY) {
            coordinator.scheduleNextOccurrence(alarm, zone, nowMillis)
        } else {
            effectiveAlarm = alarm.copy(isEnabled = false, updatedAt = nowMillis)
            repository.saveAlarm(effectiveAlarm)
        }

        return AlarmFireResult(effectiveAlarm, firedOccurrence)
    }
}
