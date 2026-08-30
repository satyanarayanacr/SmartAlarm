package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.Alarm
import java.time.ZoneId

/**
 * Enables or disables an alarm. Disabling cancels any pending occurrence for that alarm only;
 * every other alarm's schedule is untouched. Re-enabling computes a brand new next occurrence.
 */
class ToggleAlarmEnabledUseCase(
    private val repository: AlarmRepository,
    private val coordinator: AlarmSchedulingCoordinator,
) {
    suspend fun execute(
        alarmId: Long,
        isEnabled: Boolean,
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ): Alarm? {
        val existing = repository.getAlarm(alarmId) ?: return null
        val updated = existing.copy(isEnabled = isEnabled, updatedAt = nowMillis)
        repository.saveAlarm(updated)
        coordinator.rescheduleAlarm(updated, zone, nowMillis)
        return updated
    }
}
