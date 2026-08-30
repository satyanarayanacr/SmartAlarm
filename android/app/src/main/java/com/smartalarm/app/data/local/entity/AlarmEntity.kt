package com.smartalarm.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.RepeatType

/**
 * Room table for alarm rules. Kept schema-forward-compatible for future phases: rather than
 * widening this table with Phase 2-4 columns now, later phases are expected to add new nullable
 * columns via a real Room [androidx.room.migration.Migration] (see [com.smartalarm.app.data.local.SmartAlarmDatabase]),
 * never a destructive fallback.
 */
@Entity(tableName = "alarms")
data class AlarmEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0L,
    val name: String,
    val hour: Int,
    val minute: Int,
    val isEnabled: Boolean,
    val repeatType: String,
    /** Comma-separated ISO day-of-week ints (1=Mon..7=Sun), e.g. "1,2,3,4,5". Empty for ONE_TIME. */
    val daysOfWeek: String,
    val isVibrationEnabled: Boolean,
    val isSnoozeEnabled: Boolean,
    val snoozeDurationMinutes: Int,
    val createdAt: Long,
    val updatedAt: Long,
)

fun AlarmEntity.toDomain(): Alarm = Alarm(
    id = id,
    name = name,
    hour = hour,
    minute = minute,
    isEnabled = isEnabled,
    repeatType = RepeatType.valueOf(repeatType),
    daysOfWeek = if (daysOfWeek.isBlank()) emptySet() else daysOfWeek.split(",").map { it.trim().toInt() }.toSet(),
    isVibrationEnabled = isVibrationEnabled,
    isSnoozeEnabled = isSnoozeEnabled,
    snoozeDurationMinutes = snoozeDurationMinutes,
    createdAt = createdAt,
    updatedAt = updatedAt,
)

fun Alarm.toEntity(): AlarmEntity = AlarmEntity(
    id = id,
    name = name,
    hour = hour,
    minute = minute,
    isEnabled = isEnabled,
    repeatType = repeatType.name,
    daysOfWeek = daysOfWeek.sorted().joinToString(","),
    isVibrationEnabled = isVibrationEnabled,
    isSnoozeEnabled = isSnoozeEnabled,
    snoozeDurationMinutes = snoozeDurationMinutes,
    createdAt = createdAt,
    updatedAt = updatedAt,
)
