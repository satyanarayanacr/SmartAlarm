package com.smartalarm.app.domain.model

/**
 * Lifecycle state of a single [AlarmOccurrence] - one concrete, scheduled future ring, derived
 * from an [Alarm] rule. This mirrors the simulator's occurrence-based model
 * (Alarm Rule -> Occurrence -> Scheduled Android Alarm) rather than treating a recurring alarm
 * as one single repeating OS alarm.
 */
enum class OccurrenceStatus {
    /** Scheduled with [com.smartalarm.app.scheduler.AlarmScheduler]; not yet due. */
    SCHEDULED,

    /** The receiver fired and the ringing UI/notification was shown for this occurrence. */
    FIRED,

    /** The user snoozed this occurrence; it has been rescheduled to a new, later time. */
    SNOOZED,

    /** The user dismissed this occurrence. Terminal state. Never affects sibling occurrences. */
    DISMISSED,

    /**
     * Boot recovery found this occurrence's scheduled time had already passed while the device
     * was off/rebooting, so it was not retroactively fired. Terminal state.
     */
    MISSED,

    /** The occurrence was cancelled before it fired (e.g. alarm disabled, alarm deleted, edited). */
    CANCELLED,
}
