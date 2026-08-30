package com.smartalarm.app.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.OccurrenceStatus

/**
 * Room table for individual scheduled occurrences. `CASCADE` delete keeps this table consistent
 * whenever an [AlarmEntity] is deleted (see DeleteAlarmUseCase, which cancels the Android alarm
 * *before* deleting the row, since AlarmManager state is never implicitly cleaned up by Room).
 */
@Entity(
    tableName = "alarm_occurrences",
    foreignKeys = [
        ForeignKey(
            entity = AlarmEntity::class,
            parentColumns = ["id"],
            childColumns = ["alarmId"],
            onDelete = ForeignKey.CASCADE,
        )
    ],
    indices = [Index("alarmId")],
)
data class AlarmOccurrenceEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0L,
    val alarmId: Long,
    val scheduledTimeMillis: Long,
    val status: String,
    val isVibrationEnabled: Boolean,
    val snoozeDurationMinutes: Int,
    val createdAt: Long,
    val updatedAt: Long,
)

fun AlarmOccurrenceEntity.toDomain(): AlarmOccurrence = AlarmOccurrence(
    id = id,
    alarmId = alarmId,
    scheduledTimeMillis = scheduledTimeMillis,
    status = OccurrenceStatus.valueOf(status),
    isVibrationEnabled = isVibrationEnabled,
    snoozeDurationMinutes = snoozeDurationMinutes,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun AlarmOccurrence.toEntity(): AlarmOccurrenceEntity = AlarmOccurrenceEntity(
    id = id,
    alarmId = alarmId,
    scheduledTimeMillis = scheduledTimeMillis,
    status = status.name,
    isVibrationEnabled = isVibrationEnabled,
    snoozeDurationMinutes = snoozeDurationMinutes,
    createdAt = createdAt,
    updatedAt = updatedAt,
)
