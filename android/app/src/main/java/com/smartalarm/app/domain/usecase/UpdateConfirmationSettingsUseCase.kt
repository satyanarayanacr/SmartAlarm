package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.model.ConfirmationSettings
import java.time.ZoneId

/**
 * Saves a new [ConfirmationSettings] value and immediately re-derives the scheduled confirmation
 * event from it (disabling it, changing its time, or re-enabling it all take effect right away,
 * not just on the next boot/app-open) - see [ScheduleDailyConfirmationUseCase].
 */
class UpdateConfirmationSettingsUseCase(
    private val repository: AlarmRepository,
    private val scheduleDailyConfirmationUseCase: ScheduleDailyConfirmationUseCase,
) {
    suspend fun execute(
        settings: ConfirmationSettings,
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ) {
        repository.saveConfirmationSettings(settings.copy(updatedAt = nowMillis))
        scheduleDailyConfirmationUseCase.execute(zone, nowMillis)
    }
}
