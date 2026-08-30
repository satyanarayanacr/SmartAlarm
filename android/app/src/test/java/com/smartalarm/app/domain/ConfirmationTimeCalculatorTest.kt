package com.smartalarm.app.domain

import com.smartalarm.app.domain.model.ConfirmationSettings
import org.junit.Assert.assertEquals
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

class ConfirmationTimeCalculatorTest {

    private val zone = ZoneId.of("Asia/Kolkata")

    // Spec test 3: confirmation time calculation.
    @Test
    fun `next confirmation trigger is later today when the configured time has not passed yet`() {
        val settings = ConfirmationSettings(hour = 21, minute = 0)
        val now = ZonedDateTime.of(2026, 9, 2, 8, 0, 0, 0, zone).toInstant() // Wed 8am

        val next = ConfirmationTimeCalculator.nextConfirmationTrigger(settings, now, zone)

        val expected = ZonedDateTime.of(2026, 9, 2, 21, 0, 0, 0, zone).toInstant()
        assertEquals(expected, next)
    }

    @Test
    fun `next confirmation trigger rolls to tomorrow when today's configured time already passed`() {
        val settings = ConfirmationSettings(hour = 21, minute = 0)
        val now = ZonedDateTime.of(2026, 9, 2, 21, 30, 0, 0, zone).toInstant() // Wed 9:30pm - past 9pm

        val next = ConfirmationTimeCalculator.nextConfirmationTrigger(settings, now, zone)

        val expected = ZonedDateTime.of(2026, 9, 3, 21, 0, 0, 0, zone).toInstant()
        assertEquals(expected, next)
    }

    @Test
    fun `next confirmation trigger fires exactly at the configured time, not after`() {
        // Boundary: "now" is exactly the configured instant - must roll to tomorrow, not consider
        // the exact instant itself as still-ahead (mirrors OccurrenceCalculator's isAfter check).
        val settings = ConfirmationSettings(hour = 21, minute = 0)
        val now = ZonedDateTime.of(2026, 9, 2, 21, 0, 0, 0, zone).toInstant()

        val next = ConfirmationTimeCalculator.nextConfirmationTrigger(settings, now, zone)

        val expected = ZonedDateTime.of(2026, 9, 3, 21, 0, 0, 0, zone).toInstant()
        assertEquals(expected, next)
    }

    // Spec test 4: tomorrow calculation.
    @Test
    fun `tomorrow range is the next calendar day's full local-time window`() {
        val fromInstant = ZonedDateTime.of(2026, 9, 2, 21, 0, 0, 0, zone).toInstant() // fires Wed 9pm

        val range = ConfirmationTimeCalculator.tomorrowRange(fromInstant, zone)

        val expectedStart = ZonedDateTime.of(2026, 9, 3, 0, 0, 0, 0, zone).toInstant().toEpochMilli()
        val expectedEnd = ZonedDateTime.of(2026, 9, 4, 0, 0, 0, 0, zone).toInstant().toEpochMilli()
        assertEquals(expectedStart, range.startMillis)
        assertEquals(expectedEnd, range.endMillis)
    }

    @Test
    fun `tomorrow range rolls over a month boundary correctly`() {
        val fromInstant = ZonedDateTime.of(2026, 8, 31, 21, 0, 0, 0, zone).toInstant() // Mon Aug 31, 9pm

        val range = ConfirmationTimeCalculator.tomorrowRange(fromInstant, zone)

        val expectedStart = ZonedDateTime.of(2026, 9, 1, 0, 0, 0, 0, zone).toInstant().toEpochMilli()
        val expectedEnd = ZonedDateTime.of(2026, 9, 2, 0, 0, 0, 0, zone).toInstant().toEpochMilli()
        assertEquals(expectedStart, range.startMillis)
        assertEquals(expectedEnd, range.endMillis)
    }

    @Test
    fun `per-alarm confirmationTriggerForOccurrence schedules on the previous calendar day`() {
        val alarm = com.smartalarm.app.domain.model.Alarm(
            id = 1L,
            name = "Work",
            hour = 7,
            minute = 0,
            isConfirmationEnabled = true,
            confirmationHour = 20,
            confirmationMinute = 30,
        )
        // Alarm occurrence is on Thursday Sep 3 at 7:00 AM
        val occurrenceMillis = ZonedDateTime.of(2026, 9, 3, 7, 0, 0, 0, zone).toInstant().toEpochMilli()

        val trigger = ConfirmationTimeCalculator.confirmationTriggerForOccurrence(alarm, occurrenceMillis, zone)

        // Expected confirmation is Wednesday Sep 2 at 20:30 (8:30 PM)
        val expectedTrigger = ZonedDateTime.of(2026, 9, 2, 20, 30, 0, 0, zone).toInstant()
        assertEquals(expectedTrigger, trigger)
    }
}
