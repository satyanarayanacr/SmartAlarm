package com.smartalarm.app.scheduler

/**
 * Abstraction over Android's AlarmManager for Phase 1.1's single, global daily-confirmation
 * event - deliberately separate from [AlarmScheduler] rather than overloading it: there is
 * exactly one confirmation event for the whole app (not one per occurrence), it carries no
 * [com.smartalarm.app.domain.model.Alarm] payload, and keeping it as its own small interface
 * means confirmation scheduling can never be confused with, or accidentally collide with, actual
 * alarm-ring scheduling - they are registered against different BroadcastReceiver components
 * ([com.smartalarm.app.receiver.ConfirmationReceiver] vs
 * [com.smartalarm.app.receiver.AlarmReceiver]), which is what already keeps their PendingIntents
 * distinct even though both may use small integer request codes internally.
 */
interface ConfirmationScheduler {
    /** Schedules (or replaces) the single daily confirmation event to fire at [triggerAtMillis]. */
    fun scheduleExact(triggerAtMillis: Long)

    /** Cancels the daily confirmation event, if any is currently scheduled. Safe to call if none is pending. */
    fun cancel()
}
