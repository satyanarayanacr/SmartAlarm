package com.smartalarm.app.domain.usecase

import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.domain.model.RepeatType
import com.smartalarm.app.fakes.FakeAlarmRepository
import com.smartalarm.app.fakes.FakeConfirmationScheduler
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

class ScheduleDailyConfirmationUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var confirmationScheduler: FakeConfirmationScheduler
    private lateinit var scheduleUseCase: ScheduleDailyConfirmationUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    // Wednesday Sep 2, 2026 at 8:00 AM
    private val now = ZonedDateTime.of(2026, 9, 2, 8, 0, 0, 0, zone).toInstant().toEpochMilli()

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        confirmationScheduler = FakeConfirmationScheduler()
        scheduleUseCase = ScheduleDailyConfirmationUseCase(repository, confirmationScheduler)
    }

    @Test
    fun `enabled alarm with confirmation schedules for tomorrow's occurrence`() = runTest {
        val alarm = Alarm(
            id = 1L,
            name = "Work",
            hour = 7,
            minute = 0,
            isEnabled = true,
            repeatType = RepeatType.WEEKLY,
            daysOfWeek = setOf(1, 2, 3, 4, 5),
            isConfirmationEnabled = true,
            confirmationHour = 21,
            confirmationMinute = 0,
        )
        repository.saveAlarm(alarm)
        // Tomorrow's occurrence: Thursday Sep 3, 7:00 AM
        val occurrenceTime = ZonedDateTime.of(2026, 9, 3, 7, 0, 0, 0, zone).toInstant().toEpochMilli()
        val occurrence = AlarmOccurrence(
            id = 101L,
            alarmId = 1L,
            scheduledTimeMillis = occurrenceTime,
            status = OccurrenceStatus.SCHEDULED,
            createdAt = now,
            updatedAt = now,
        )
        repository.saveOccurrence(occurrence)

        scheduleUseCase.execute(zone, now)

        // Expected confirmation trigger: Wednesday Sep 2, 21:00 (9:00 PM)
        val expected = ZonedDateTime.of(2026, 9, 2, 21, 0, 0, 0, zone).toInstant().toEpochMilli()
        assertEquals(expected, confirmationScheduler.scheduledOccurrences[101L])
    }

    @Test
    fun `disabling confirmation on alarm cancels its confirmation`() = runTest {
        val alarm = Alarm(
            id = 1L,
            name = "Work",
            hour = 7,
            minute = 0,
            isEnabled = true,
            repeatType = RepeatType.WEEKLY,
            daysOfWeek = setOf(1, 2, 3, 4, 5),
            isConfirmationEnabled = false,
        )
        repository.saveAlarm(alarm)
        val occurrenceTime = ZonedDateTime.of(2026, 9, 3, 7, 0, 0, 0, zone).toInstant().toEpochMilli()
        val occurrence = AlarmOccurrence(
            id = 101L,
            alarmId = 1L,
            scheduledTimeMillis = occurrenceTime,
            status = OccurrenceStatus.SCHEDULED,
            createdAt = now,
            updatedAt = now,
        )
        repository.saveOccurrence(occurrence)

        scheduleUseCase.execute(zone, now)

        assertNull(confirmationScheduler.scheduledOccurrences[101L])
    }

    @Test
    fun `scheduling repeatedly is idempotent, not additive`() = runTest {
        val alarm = Alarm(
            id = 1L,
            name = "Work",
            hour = 7,
            minute = 0,
            isEnabled = true,
            repeatType = RepeatType.WEEKLY,
            daysOfWeek = setOf(1, 2, 3, 4, 5),
            isConfirmationEnabled = true,
            confirmationHour = 21,
            confirmationMinute = 0,
        )
        repository.saveAlarm(alarm)
        val occurrenceTime = ZonedDateTime.of(2026, 9, 3, 7, 0, 0, 0, zone).toInstant().toEpochMilli()
        val occurrence = AlarmOccurrence(
            id = 101L,
            alarmId = 1L,
            scheduledTimeMillis = occurrenceTime,
            status = OccurrenceStatus.SCHEDULED,
            createdAt = now,
            updatedAt = now,
        )
        repository.saveOccurrence(occurrence)

        scheduleUseCase.execute(zone, now)
        scheduleUseCase.execute(zone, now)
        scheduleUseCase.execute(zone, now)

        val expected = ZonedDateTime.of(2026, 9, 2, 21, 0, 0, 0, zone).toInstant().toEpochMilli()
        assertEquals(expected, confirmationScheduler.scheduledOccurrences[101L])
        assertEquals(3, confirmationScheduler.scheduleCalls.size)
    }

    @Test
    fun `changing per-alarm confirmation time reschedules to the new time`() = runTest {
        val alarm = Alarm(
            id = 1L,
            name = "Work",
            hour = 7,
            minute = 0,
            isEnabled = true,
            repeatType = RepeatType.WEEKLY,
            daysOfWeek = setOf(1, 2, 3, 4, 5),
            isConfirmationEnabled = true,
            confirmationHour = 20,
            confirmationMinute = 30,
        )
        repository.saveAlarm(alarm)
        val occurrenceTime = ZonedDateTime.of(2026, 9, 3, 7, 0, 0, 0, zone).toInstant().toEpochMilli()
        val occurrence = AlarmOccurrence(
            id = 101L,
            alarmId = 1L,
            scheduledTimeMillis = occurrenceTime,
            status = OccurrenceStatus.SCHEDULED,
            createdAt = now,
            updatedAt = now,
        )
        repository.saveOccurrence(occurrence)

        scheduleUseCase.execute(zone, now)

        val expected = ZonedDateTime.of(2026, 9, 2, 20, 30, 0, 0, zone).toInstant().toEpochMilli()
        assertEquals(expected, confirmationScheduler.scheduledOccurrences[101L])
    }
}

