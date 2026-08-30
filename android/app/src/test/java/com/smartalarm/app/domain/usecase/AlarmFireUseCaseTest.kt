package com.smartalarm.app.domain.usecase

import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.domain.model.RepeatType
import com.smartalarm.app.fakes.FakeAlarmRepository
import com.smartalarm.app.fakes.FakeAlarmScheduler
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

class AlarmFireUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var scheduler: FakeAlarmScheduler
    private lateinit var createUseCase: CreateOrUpdateAlarmUseCase
    private lateinit var fireUseCase: AlarmFireUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    private val now = ZonedDateTime.of(2026, 9, 2, 8, 0, 0, 0, zone).toInstant().toEpochMilli()

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        scheduler = FakeAlarmScheduler()
        val coordinator = AlarmSchedulingCoordinator(repository, scheduler)
        createUseCase = CreateOrUpdateAlarmUseCase(repository, coordinator)
        fireUseCase = AlarmFireUseCase(repository, coordinator)
    }

    @Test
    fun `firing a one-time alarm marks it FIRED and auto-disables the parent alarm`() = runTest {
        val alarm = createUseCase.execute(
            Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now,
        )
        val occurrenceId = repository.allOccurrences().single().id

        val result = fireUseCase.execute(occurrenceId, zone, now)!!

        assertEquals(OccurrenceStatus.FIRED, result.occurrence.status)
        assertFalse(result.alarm.isEnabled)
        assertEquals(0, scheduler.activeCount()) // no next occurrence for a fired one-time alarm
    }

    @Test
    fun `firing a weekly alarm schedules the following week's occurrence and keeps alarm enabled`() = runTest {
        val alarm = createUseCase.execute(
            Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = setOf(3)),
            zone,
            now,
        )
        val occurrenceId = repository.allOccurrences().single().id

        val result = fireUseCase.execute(occurrenceId, zone, now)!!

        assertEquals(OccurrenceStatus.FIRED, result.occurrence.status)
        assertTrue(result.alarm.isEnabled)
        // The fired occurrence is cancelled/replaced by exactly one new SCHEDULED occurrence.
        assertEquals(1, scheduler.activeCount())
        assertEquals(
            1,
            repository.allOccurrences().count { it.alarmId == alarm.id && it.status == OccurrenceStatus.SCHEDULED },
        )
    }

    @Test
    fun `firing the same occurrence twice is ignored the second time`() = runTest {
        createUseCase.execute(Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now)
        val occurrenceId = repository.allOccurrences().single().id

        val first = fireUseCase.execute(occurrenceId, zone, now)
        val second = fireUseCase.execute(occurrenceId, zone, now)

        assertTrue(first != null)
        assertNull(second) // duplicate/stale broadcast redelivery must be a no-op
    }

    @Test
    fun `firing an unknown occurrence id is a no-op`() = runTest {
        assertNull(fireUseCase.execute(occurrenceId = 12345L, zone = zone, nowMillis = now))
    }
}
