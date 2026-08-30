package com.smartalarm.app.scheduler

import com.smartalarm.app.domain.model.Alarm

/**
 * Abstraction over Android's AlarmManager, so domain UseCases never touch AlarmManager,
 * PendingIntent, or any android.* scheduling API directly. This is what makes UseCases like
 * CreateOrUpdateAlarmUseCase unit-testable with a fake scheduler.
 *
 * Every method is keyed by `occurrenceId`, not `alarmId`: Phase 1 schedules one Android alarm per
 * occurrence (never one repeating OS alarm per rule), matching the Alarm Rule -> Occurrence ->
 * Scheduled Android Alarm model. [occurrenceId] is used to derive a stable PendingIntent request
 * code, so scheduling twice for the same occurrence updates the existing pending alarm rather
 * than creating a duplicate.
 */
interface AlarmScheduler {
    /** True if this app is currently allowed to schedule exact alarms (always true below API 31). */
    fun canScheduleExactAlarms(): Boolean

    /**
     * Schedules an exact, idempotent alarm for [occurrenceId] belonging to [alarm], to fire at
     * [triggerAtMillis]. Calling this again with the same [occurrenceId] replaces the previous
     * schedule for that occurrence rather than adding a second one.
     */
    fun scheduleExact(occurrenceId: Long, alarm: Alarm, triggerAtMillis: Long)

    /** Cancels any pending Android alarm for [occurrenceId]. Safe to call if none is pending. */
    fun cancel(occurrenceId: Long)
}
