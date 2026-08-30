package com.smartalarm.app.fakes

import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.scheduler.AlarmScheduler

/**
 * In-memory [AlarmScheduler] for unit tests: no AlarmManager, no Android framework classes -
 * just records what would have been scheduled/cancelled so tests can assert on it directly.
 */
class FakeAlarmScheduler : AlarmScheduler {
    var exactAlarmsAllowed: Boolean = true

    /** occurrenceId -> triggerAtMillis, for occurrences currently scheduled (not yet cancelled). */
    private val active = mutableMapOf<Long, Long>()

    /** Every scheduleExact() call ever made, in order - used to detect duplicate scheduling. */
    val scheduleCalls = mutableListOf<Pair<Long, Long>>() // occurrenceId to triggerAtMillis
    val cancelCalls = mutableListOf<Long>()

    override fun canScheduleExactAlarms(): Boolean = exactAlarmsAllowed

    override fun scheduleExact(occurrenceId: Long, alarm: Alarm, triggerAtMillis: Long) {
        active[occurrenceId] = triggerAtMillis
        scheduleCalls += occurrenceId to triggerAtMillis
    }

    override fun cancel(occurrenceId: Long) {
        active.remove(occurrenceId)
        cancelCalls += occurrenceId
    }

    fun isCurrentlyScheduled(occurrenceId: Long): Boolean = active.containsKey(occurrenceId)
    fun activeCount(): Int = active.size
}
