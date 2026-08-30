package com.smartalarm.app.domain.model

/**
 * Phase 1.1: the single, global "daily alarm confirmation" preference. There is exactly one of
 * these for the whole app (see the singleton-row `confirmation_settings` Room table) - Phase 1.1
 * uses one global setting, not a per-alarm one (see the spec's "Phase 1.1 uses the global
 * confirmation setting" note on alarm creation/editing).
 *
 * @property isEnabled Whether the daily confirmation feature is active at all. When false, no
 *   confirmation event is scheduled and existing alarms behave exactly as in Phase 1.
 * @property hour Local-clock hour (0-23) the confirmation should ask about tomorrow's alarms.
 * @property minute Local-clock minute (0-59).
 */
data class ConfirmationSettings(
    val isEnabled: Boolean = DEFAULT_ENABLED,
    val hour: Int = DEFAULT_HOUR,
    val minute: Int = DEFAULT_MINUTE,
    val updatedAt: Long = 0L,
) {
    init {
        require(hour in 0..23) { "hour must be in 0..23, was $hour" }
        require(minute in 0..59) { "minute must be in 0..59, was $minute" }
    }

    companion object {
        /** "Default: Enabled" per the Phase 1.1 spec. */
        const val DEFAULT_ENABLED = true

        /** "Ask me about tomorrow's alarms at 9:00 PM" (21:00) - the spec's documented default. */
        const val DEFAULT_HOUR = 21
        const val DEFAULT_MINUTE = 0
    }
}
