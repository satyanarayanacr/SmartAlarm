package com.smartalarm.app.scheduler

/**
 * Abstraction over Android's AlarmManager for confirmation events.
 * Supports per-occurrence confirmation scheduling and cancellation.
 */
interface ConfirmationScheduler {
    /** Schedules (or replaces) a confirmation event for [occurrenceId] to fire at [triggerAtMillis]. */
    fun scheduleExact(occurrenceId: Long, triggerAtMillis: Long)

    /** Cancels the confirmation event for [occurrenceId], if any is currently scheduled. */
    fun cancel(occurrenceId: Long)

    /** Cancels all confirmation events. */
    fun cancelAll()

    /** Legacy / single-event compatibility helper */
    fun scheduleExact(triggerAtMillis: Long) {
        scheduleExact(0L, triggerAtMillis)
    }

    /** Legacy / single-event compatibility helper */
    fun cancel() {
        cancel(0L)
    }
}

