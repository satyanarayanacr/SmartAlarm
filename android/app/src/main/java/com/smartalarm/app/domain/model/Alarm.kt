package com.smartalarm.app.domain.model

/**
 * Pure-Kotlin domain model for an alarm rule (not an occurrence). This is the Phase 1 subset of
 * the simulator's `Alarm` type (src/types/alarm.ts): deliberately no location/zone fields and no
 * timezone-behavior fields - those belong to Phase 2/4 and must not be implemented yet.
 *
 * @property id Room-assigned primary key. 0L for an alarm that has not been persisted yet.
 * @property daysOfWeek ISO day-of-week values (1=Monday ... 7=Sunday, matching
 *   [java.time.DayOfWeek.getValue]), used only when [repeatType] is [RepeatType.WEEKLY].
 *   Empty for [RepeatType.ONE_TIME].
 */
data class Alarm(
    val id: Long = 0L,
    val name: String,
    val hour: Int,
    val minute: Int,
    val isEnabled: Boolean = true,
    val repeatType: RepeatType,
    val daysOfWeek: Set<Int> = emptySet(),
    val isVibrationEnabled: Boolean = true,
    val isSnoozeEnabled: Boolean = true,
    val snoozeDurationMinutes: Int = 9,
    val isConfirmationEnabled: Boolean = true,
    val confirmationHour: Int = 21,
    val confirmationMinute: Int = 0,
    val createdAt: Long = 0L,
    val updatedAt: Long = 0L,
) {
    init {
        require(hour in 0..23) { "hour must be in 0..23, was $hour" }
        require(minute in 0..59) { "minute must be in 0..59, was $minute" }
        require(confirmationHour in 0..23) { "confirmationHour must be in 0..23, was $confirmationHour" }
        require(confirmationMinute in 0..59) { "confirmationMinute must be in 0..59, was $confirmationMinute" }
        require(snoozeDurationMinutes in 1..60) {
            "snoozeDurationMinutes must be in 1..60, was $snoozeDurationMinutes"
        }
        if (repeatType == RepeatType.WEEKLY) {
            require(daysOfWeek.isNotEmpty()) { "WEEKLY alarms require at least one day of week" }
            require(daysOfWeek.all { it in 1..7 }) {
                "daysOfWeek values must be in 1..7 (Mon..Sun), was $daysOfWeek"
            }
        }
    }
}
