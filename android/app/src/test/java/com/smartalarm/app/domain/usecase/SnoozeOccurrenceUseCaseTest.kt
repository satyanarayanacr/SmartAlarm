package com.smartalarm.app.domain.usecase

import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.domain.model.RepeatType
import com.smartalarm.app.fakes.FakeAlarmRepository
import com.smartalarm.app.fakes.FakeAlarmScheduler
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

class SnoozeOccurrenceUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var scheduler: FakeAlarmScheduler
    private lateinit var createUseCase: CreateOrUpdateAlarmUseCase
    private lateinit var fireUseCase: AlarmFireUseCase
    private lateinit var snoozeUseCase: SnoozeOccurrenceUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    private val now = ZonedDateTime.of(2026, 9, 2, 8, 0, 0, 0, zone).toInstant().toEpochMilli()

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        scheduler = FakeAlarmScheduler()
        val coordinator = AlarmSchedulingCoordinator(repository, scheduler)
        createUseCase = CreateOrUpdateAlarmUseCase(repository, coordinator)
        fireUseCase = AlarmFireUseCase(repository, coordinator)
        snoozeUseCase = SnoozeOccurrenceUseCase(repository, scheduler)
    }

    @Test
    fun `snoozing a ringing occurrence reschedules it to now plus the snooze duration`() = runTest {
        createUseCase.execute(
            Alarm(
                name = "A", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME, snoozeDurationMinutes = 9,
            ),
            zone,
            now,
        )
        val occurrenceId = repository.allOccurrences().single().id
        fireUseCase.execute(occurrenceId, zone, now)

        val snoozeAtMillis = now + 3_600_000 // an hour after "now", when it actually rang
        val snoozed = snoozeUseCase.execute(occurrenceId, snoozeAtMillis)!!

        assertEquals(OccurrenceStatus.SNOOZED, snoozed.status)
        assertEquals(snoozeAtMillis + 9 * 60_000L, snoozed.scheduledTimeMillis)
        assertEquals(occurrenceId, snoozed.id) // same row, not a new occurrence
        assertEquals(1, scheduler.activeCount())
    }

    @Test
    fun `snoozing the same occurrence id never creates a duplicate scheduled alarm`() = runTest {
        createUseCase.execute(Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now)
        val occurrenceId = repository.allOccurrences().single().id
        fireUseCase.execute(occurrenceId, zone, now)

        snoozeUseCase.execute(occurrenceId, now + 1_000)
        snoozeUseCase.execute(occurrenceId, now + 2_000) // snooze again before it rings

        assertEquals(1, scheduler.activeCount())
        assertEquals(1, repository.allOccurrences().size) // still one occurrence row total
    }

    @Test
    fun `snoozing a dismissed occurrence is rejected`() = runTest {
        createUseCase.execute(Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now)
        val occurrenceId = repository.allOccurrences().single().id
        fireUseCase.execute(occurrenceId, zone, now)
        DismissOccurrenceUseCase(repository, scheduler).execute(occurrenceId, now)

        val result = snoozeUseCase.execute(occurrenceId, now + 1_000)

        assertNull(result)
    }
}
