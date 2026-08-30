package com.smartalarm.app.fakes

import com.smartalarm.app.scheduler.ConfirmationScheduler

/**
 * In-memory [ConfirmationScheduler] for unit tests - records scheduled trigger times per occurrence.
 */
class FakeConfirmationScheduler : ConfirmationScheduler {
    val scheduledOccurrences = mutableMapOf<Long, Long>()
    val scheduleCalls = mutableListOf<Pair<Long, Long>>()
    var cancelCallCount = 0
        private set
    val cancelledOccurrenceIds = mutableListOf<Long>()

    val scheduledAtMillis: Long?
        get() = scheduledOccurrences.values.firstOrNull()

    override fun scheduleExact(occurrenceId: Long, triggerAtMillis: Long) {
        scheduledOccurrences[occurrenceId] = triggerAtMillis
        scheduleCalls += occurrenceId to triggerAtMillis
    }

    override fun cancel(occurrenceId: Long) {
        scheduledOccurrences.remove(occurrenceId)
        cancelledOccurrenceIds += occurrenceId
        cancelCallCount += 1
    }

    override fun cancelAll() {
        scheduledOccurrences.clear()
        cancelCallCount += 1
    }
}

