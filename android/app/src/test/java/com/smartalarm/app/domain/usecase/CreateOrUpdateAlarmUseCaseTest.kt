package com.smartalarm.app.domain.usecase

import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.domain.model.RepeatType
import com.smartalarm.app.fakes.FakeAlarmRepository
import com.smartalarm.app.fakes.FakeAlarmScheduler
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

class CreateOrUpdateAlarmUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var scheduler: FakeAlarmScheduler
    private lateinit var confirmationScheduler: com.smartalarm.app.fakes.FakeConfirmationScheduler
    private lateinit var useCase: CreateOrUpdateAlarmUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    private val now = ZonedDateTime.of(2026, 9, 2, 8, 0, 0, 0, zone).toInstant().toEpochMilli()

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        scheduler = FakeAlarmScheduler()
        confirmationScheduler = com.smartalarm.app.fakes.FakeConfirmationScheduler()
        useCase = CreateOrUpdateAlarmUseCase(
            repository,
            AlarmSchedulingCoordinator(repository, scheduler, confirmationScheduler),
        )
    }

    @Test
    fun `creating a new enabled alarm schedules exactly one occurrence`() = runTest {
        val alarm = Alarm(name = "Wake up", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME)
        val saved = useCase.execute(alarm, zone, now)

        assertTrue(saved.id != 0L)
        assertEquals(1, scheduler.activeCount())
        assertEquals(1, repository.allOccurrences().count { it.status == OccurrenceStatus.SCHEDULED })
    }

    @Test
    fun `creating alarm with confirmation enabled schedules confirmation for tomorrow occurrence`() = runTest {
        val alarm = Alarm(
            name = "Wake up",
            hour = 9,
            minute = 0,
            repeatType = RepeatType.WEEKLY,
            daysOfWeek = setOf(4), // Thursday (tomorrow relative to Wed Sep 2)
            isConfirmationEnabled = true,
            confirmationHour = 21,
            confirmationMinute = 0,
        )
        val saved = useCase.execute(alarm, zone, now)

        assertTrue(saved.id != 0L)
        assertEquals(1, scheduler.activeCount())
        assertEquals(1, confirmationScheduler.scheduledOccurrences.size)
    }

    @Test
    fun `editing an alarm cancels the previous occurrence and schedules exactly one new one`() = runTest {
        val original = useCase.execute(
            Alarm(name = "Wake up", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now,
        )
        assertEquals(1, scheduler.activeCount())

        val edited = useCase.execute(original.copy(hour = 10), zone, now)

        // Duplicate-scheduling prevention: still exactly one active occurrence, at the new time.
        assertEquals(1, scheduler.activeCount())
        assertEquals(1, scheduler.cancelCalls.size)
        val activeOccurrence = repository.allOccurrences().single { it.status == OccurrenceStatus.SCHEDULED }
        assertEquals(edited.id, activeOccurrence.alarmId)
    }

    @Test
    fun `createdAt is preserved across edits, updatedAt changes`() = runTest {
        val created = useCase.execute(
            Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now,
        )
        val laterMillis = now + 60_000
        val edited = useCase.execute(created.copy(name = "B"), zone, laterMillis)

        assertEquals(created.createdAt, edited.createdAt)
        assertEquals(laterMillis, edited.updatedAt)
    }

    @Test
    fun `creating a disabled alarm schedules nothing`() = runTest {
        val alarm = Alarm(
            name = "Off", hour = 9, minute = 0, isEnabled = false, repeatType = RepeatType.ONE_TIME,
        )
        useCase.execute(alarm, zone, now)
        assertEquals(0, scheduler.activeCount())
    }
}
