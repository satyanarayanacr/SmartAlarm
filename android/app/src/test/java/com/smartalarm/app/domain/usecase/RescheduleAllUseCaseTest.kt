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
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

class RescheduleAllUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var scheduler: FakeAlarmScheduler
    private lateinit var createUseCase: CreateOrUpdateAlarmUseCase
    private lateinit var rescheduleUseCase: RescheduleAllUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    private val now = ZonedDateTime.of(2026, 9, 2, 8, 0, 0, 0, zone).toInstant().toEpochMilli()

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        scheduler = FakeAlarmScheduler()
        val coordinator = AlarmSchedulingCoordinator(repository, scheduler)
        createUseCase = CreateOrUpdateAlarmUseCase(repository, coordinator)
        rescheduleUseCase = RescheduleAllUseCase(repository, coordinator)
    }

    @Test
    fun `boot recovery re-arms a still-future occurrence using the same occurrence id`() = runTest {
        createUseCase.execute(Alarm(name = "A", hour = 20, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now)
        val occurrenceId = repository.allOccurrences().single().id
        scheduler.cancel(occurrenceId) // simulate AlarmManager forgetting everything on reboot
        assertEquals(0, scheduler.activeCount())

        rescheduleUseCase.execute(zone, now)

        assertTrue(scheduler.isCurrentlyScheduled(occurrenceId))
        assertEquals(1, scheduler.activeCount()) // exactly one - no duplicate created
        assertEquals(1, repository.allOccurrences().size)
    }

    @Test
    fun `boot recovery marks a passed one-time occurrence MISSED and auto-disables the alarm`() = runTest {
        val alarm = createUseCase.execute(
            Alarm(name = "A", hour = 6, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now,
        )
        val occurrenceId = repository.allOccurrences().single().id
        scheduler.cancel(occurrenceId)

        // "now" is 08:00 and the alarm is for 06:00, so OccurrenceCalculator correctly rolls this
        // to *tomorrow* 06:00 (today's 6am already passed) - a boot time computed as a fixed
        // offset from `now` (e.g. +6h, still the same day) would land BEFORE that and this
        // occurrence would NOT actually be missed yet. Compute the boot time relative to the
        // occurrence's own scheduled time instead, so this test's premise ("device was off
        // through the alarm time") holds regardless of same-day-vs-rolled-over-day math.
        val scheduledAt = repository.getOccurrence(occurrenceId)!!.scheduledTimeMillis
        val bootTimeAfterMissedAlarm = scheduledAt + 3_600_000 // one hour after it should have rung
        rescheduleUseCase.execute(zone, bootTimeAfterMissedAlarm)

        val occurrence = repository.getOccurrence(occurrenceId)!!
        assertEquals(OccurrenceStatus.MISSED, occurrence.status)
        assertFalse(repository.getAlarm(alarm.id)!!.isEnabled)
        assertEquals(0, scheduler.activeCount()) // never fires retroactively
    }

    @Test
    fun `boot recovery schedules a weekly alarm's next occurrence after missing this week's`() = runTest {
        val alarm = createUseCase.execute(
            Alarm(name = "A", hour = 6, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = setOf(3)),
            zone,
            now,
        )
        val occurrenceId = repository.allOccurrences().single().id
        scheduler.cancel(occurrenceId)

        // Same reasoning as the ONE_TIME test above: compute the boot time relative to the
        // occurrence's own scheduled time (which for this fixture lands a full week out - Sep 2
        // 2026 is itself the target weekday, Wednesday, but 06:00 already passed by the 08:00
        // creation time), not a fixed offset from `now`.
        val scheduledAt = repository.getOccurrence(occurrenceId)!!.scheduledTimeMillis
        val bootTimeAfterMissedAlarm = scheduledAt + 3_600_000
        rescheduleUseCase.execute(zone, bootTimeAfterMissedAlarm)

        assertEquals(OccurrenceStatus.MISSED, repository.getOccurrence(occurrenceId)!!.status)
        assertTrue(repository.getAlarm(alarm.id)!!.isEnabled)
        assertEquals(1, scheduler.activeCount()) // exactly one fresh occurrence, no duplicates
        assertEquals(
            1,
            repository.allOccurrences().count { it.alarmId == alarm.id && it.status == OccurrenceStatus.SCHEDULED },
        )
    }

    @Test
    fun `boot recovery is a no-op when nothing was pending`() = runTest {
        rescheduleUseCase.execute(zone, now)
        assertEquals(0, scheduler.activeCount())
    }
}
