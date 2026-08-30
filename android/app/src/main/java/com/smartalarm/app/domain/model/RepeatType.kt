package com.smartalarm.app.domain.model

/**
 * How an [Alarm] repeats.
 *
 * Phase 1 supports exactly these two modes. Location-aware and timezone-aware behaviors are
 * later-phase concepts (see the React/TypeScript simulator's `AlarmBehavior` /
 * `TimezoneBehavior`) and are intentionally not represented here yet.
 */
enum class RepeatType {
    /** Fires once at the configured time, on the next occurrence of that time, then is done. */
    ONE_TIME,

    /** Fires every week on the configured [Alarm.daysOfWeek]. */
    WEEKLY,
}
