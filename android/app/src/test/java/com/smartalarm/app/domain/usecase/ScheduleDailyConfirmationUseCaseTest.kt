package com.smartalarm.app.domain.usecase

import com.smartalarm.app.domain.model.ConfirmationSettings
import com.smartalarm.app.fakes.FakeAlarmRepository
import com.smartalarm.app.fakes.FakeConfirmationScheduler
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

class ScheduleDailyConfirmationUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var confirmationScheduler: FakeConfirmationScheduler
    private lateinit var scheduleUseCase: ScheduleDailyConfirmationUseCase
    private lateinit var updateSettingsUseCase: UpdateConfirmationSettingsUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    private val now = ZonedDateTime.of(2026, 9, 2, 8, 0, 0, 0, zone).toInstant().toEpochMilli()

    @Before
    fun setUp() {
        repository = FakeAlarmRepository()
        confirmationScheduler = FakeConfirmationScheduler()
        scheduleUseCase = ScheduleDailyConfirmationUseCase(repository, confirmationScheduler)
        updateSettingsUseCase = UpdateConfirmationSettingsUseCase(repository, scheduleUseCase)
    }

    @Test
    fun `enabled default settings schedule today's confirmation time`() = runTest {
        scheduleUseCase.execute(zone, now)

        val expected = ZonedDateTime.of(2026, 9, 2, 21, 0, 0, 0, zone).toInstant().toEpochMilli()
        assertEquals(expected, confirmationScheduler.scheduledAtMillis)
    }

    // Spec test 17.
    @Test
    fun `disabling the global setting cancels and schedules nothing`() = runTest {
        scheduleUseCase.execute(zone, now) // starts out enabled by default - something is scheduled
        updateSettingsUseCase.execute(ConfirmationSettings(isEnabled = false), zone, now)

        assertNull(confirmationScheduler.scheduledAtMillis)
        assertEquals(1, confirmationScheduler.cancelCallCount)
    }

    // Spec test 14: duplicate confirmation processing (here, duplicate scheduling calls) is safe.
    @Test
    fun `scheduling repeatedly is idempotent, not additive`() = runTest {
        scheduleUseCase.execute(zone, now)
        scheduleUseCase.execute(zone, now)
        scheduleUseCase.execute(zone, now)

        assertEquals(3, confirmationScheduler.scheduleCalls.size) // each call recorded...
        assertEquals(1, confirmationScheduler.scheduleCalls.toSet().size) // ...but always the same single trigger time
    }

    @Test
    fun `changing the confirmation time reschedules to the new time`() = runTest {
        scheduleUseCase.execute(zone, now)
        updateSettingsUseCase.execute(ConfirmationSettings(isEnabled = true, hour = 20, minute = 30), zone, now)

        val expected = ZonedDateTime.of(2026, 9, 2, 20, 30, 0, 0, zone).toInstant().toEpochMilli()
        assertEquals(expected, confirmationScheduler.scheduledAtMillis)
    }
}
