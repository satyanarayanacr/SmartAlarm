package com.smartalarm.app.ui.alarms

import com.smartalarm.app.domain.model.Alarm

private val DAY_LABELS = mapOf(
    1 to "Mon", 2 to "Tue", 3 to "Wed", 4 to "Thu", 5 to "Fri", 6 to "Sat", 7 to "Sun",
)

/** e.g. "7:00 AM". Matches the simulator's 12-hour display convention. */
fun formatAlarmTime(hour: Int, minute: Int): String {
    val period = if (hour >= 12) "PM" else "AM"
    val displayHour = when {
        hour == 0 -> 12
        hour > 12 -> hour - 12
        else -> hour
    }
    return "%d:%02d %s".format(displayHour, minute, period)
}

/** e.g. "Weekdays", "Weekends", "Every day", "Mon, Wed, Fri", or "Once" for a one-time alarm. */
fun formatRepeatDays(alarm: Alarm): String {
    val days = alarm.daysOfWeek
    return when {
        days.isEmpty() -> "Once"
        days == setOf(1, 2, 3, 4, 5) -> "Weekdays"
        days == setOf(6, 7) -> "Weekends"
        days == (1..7).toSet() -> "Every day"
        else -> days.sorted().mapNotNull { DAY_LABELS[it] }.joinToString(", ")
    }
}
