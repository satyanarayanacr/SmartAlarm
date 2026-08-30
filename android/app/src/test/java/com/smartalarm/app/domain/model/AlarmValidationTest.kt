package com.smartalarm.app.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class AlarmValidationTest {

    @Test
    fun `creation with valid one-time fields succeeds`() {
        val alarm = Alarm(name = "Wake up", hour = 7, minute = 30, repeatType = RepeatType.ONE_TIME)
        assertEqualsAlarm(7, 30, alarm)
    }

    @Test
    fun `creation with valid weekly fields succeeds`() {
        val alarm = Alarm(
            name = "Work",
            hour = 6,
            minute = 45,
            repeatType = RepeatType.WEEKLY,
            daysOfWeek = setOf(1, 2, 3, 4, 5),
        )
        assertEqualsAlarm(6, 45, alarm)
    }

    @Test
    fun `invalid hour is rejected`() {
        assertThrows(IllegalArgumentException::class.java) {
            Alarm(name = "Bad", hour = 24, minute = 0, repeatType = RepeatType.ONE_TIME)
        }
        assertThrows(IllegalArgumentException::class.java) {
            Alarm(name = "Bad", hour = -1, minute = 0, repeatType = RepeatType.ONE_TIME)
        }
    }

    @Test
    fun `invalid minute is rejected`() {
        assertThrows(IllegalArgumentException::class.java) {
            Alarm(name = "Bad", hour = 7, minute = 60, repeatType = RepeatType.ONE_TIME)
        }
    }

    @Test
    fun `weekly alarm with no days selected is rejected`() {
        assertThrows(IllegalArgumentException::class.java) {
            Alarm(name = "Bad", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = emptySet())
        }
    }

    @Test
    fun `weekly alarm with out-of-range day value is rejected`() {
        assertThrows(IllegalArgumentException::class.java) {
            Alarm(name = "Bad", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = setOf(8))
        }
    }

    @Test
    fun `one-time alarm does not require daysOfWeek`() {
        val alarm = Alarm(name = "Once", hour = 7, minute = 0, repeatType = RepeatType.ONE_TIME)
        assertTrue(alarm.daysOfWeek.isEmpty())
    }

    private fun assertEqualsAlarm(hour: Int, minute: Int, alarm: Alarm) {
        assertEquals(hour, alarm.hour)
        assertEquals(minute, alarm.minute)
    }
}
