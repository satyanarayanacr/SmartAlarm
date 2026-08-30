package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.ConfirmationTimeCalculator
import com.smartalarm.app.scheduler.ConfirmationScheduler
import java.time.Instant
import java.time.ZoneId

/**
 * (Re)schedules Phase 1.1's single daily confirmation event from the current settings. Idempotent
 * and safe to call as often as needed (app open, boot recovery, after the confirmation itself
 * fires, whenever settings change) - [ConfirmationScheduler] always registers against the same
 * fixed request code, so calling this again simply replaces whatever was scheduled before rather
 * than creating a duplicate.
 *
 * If the feature is disabled, this cancels any existing scheduled event and schedules nothing -
 * satisfying "if disabled, no daily confirmation notifications should be scheduled".
 */
class ScheduleDailyConfirmationUseCase(
    private val repository: AlarmRepository,
    private val confirmationScheduler: ConfirmationScheduler,
) {
    suspend fun execute(
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ) {
        val settings = repository.getConfirmationSettings()
        if (!settings.isEnabled) {
            confirmationScheduler.cancel()
            return
        }
        val next = ConfirmationTimeCalculator.nextConfirmationTrigger(settings, Instant.ofEpochMilli(nowMillis), zone)
        confirmationScheduler.scheduleExact(next.toEpochMilli())
    }
}
