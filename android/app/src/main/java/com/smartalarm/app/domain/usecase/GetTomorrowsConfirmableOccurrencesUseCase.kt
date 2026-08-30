package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.ConfirmationTimeCalculator
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.RepeatType
import java.time.Instant
import java.time.ZoneId

/** One of tomorrow's still-SCHEDULED WEEKLY occurrences, paired with its parent rule. */
data class ConfirmableOccurrence(val alarm: Alarm, val occurrence: AlarmOccurrence)

/**
 * Finds tomorrow's occurrences that the daily confirmation flow should ask the user about.
 *
 * Per the Phase 1.1 spec (section 3): confirmation applies to WEEKLY recurring alarms only, never
 * ONE_TIME - a ONE_TIME alarm's single occurrence is not a "do you still need this" recurring
 * question, it is simply next in line to ring once. "Tomorrow" is computed relative to
 * [fromInstant] (normally the actual confirmation-firing instant, so "today: Friday 9pm ->
 * asking about Saturday" holds even if this use case is invoked slightly late).
 */
class GetTomorrowsConfirmableOccurrencesUseCase(
    private val repository: AlarmRepository,
) {
    suspend fun execute(
        zone: ZoneId = ZoneId.systemDefault(),
        fromInstant: Instant = Instant.now(),
    ): List<ConfirmableOccurrence> {
        val range = ConfirmationTimeCalculator.tomorrowRange(fromInstant, zone)
        val tomorrowsOccurrences = repository.getScheduledOccurrencesBetween(range.startMillis, range.endMillis)

        return tomorrowsOccurrences.mapNotNull { occurrence ->
            val alarm = repository.getAlarm(occurrence.alarmId) ?: return@mapNotNull null
            if (alarm.repeatType != RepeatType.WEEKLY) return@mapNotNull null
            ConfirmableOccurrence(alarm, occurrence)
        }
    }
}
