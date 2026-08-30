package com.smartalarm.app.domain

import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.RepeatType
import java.time.DayOfWeek
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * Pure-Kotlin, side-effect-free occurrence math: given an [Alarm] rule and "now", computes the
 * next absolute instant it should ring. Deliberately takes [zone] as a parameter rather than
 * reading the device default so it is fully unit-testable without Robolectric/instrumentation.
 *
 * This has no Android dependency and no location/timezone-shift awareness - it always answers
 * "what is the next occurrence of this alarm's local clock time going forward", which matches
 * Phase 1 scope (LOCAL_TIME-only, no ORIGINAL_TIMEZONE behavior yet).
 */
object OccurrenceCalculator {

    /**
     * Returns the next instant, strictly after [fromInstant], that [alarm] should ring - or null
     * if [alarm] is disabled or (for ONE_TIME) already in the past relative to [fromInstant] and
     * therefore cannot produce another occurrence.
     */
    fun nextOccurrence(alarm: Alarm, fromInstant: Instant, zone: ZoneId): Instant? {
        if (!alarm.isEnabled) return null

        val from = ZonedDateTime.ofInstant(fromInstant, zone)

        return when (alarm.repeatType) {
            RepeatType.ONE_TIME -> nextOneTimeOccurrence(alarm, from)?.toInstant()
            RepeatType.WEEKLY -> nextWeeklyOccurrence(alarm, from)?.toInstant()
        }
    }

    private fun nextOneTimeOccurrence(alarm: Alarm, from: ZonedDateTime): ZonedDateTime? {
        val candidateToday = from
            .withHour(alarm.hour)
            .withMinute(alarm.minute)
            .withSecond(0)
            .withNano(0)
        return if (candidateToday.isAfter(from)) candidateToday else candidateToday.plusDays(1)
        // Note: a ONE_TIME alarm always resolves to "the next time this clock time occurs",
        // i.e. today if still ahead, else tomorrow. Once it fires it is not rescheduled again
        // (see AlarmFireUseCase), which is what actually makes it "one time".
    }

    private fun nextWeeklyOccurrence(alarm: Alarm, from: ZonedDateTime): ZonedDateTime? {
        if (alarm.daysOfWeek.isEmpty()) return null

        val targetTimeToday = from
            .withHour(alarm.hour)
            .withMinute(alarm.minute)
            .withSecond(0)
            .withNano(0)

        // Check each of the next 8 days (today first) for a matching, still-future day-of-week.
        // Must go up to and including dayOffset=7 (a full week out), not just 0..6: when today
        // itself is a target day but its time already passed (e.g. alarm set for 6am, checked at
        // 8am on a day it's due), no offset in 0..6 can match again - only exactly one week later
        // (offset 7) does. Found via a real failing unit test (a same-day, already-passed weekly
        // alarm silently computed no next occurrence at all), not by inspection.
        for (dayOffset in 0..7) {
            val candidateDate = targetTimeToday.plusDays(dayOffset.toLong())
            val isoDay = candidateDate.dayOfWeek.value // 1=Mon..7=Sun, matches Alarm.daysOfWeek
            if (isoDay in alarm.daysOfWeek && candidateDate.isAfter(from)) {
                return candidateDate
            }
        }
        // Unreachable in practice (daysOfWeek is non-empty per Alarm's init check, and offset=7
        // always repeats offset=0's day-of-week strictly one week later than `from`), but keeps
        // the function total instead of throwing.
        return null
    }

    /** Convenience overload using [DayOfWeek] instead of the raw ISO int, for readability in tests. */
    fun ZonedDateTime.isoDayOfWeek(): Int = this.dayOfWeek.value
}
