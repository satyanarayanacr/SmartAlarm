package com.smartalarm.app.domain.usecase

import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.domain.model.RepeatType
import com.smartalarm.app.fakes.FakeAlarmRepository
import com.smartalarm.app.fakes.FakeAlarmScheduler
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

/** Covers the review screen's batch actions: Keep All, Skip All, Keep Selected, Skip Selected. */
class BatchKeepSkipOccurrencesUseCaseTest {

    private lateinit var repository: FakeAlarmRepository
    private lateinit var scheduler: FakeAlarmScheduler
    private lateinit var createUseCase: CreateOrUpdateAlarmUseCase
    private lateinit var keepOccurrencesUseCase: KeepOccurrencesUseCase
    private lateinit var skipOccurrencesUseCase: SkipOccurrencesUseCase
    private val zone = ZoneId.of("Asia/Kolkata")
    private val now = ZonedDateTime.of(2026, 9, 2, 20, 0, 0, 0, zone).toInstant().toEpochMilli()
    private val confirmationFiresAt = ZonedDateTime.of(2026, 9, 2, 21, 0, 0, 0, zone).toInstant().toEpochMilli()

    private var wakeUpOccurrenceId: Long = 0L
    private var officeOccurrenceId: Long = 0L
    private var gymOccurrenceId: Long = 0L

    @Before
    fun setUp() = runTest {
        repository = FakeAlarmRepository()
        scheduler = FakeAlarmScheduler()
        val coordinator = AlarmSchedulingCoordinator(repository, scheduler)
        createUseCase = CreateOrUpdateAlarmUseCase(repository, coordinator)
        keepOccurrencesUseCase = KeepOccurrencesUseCase(KeepOccurrenceUseCase(repository))
        skipOccurrencesUseCase = SkipOccurrencesUseCase(SkipOccurrenceUseCase(repository, coordinator))

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
        val occurrences = repository.allOccurrences()
        wakeUpOccurrenceId = occurrences.first { repository.getAlarm(it.alarmId)?.name == "Wake Up" }.id
        officeOccurrenceId = occurrences.first { repository.getAlarm(it.alarmId)?.name == "Office" }.id
        gymOccurrenceId = occurrences.first { repository.getAlarm(it.alarmId)?.name == "Gym" }.id
    }

    // Spec test 6.
    @Test
    fun `keep all leaves every occurrence scheduled`() = runTest {
        keepOccurrencesUseCase.execute(listOf(wakeUpOccurrenceId, officeOccurrenceId, gymOccurrenceId))

        listOf(wakeUpOccurrenceId, officeOccurrenceId, gymOccurrenceId).forEach {
            assertEquals(OccurrenceStatus.SCHEDULED, repository.getOccurrence(it)!!.status)
        }
    }

    // Spec test 7.
    @Test
    fun `skip all marks every occurrence skipped`() = runTest {
        skipOccurrencesUseCase.execute(listOf(wakeUpOccurrenceId, officeOccurrenceId, gymOccurrenceId), zone, confirmationFiresAt)

        listOf(wakeUpOccurrenceId, officeOccurrenceId, gymOccurrenceId).forEach {
            assertEquals(OccurrenceStatus.SKIPPED, repository.getOccurrence(it)!!.status)
        }
    }

    // Spec test 8.
    @Test
    fun `keep selected only touches the chosen subset`() = runTest {
        keepOccurrencesUseCase.execute(listOf(wakeUpOccurrenceId))

        assertEquals(OccurrenceStatus.SCHEDULED, repository.getOccurrence(wakeUpOccurrenceId)!!.status)
        // Untouched occurrences are unaffected either way - Keep is a no-op, so this mainly proves
        // the batch use case doesn't touch anything outside the given id list.
        assertEquals(OccurrenceStatus.SCHEDULED, repository.getOccurrence(officeOccurrenceId)!!.status)
    }

    // Spec test 9 + spec example: "7:00 AM SKIPPED, 8:30 AM KEPT".
    @Test
    fun `skip selected only skips the chosen subset, others remain kept`() = runTest {
        skipOccurrencesUseCase.execute(listOf(wakeUpOccurrenceId), zone, confirmationFiresAt)

        assertEquals(OccurrenceStatus.SKIPPED, repository.getOccurrence(wakeUpOccurrenceId)!!.status)
        assertEquals(OccurrenceStatus.SCHEDULED, repository.getOccurrence(officeOccurrenceId)!!.status)
        assertEquals(OccurrenceStatus.SCHEDULED, repository.getOccurrence(gymOccurrenceId)!!.status)
    }
}
