package com.smartalarm.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.smartalarm.app.data.local.entity.AlarmOccurrenceEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface AlarmOccurrenceDao {
    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun insert(occurrence: AlarmOccurrenceEntity): Long

    @Update
    suspend fun update(occurrence: AlarmOccurrenceEntity)

    @Query("SELECT * FROM alarm_occurrences ORDER BY scheduledTimeMillis ASC")
    fun observeAll(): Flow<List<AlarmOccurrenceEntity>>

    @Query("SELECT * FROM alarm_occurrences WHERE id = :occurrenceId")
    suspend fun getById(occurrenceId: Long): AlarmOccurrenceEntity?

    // "Pending" means SCHEDULED or SNOOZED - both represent an occurrence AlarmManager currently
    // has an exact alarm armed for. Treating them separately here would let boot recovery forget
    // a snoozed alarm across a reboot (see RescheduleAllUseCase).
    @Query(
        "SELECT * FROM alarm_occurrences WHERE alarmId = :alarmId AND status IN ('SCHEDULED', 'SNOOZED') " +
            "ORDER BY scheduledTimeMillis ASC"
    )
    suspend fun getPendingForAlarm(alarmId: Long): List<AlarmOccurrenceEntity>

    @Query("SELECT * FROM alarm_occurrences WHERE status IN ('SCHEDULED', 'SNOOZED')")
    suspend fun getAllPending(): List<AlarmOccurrenceEntity>

    // Phase 1.1: the daily confirmation flow only ever asks about occurrences that are still
    // SCHEDULED (never SNOOZED - a snoozed occurrence belongs to today's ring, not tomorrow's
    // recurring schedule) and whose scheduled time falls within a given calendar-day window
    // (see ConfirmationTimeCalculator.tomorrowRange). [endMillis] is exclusive.
    @Query(
        "SELECT * FROM alarm_occurrences WHERE status = 'SCHEDULED' " +
            "AND scheduledTimeMillis >= :startMillis AND scheduledTimeMillis < :endMillis " +
            "ORDER BY scheduledTimeMillis ASC"
    )
    suspend fun getScheduledInRange(startMillis: Long, endMillis: Long): List<AlarmOccurrenceEntity>
}
