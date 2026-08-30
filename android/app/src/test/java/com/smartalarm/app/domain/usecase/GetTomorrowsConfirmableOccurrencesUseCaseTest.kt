package com.smartalarm.app.domain.usecase

import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.Alarm
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

class GetTomorrowsConfirmableOccurrencesUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var createUseCase: CreateOrUpdateAlarmUseCase
    private lateinit var getTomorrowsUseCase: GetTomorrowsConfirmableOccurrencesUseCase
    private val zone = ZoneId.of("Asia/Kolkata")

    // Wed Sep 2 2026, 8pm - before the 9pm confirmation time, so each alarm's "next occurrence"
    // naturally lands on tomorrow (Thu Sep 3) for a WEEKLY alarm covering every day.
    private val now = ZonedDateTime.of(2026, 9, 2, 20, 0, 0, 0, zone).toInstant().toEpochMilli()
    private val confirmationFiresAt = ZonedDateTime.of(2026, 9, 2, 21, 0, 0, 0, zone).toInstant()

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        val scheduler = FakeAlarmScheduler()
        val coordinator = AlarmSchedulingCoordinator(repository, scheduler)
        createUseCase = CreateOrUpdateAlarmUseCase(repository, coordinator)
        getTomorrowsUseCase = GetTomorrowsConfirmableOccurrencesUseCase(repository)
    }

    // Spec test 1.
    @Test
    fun `weekly alarm scheduled for tomorrow requires confirmation`() = runTest {
        createUseCase.execute(
            Alarm(name = "Wake Up", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = (1..7).toSet()),
            zone,
            now,
        )

        val confirmable = getTomorrowsUseCase.execute(zone, confirmationFiresAt)

        assertEquals(1, confirmable.size)
        assertEquals("Wake Up", confirmable.single().alarm.name)
    }

    // Spec test 2.
    @Test
    fun `one-time alarm scheduled for tomorrow does not require confirmation`() = runTest {
        createUseCase.execute(
            Alarm(name = "Flight", hour = 7, minute = 0, repeatType = RepeatType.ONE_TIME),
            zone,
            now,
        )

        val confirmable = getTomorrowsUseCase.execute(zone, confirmationFiresAt)

        assertTrue(confirmable.isEmpty())
    }

    // Spec test 5.
    @Test
    fun `multiple weekly alarms for tomorrow are all returned`() = runTest {
        createUseCase.execute(
            Alarm(name = "Wake Up", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = (1..7).toSet()),
            zone,
            now,
        )
        createUseCase.execute(
            Alarm(name = "Office", hour = 8, minute = 30, repeatType = RepeatType.WEEKLY, daysOfWeek = (1..7).toSet()),
            zone,
            now,
        )
        createUseCase.execute(
            Alarm(name = "Gym", hour = 18, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = (1..7).toSet()),
            zone,
            now,
        )
        // A one-time alarm for tomorrow, mixed in, must not appear.
        createUseCase.execute(Alarm(name = "Flight", hour = 6, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now)

        val confirmable = getTomorrowsUseCase.execute(zone, confirmationFiresAt)

        assertEquals(3, confirmable.size)
        assertEquals(setOf("Wake Up", "Office", "Gym"), confirmable.map { it.alarm.name }.toSet())
    }

    @Test
    fun `weekly alarm not scheduled for tomorrow is excluded`() = runTest {
        // Only Fridays (day 5) - Thu Sep 3 is not a match, so nothing should be confirmable.
        createUseCase.execute(
            Alarm(name = "Weekly Review", hour = 7, minute = 0, repeatType = RepeatType.WEEKLY, daysOfWeek = setOf(5)),
            zone,
            now,
        )

        val confirmable = getTomorrowsUseCase.execute(zone, confirmationFiresAt)

        assertTrue(confirmable.isEmpty())
    }

    @Test
    fun `weekly alarm with confirmation disabled is excluded`() = runTest {
        createUseCase.execute(
            Alarm(
                name = "Silent Wake Up",
                hour = 7,
                minute = 0,
                repeatType = RepeatType.WEEKLY,
                daysOfWeek = (1..7).toSet(),
                isConfirmationEnabled = false,
            ),
            zone,
            now,
        )

        val confirmable = getTomorrowsUseCase.execute(zone, confirmationFiresAt)

        assertTrue(confirmable.isEmpty())
    }
}
