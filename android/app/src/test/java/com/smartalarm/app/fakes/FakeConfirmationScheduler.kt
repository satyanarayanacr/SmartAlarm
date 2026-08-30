package com.smartalarm.app.fakes

import com.smartalarm.app.scheduler.ConfirmationScheduler

/**
 * In-memory [ConfirmationScheduler] for unit tests - records the single scheduled trigger time
 * (or none) so tests can assert on it directly, mirroring [FakeAlarmScheduler]'s shape.
 */
class FakeConfirmationScheduler : ConfirmationScheduler {
    /** The currently scheduled trigger time, or null if none is scheduled (cancelled/never scheduled). */
    var scheduledAtMillis: Long? = null
        private set

    /** Every scheduleExact() call ever made, in order - used to detect duplicate/repeated scheduling. */
    val scheduleCalls = mutableListOf<Long>()
    var cancelCallCount = 0
        private set

    override fun scheduleExact(triggerAtMillis: Long) {
        scheduledAtMillis = triggerAtMillis
        scheduleCalls += triggerAtMillis
    }

    override fun cancel() {
        scheduledAtMillis = null
        cancelCallCount += 1
    }
}
