package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.Alarm
import java.time.ZoneId

/**
 * Creates a new alarm or updates an existing one (id != 0), then always re-derives its scheduled
 * occurrence(s) from scratch: any previously-scheduled occurrence for this alarm is cancelled
 * first, and a new one is computed and scheduled if the alarm is enabled. This is what makes
 * editing an alarm's time/days/enabled state never leave a stale, wrongly-timed OS alarm behind.
 */
class CreateOrUpdateAlarmUseCase(
    private val repository: AlarmRepository,
    private val coordinator: AlarmSchedulingCoordinator,
) {
    suspend fun execute(
        alarm: Alarm,
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ): Alarm {
        val existing = if (alarm.id != 0L) repository.getAlarm(alarm.id) else null
        val toSave = alarm.copy(
            createdAt = existing?.createdAt ?: nowMillis,
            updatedAt = nowMillis,
        )
        val savedId = repository.saveAlarm(toSave)
        val saved = toSave.copy(id = savedId)
        coordinator.rescheduleAlarm(saved, zone, nowMillis)
        return saved
    }
}
