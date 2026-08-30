package com.smartalarm.app.domain

import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.RepeatType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek
import java.time.Instant
import java.time.ZoneId
import java.time.ZonedDateTime

class OccurrenceCalculatorTest {

    private val zone: ZoneId = ZoneId.of("Asia/Kolkata")

    /** A fixed "now": Wednesday 2026-09-02, 08:00:00 IST. */
    private val wednesday0800 = ZonedDateTime.of(2026, 9, 2, 8, 0, 0, 0, zone).toInstant()

    @Test
    fun `one-time alarm later today resolves to today`() {
        val alarm = Alarm(name = "A", hour = 20, minute = 0, repeatType = RepeatType.ONE_TIME)
        val next = OccurrenceCalculator.nextOccurrence(alarm, wednesday0800, zone)!!
        val zdt = ZonedDateTime.ofInstant(next, zone)
        assertEquals(2, zdt.dayOfMonth)
        assertEquals(20, zdt.hour)
    }

    @Test
    fun `one-time alarm earlier today resolves to tomorrow`() {
        val alarm = Alarm(name = "A", hour = 6, minute = 0, repeatType = RepeatType.ONE_TIME)
        val next = OccurrenceCalculator.nextOccurrence(alarm, wednesday0800, zone)!!
        val zdt = ZonedDateTime.ofInstant(next, zone)
        assertEquals(3, zdt.dayOfMonth)
        assertEquals(6, zdt.hour)
    }

    @Test
    fun `weekly alarm picks the same day later today when still ahead`() {
        // wednesday0800 is a Wednesday (isoDayOfWeek = 3).
        val alarm = Alarm(
            name = "A", hour = 9, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = setOf(3, 5),
        )
        val next = OccurrenceCalculator.nextOccurrence(alarm, wednesday0800, zone)!!
        val zdt = ZonedDateTime.ofInstant(next, zone)
        assertEquals(DayOfWeek.WEDNESDAY, zdt.dayOfWeek)
        assertEquals(2, zdt.dayOfMonth)
    }

    @Test
    fun `weekly alarm skips today when today's time has already passed`() {
        // Today is Wednesday 08:00; alarm time 07:00 today has passed, so Wed is skipped this week.
        val alarm = Alarm(
            name = "A", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = setOf(3, 5),
        )
        val next = OccurrenceCalculator.nextOccurrence(alarm, wednesday0800, zone)!!
        val zdt = ZonedDateTime.ofInstant(next, zone)
        assertEquals(DayOfWeek.FRIDAY, zdt.dayOfWeek)
        assertEquals(4, zdt.dayOfMonth)
    }

    @Test
    fun `weekly alarm wraps to next week when no remaining day matches this week`() {
        // Only Monday selected; today is Wednesday, so next Monday is 5 days away.
        val alarm = Alarm(
            name = "A", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = setOf(1),
        )
        val next = OccurrenceCalculator.nextOccurrence(alarm, wednesday0800, zone)!!
        val zdt = ZonedDateTime.ofInstant(next, zone)
        assertEquals(DayOfWeek.MONDAY, zdt.dayOfWeek)
        assertEquals(7, zdt.dayOfMonth) // 2026-09-07 is the following Monday.
    }

    @Test
    fun `disabled alarm has no next occurrence`() {
        val alarm = Alarm(
            name = "A", hour = 9, minute = 0, isEnabled = false, repeatType = RepeatType.ONE_TIME,
        )
        assertNull(OccurrenceCalculator.nextOccurrence(alarm, wednesday0800, zone))
    }

    @Test
    fun `next occurrence instant round-trips through Instant back to epoch millis`() {
        val alarm = Alarm(name = "A", hour = 10, minute = 15, repeatType = RepeatType.ONE_TIME)
        val next: Instant = OccurrenceCalculator.nextOccurrence(alarm, wednesday0800, zone)!!
        assertTrue(next.toEpochMilli() > wednesday0800.toEpochMilli())
    }
}
