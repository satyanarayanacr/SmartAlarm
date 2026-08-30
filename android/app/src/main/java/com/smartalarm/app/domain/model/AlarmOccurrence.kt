package com.smartalarm.app.domain.model

/**
 * A single, concrete, scheduled future ring derived from an [Alarm] rule at the moment it was
 * computed. Vibration/snooze-duration are snapshotted from the parent [Alarm] at creation time so
 * that editing the alarm later never silently changes an occurrence Android has already scheduled
 * an exact alarm for.
 *
 * @property id Room-assigned primary key. 0L for an occurrence that has not been persisted yet.
 * @property alarmId Foreign key to the owning [Alarm].
 * @property scheduledTimeMillis Absolute instant (epoch millis) this occurrence should ring at.
 *   This is exactly what is handed to AlarmManager.
 */
data class AlarmOccurrence(
    val id: Long = 0L,
    val alarmId: Long,
    val scheduledTimeMillis: Long,
    val status: OccurrenceStatus = OccurrenceStatus.SCHEDULED,
    val isVibrationEnabled: Boolean,
    val snoozeDurationMinutes: Int,
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L,
)
