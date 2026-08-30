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

class DismissOccurrenceUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var scheduler: FakeAlarmScheduler
    private lateinit var createUseCase: CreateOrUpdateAlarmUseCase
    private lateinit var fireUseCase: AlarmFireUseCase
    private lateinit var dismissUseCase: DismissOccurrenceUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    private val now = ZonedDateTime.of(2026, 9, 2, 8, 0, 0, 0, zone).toInstant().toEpochMilli()

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        scheduler = FakeAlarmScheduler()
        val coordinator = AlarmSchedulingCoordinator(repository, scheduler)
        createUseCase = CreateOrUpdateAlarmUseCase(repository, coordinator)
        fireUseCase = AlarmFireUseCase(repository, coordinator)
        dismissUseCase = DismissOccurrenceUseCase(repository, scheduler)
    }

    @Test
    fun `dismissing a weekly alarm's occurrence never cancels next week's occurrence`() = runTest {
        val alarm = createUseCase.execute(
            Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = setOf(3)),
            zone,
            now,
        )
        val firstOccurrenceId = repository.allOccurrences().single().id
        fireUseCase.execute(firstOccurrenceId, zone, now) // schedules next week's occurrence

        dismissUseCase.execute(firstOccurrenceId, now)

        val nextWeekOccurrence = repository.allOccurrences()
            .single { it.alarmId == alarm.id && it.status == OccurrenceStatus.SCHEDULED }
        assertTrue(scheduler.isCurrentlyScheduled(nextWeekOccurrence.id))
        assertEquals(1, scheduler.activeCount())
    }

    @Test
    fun `dismissing never re-enables or disables the parent alarm`() = runTest {
        val alarm = createUseCase.execute(
            Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = setOf(3)),
            zone,
            now,
        )
        val occurrenceId = repository.allOccurrences().single().id
        fireUseCase.execute(occurrenceId, zone, now)

        dismissUseCase.execute(occurrenceId, now)

        assertTrue(repository.getAlarm(alarm.id)!!.isEnabled)
    }

    @Test
    fun `dismissing twice is idempotent`() = runTest {
        createUseCase.execute(Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now)
        val occurrenceId = repository.allOccurrences().single().id
        fireUseCase.execute(occurrenceId, zone, now)

        val first = dismissUseCase.execute(occurrenceId, now)!!
        val second = dismissUseCase.execute(occurrenceId, now + 1_000)!!

        assertEquals(OccurrenceStatus.DISMISSED, first.status)
        assertEquals(OccurrenceStatus.DISMISSED, second.status)
        assertEquals(first.updatedAt, second.updatedAt) // second call was a genuine no-op
    }
}
