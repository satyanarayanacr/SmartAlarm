package com.smartalarm.app.domain.usecase

import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.Alarm
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

class ToggleAlarmEnabledUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var scheduler: FakeAlarmScheduler
    private lateinit var createUseCase: CreateOrUpdateAlarmUseCase
    private lateinit var toggleUseCase: ToggleAlarmEnabledUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    private val now = ZonedDateTime.of(2026, 9, 2, 8, 0, 0, 0, zone).toInstant().toEpochMilli()

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        scheduler = FakeAlarmScheduler()
        val coordinator = AlarmSchedulingCoordinator(repository, scheduler)
        createUseCase = CreateOrUpdateAlarmUseCase(repository, coordinator)
        toggleUseCase = ToggleAlarmEnabledUseCase(repository, coordinator)
    }

    @Test
    fun `disabling an alarm cancels its scheduled occurrence`() = runTest {
        val alarm = createUseCase.execute(
            Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now,
        )
        assertEquals(1, scheduler.activeCount())

        val updated = toggleUseCase.execute(alarm.id, isEnabled = false, zone = zone, nowMillis = now)

        assertFalse(updated!!.isEnabled)
        assertEquals(0, scheduler.activeCount())
    }

    @Test
    fun `re-enabling an alarm schedules a fresh occurrence`() = runTest {
        val alarm = createUseCase.execute(
            Alarm(name = "A", hour = 9, minute = 0, isEnabled = false, repeatType = RepeatType.ONE_TIME), zone, now,
        )
        assertEquals(0, scheduler.activeCount())

        val updated = toggleUseCase.execute(alarm.id, isEnabled = true, zone = zone, nowMillis = now)

        assertTrue(updated!!.isEnabled)
        assertEquals(1, scheduler.activeCount())
    }

    @Test
    fun `disabling one alarm never touches another alarm's schedule`() = runTest {
        val alarmA = createUseCase.execute(
            Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now,
        )
        createUseCase.execute(Alarm(name = "B", hour = 10, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now)
        assertEquals(2, scheduler.activeCount())

        toggleUseCase.execute(alarmA.id, isEnabled = false, zone = zone, nowMillis = now)

        assertEquals(1, scheduler.activeCount())
    }

    @Test
    fun `toggling an unknown alarm id returns null and schedules nothing`() = runTest {
        val result = toggleUseCase.execute(alarmId = 999L, isEnabled = true, zone = zone, nowMillis = now)
        assertEquals(null, result)
        assertEquals(0, scheduler.activeCount())
    }
}
