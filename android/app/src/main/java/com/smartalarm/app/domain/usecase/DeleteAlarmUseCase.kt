package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.Alarm

/**
 * Deletes an alarm. Cancels its pending OS alarm(s) *before* deleting the Room row, since
 * AlarmManager state is never implicitly cleaned up when a database row disappears - an
 * un-cancelled PendingIntent would still fire for a now-deleted alarm otherwise.
 */
class DeleteAlarmUseCase(
    private val repository: AlarmRepository,
    private val coordinator: AlarmSchedulingCoordinator,
) {
    suspend fun execute(alarm: Alarm) {
        coordinator.cancelAllScheduled(alarm.id)
        repository.deleteAlarm(alarm) // ON DELETE CASCADE removes its occurrence rows too.
    }
}
