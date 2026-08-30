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
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

class SkipOccurrenceUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var scheduler: FakeAlarmScheduler
    private lateinit var createUseCase: CreateOrUpdateAlarmUseCase
    private lateinit var skipUseCase: SkipOccurrenceUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    private val now = ZonedDateTime.of(2026, 9, 2, 20, 0, 0, 0, zone).toInstant().toEpochMilli() // Wed 8pm
    private val confirmationFiresAt = ZonedDateTime.of(2026, 9, 2, 21, 0, 0, 0, zone).toInstant().toEpochMilli() // Wed 9pm

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        scheduler = FakeAlarmScheduler()
        val coordinator = AlarmSchedulingCoordinator(repository, scheduler)
        createUseCase = CreateOrUpdateAlarmUseCase(repository, coordinator)
        skipUseCase = SkipOccurrenceUseCase(repository, coordinator)
    }

    // Spec test 10 + case 1 (race conditions).
    @Test
    fun `skipping an occurrence does not disable the recurring alarm`() = runTest {
        val alarm = createUseCase.execute(
            Alarm(name = "Wake Up", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = (1..7).toSet()),
            zone,
            now,
        )
        val occurrenceId = repository.allOccurrences().single().id // Thu Sep 3, 7am

        skipUseCase.execute(occurrenceId, zone, confirmationFiresAt)

        assertTrue(repository.getAlarm(alarm.id)!!.isEnabled)
        assertEquals(OccurrenceStatus.SKIPPED, repository.getOccurrence(occurrenceId)!!.status)
        assertEquals(0, scheduler.activeCount()) // AlarmManager entry cancelled for the skipped occurrence...
    }

    // Spec test 11 + spec example: "Monday skipped, Tuesday remains scheduled".
    @Test
    fun `skipping one occurrence schedules the following day, not the same day again`() = runTest {
        createUseCase.execute(
            Alarm(name = "Wake Up", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = (1..7).toSet()),
            zone,
            now,
        )
        val skippedOccurrence = repository.allOccurrences().single() // Thu Sep 3, 7am

        skipUseCase.execute(skippedOccurrence.id, zone, confirmationFiresAt)

        val allOccurrences = repository.allOccurrences()
        assertEquals(2, allOccurrences.size) // the skipped one + the freshly scheduled next one
        val freshOccurrence = allOccurrences.single { it.id != skippedOccurrence.id }
        val freshDate = ZonedDateTime.ofInstant(
            java.time.Instant.ofEpochMilli(freshOccurrence.scheduledTimeMillis), zone,
        ).toLocalDate()
        assertEquals(java.time.LocalDate.of(2026, 9, 4), freshDate) // Friday, the day AFTER the skipped Thursday
        assertEquals(OccurrenceStatus.SCHEDULED, freshOccurrence.status)
        assertTrue(scheduler.isCurrentlyScheduled(freshOccurrence.id))
        assertTrue(!scheduler.isCurrentlyScheduled(skippedOccurrence.id))
    }

    // Spec race case 4 / test 15: duplicate skip is safe and does not double-schedule.
    @Test
    fun `skipping the same occurrence twice is idempotent`() = runTest {
        createUseCase.execute(
            Alarm(name = "Wake Up", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = (1..7).toSet()),
            zone,
            now,
        )
        val occurrenceId = repository.allOccurrences().single().id

        skipUseCase.execute(occurrenceId, zone, confirmationFiresAt)
        skipUseCase.execute(occurrenceId, zone, confirmationFiresAt) // second call - must not schedule a 2nd "next" occurrence

        assertEquals(2, repository.allOccurrences().size) // still just skipped + one next, not two nexts
    }

    // Spec race case 3: an occurrence that already fired must not be modified by confirmation processing.
    @Test
    fun `skipping an already-fired occurrence does not modify it`() = runTest {
        createUseCase.execute(
            Alarm(name = "Wake Up", hour = 7, minute = 0, repeatType = RepeatType.ONE_TIME),
            zone,
            now,
        )
        val occurrenceId = repository.allOccurrences().single().id
        val fireUseCase = AlarmFireUseCase(repository, AlarmSchedulingCoordinator(repository, scheduler))
        fireUseCase.execute(occurrenceId, zone, now + 1)

        val result = skipUseCase.execute(occurrenceId, zone, confirmationFiresAt)

        assertEquals(OccurrenceStatus.FIRED, result!!.status) // unchanged - never overwritten to SKIPPED
    }

    @Test
    fun `skipping an unknown occurrence id is a no-op`() = runTest {
        val result = skipUseCase.execute(999L, zone, confirmationFiresAt)
        assertNull(result)
    }
}
