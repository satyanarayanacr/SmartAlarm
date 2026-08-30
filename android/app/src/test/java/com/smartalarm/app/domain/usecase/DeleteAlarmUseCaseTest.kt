package com.smartalarm.app.domain.usecase

import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.Alarm
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

class DeleteAlarmUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var scheduler: FakeAlarmScheduler
    private lateinit var createUseCase: CreateOrUpdateAlarmUseCase
    private lateinit var deleteUseCase: DeleteAlarmUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    private val now = ZonedDateTime.of(2026, 9, 2, 8, 0, 0, 0, zone).toInstant().toEpochMilli()

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        scheduler = FakeAlarmScheduler()
        val coordinator = AlarmSchedulingCoordinator(repository, scheduler)
        createUseCase = CreateOrUpdateAlarmUseCase(repository, coordinator)
        deleteUseCase = DeleteAlarmUseCase(repository, coordinator)
    }

    @Test
    fun `deleting an alarm cancels its OS alarm and removes it and its occurrences`() = runTest {
        val alarm = createUseCase.execute(
            Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now,
        )
        assertEquals(1, scheduler.activeCount())

        deleteUseCase.execute(alarm)

        assertEquals(0, scheduler.activeCount())
        assertNull(repository.getAlarm(alarm.id))
        assertEquals(0, repository.allOccurrences().count { it.alarmId == alarm.id })
    }

    @Test
    fun `deleting one alarm never cancels a sibling alarm's schedule`() = runTest {
        val alarmA = createUseCase.execute(
            Alarm(name = "A", hour = 9, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now,
        )
        createUseCase.execute(Alarm(name = "B", hour = 10, minute = 0, repeatType = RepeatType.ONE_TIME), zone, now)

        deleteUseCase.execute(alarmA)

        assertEquals(1, scheduler.activeCount())
    }
}
