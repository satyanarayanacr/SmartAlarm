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
     * The next instant, strictly after [fromInstant], that the daily confirmation should fire at
     * [settings]'s configured local time. Always finds one (today if still ahead, else tomorrow) -
     * unlike [OccurrenceCalculator.nextOccurrence] this never returns null, since the daily
     * confirmation is not tied to a specific alarm that can run out of future occurrences.
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
     * date - i.e. "tomorrow" as of whenever the confirmation actually fires. Per the Phase 1.1
     * spec ("today: Friday -> question: do you need Saturday's alarms"), this is always exactly
     * one calendar day ahead in the device's current local clock context - no timezone-change
     * handling (that remains Phase 3).
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
