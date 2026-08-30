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

class KeepOccurrenceUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var scheduler: FakeAlarmScheduler
    private lateinit var createUseCase: CreateOrUpdateAlarmUseCase
    private lateinit var keepUseCase: KeepOccurrenceUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    private val now = ZonedDateTime.of(2026, 9, 2, 20, 0, 0, 0, zone).toInstant().toEpochMilli()

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        scheduler = FakeAlarmScheduler()
        val coordinator = AlarmSchedulingCoordinator(repository, scheduler)
        createUseCase = CreateOrUpdateAlarmUseCase(repository, coordinator)
        keepUseCase = KeepOccurrenceUseCase(repository)
    }

    // Spec test 12.
    @Test
    fun `keeping an occurrence leaves it scheduled and unchanged`() = runTest {
        createUseCase.execute(
            Alarm(name = "Wake Up", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = (1..7).toSet()),
            zone,
            now,
        )
        val occurrence = repository.allOccurrences().single()

        val result = keepUseCase.execute(occurrence.id)

        assertEquals(occurrence, result)
        assertEquals(OccurrenceStatus.SCHEDULED, repository.getOccurrence(occurrence.id)!!.status)
        assertTrue(scheduler.isCurrentlyScheduled(occurrence.id))
    }

    // Spec test 13: no response (i.e. neither keep nor skip is ever called) must leave the
    // occurrence exactly as scheduled - there is nothing to "expire" it.
    @Test
    fun `an occurrence nobody responds to stays scheduled`() = runTest {
        createUseCase.execute(
            Alarm(name = "Wake Up", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = (1..7).toSet()),
            zone,
            now,
        )
        val occurrence = repository.allOccurrences().single()

        // Simulates the confirmation notification being shown and never acted on.
        assertEquals(OccurrenceStatus.SCHEDULED, repository.getOccurrence(occurrence.id)!!.status)
        assertTrue(scheduler.isCurrentlyScheduled(occurrence.id))
    }
}
