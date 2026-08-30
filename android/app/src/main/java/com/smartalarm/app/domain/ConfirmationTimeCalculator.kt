package com.smartalarm.app.domain

import com.smartalarm.app.domain.model.ConfirmationSettings
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * Pure-Kotlin, side-effect-free math for Phase 1.1's daily confirmation: given the confirmation
 * time-of-day setting and "now", when should the confirmation next fire, and which calendar day
 * ("tomorrow" relative to that firing) should it ask about. No Android dependency, fully
 * unit-testable, matching [OccurrenceCalculator]'s existing style.
 */
object ConfirmationTimeCalculator {

    /**
     * Calculates the exact instant when the confirmation event should fire for an [occurrenceTimeMillis]
     * given the [alarm]'s configured confirmation time ([alarm.confirmationHour], [alarm.confirmationMinute]).
     *
     * Rule:
     * - If the confirmation time on the date of the occurrence is strictly before the occurrence time
     *   (e.g., Alarm rings at 14:00, confirmation configured for 09:00 on the same day):
     *   confirmation fires on the same day at 09:00.
     * - If the confirmation time on the date of the occurrence is at or after the occurrence time
     *   (e.g., Alarm rings at 07:00, confirmation configured for 21:00):
     *   confirmation fires the day before the occurrence at 21:00.
     */
    fun confirmationTriggerForOccurrence(
        alarm: Alarm,
        occurrenceTimeMillis: Long,
        zone: ZoneId,
    ): Instant {
        val occurrenceZdt = ZonedDateTime.ofInstant(Instant.ofEpochMilli(occurrenceTimeMillis), zone)
        val sameDayConfirmation = occurrenceZdt
            .withHour(alarm.confirmationHour)
            .withMinute(alarm.confirmationMinute)
            .withSecond(0)
            .withNano(0)

        val triggerZdt = if (sameDayConfirmation.isBefore(occurrenceZdt)) {
            sameDayConfirmation
        } else {
            sameDayConfirmation.minusDays(1)
        }
        return triggerZdt.toInstant()
    }

    /**
     * The next instant, strictly after [fromInstant], that the daily confirmation should fire at
     * [settings]'s configured local time.
     */
    fun nextConfirmationTrigger(settings: ConfirmationSettings, fromInstant: Instant, zone: ZoneId): Instant {
        val from = ZonedDateTime.ofInstant(fromInstant, zone)
        val candidateToday = from
            .withHour(settings.hour)
            .withMinute(settings.minute)
            .withSecond(0)
            .withNano(0)
        val next = if (candidateToday.isAfter(from)) candidateToday else candidateToday.plusDays(1)
        return next.toInstant()
    }

    /** Exclusive-end millis window: [startMillis, endMillis). */
    data class MillisRange(val startMillis: Long, val endMillis: Long)

    /**
     * The [start, end) millis window for the calendar day immediately after [fromInstant]'s local
     * date - i.e. "tomorrow" as of whenever the confirmation actually fires.
     */
    fun tomorrowRange(fromInstant: Instant, zone: ZoneId): MillisRange {
        val tomorrowStart = ZonedDateTime.ofInstant(fromInstant, zone)
            .plusDays(1)
            .toLocalDate()
            .atStartOfDay(zone)
        val tomorrowEnd = tomorrowStart.plusDays(1)
        return MillisRange(tomorrowStart.toInstant().toEpochMilli(), tomorrowEnd.toInstant().toEpochMilli())
    }
}
