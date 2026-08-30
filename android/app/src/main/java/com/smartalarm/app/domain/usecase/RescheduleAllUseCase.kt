package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.AlarmSchedulingCoordinator
import com.smartalarm.app.domain.model.OccurrenceStatus
import com.smartalarm.app.domain.model.RepeatType
import java.time.ZoneId

/**
 * Boot recovery: AlarmManager forgets every scheduled alarm on reboot, but Room does not. This
 * use case is invoked by [com.smartalarm.app.receiver.BootReceiver] to bring the two back in
 * sync without ever creating a duplicate occurrence.
 *
 * For every occurrence still marked SCHEDULED in Room:
 *  - if its time already passed while the device was off, it is marked MISSED (never fired
 *    retroactively); a WEEKLY alarm immediately gets its next occurrence computed and scheduled,
 *    a ONE_TIME alarm is auto-disabled (mirrors [AlarmFireUseCase]'s live-fire behavior).
 *  - if its time is still in the future, the *same* occurrence row is re-armed with AlarmManager
 *    (same occurrence id => same PendingIntent identity => no duplicate).
 *
 * As a final safety net, any enabled alarm left with no SCHEDULED occurrence at all (e.g. it was
 * created and the app was killed before the alarm broadcast/receiver had a chance to run) gets a
 * fresh occurrence computed.
 *
 * SKIPPED occurrences are never touched here: [AlarmRepository.getAllPendingOccurrences] only
 * ever returns SCHEDULED/SNOOZED rows, so a skipped occurrence is neither re-armed nor
 * resurrected by this pass - satisfying the Phase 1.1 spec's "do not restore SKIPPED occurrences".
 *
 * Phase 1.1: also restores the single daily-confirmation event (see
 * [ScheduleDailyConfirmationUseCase]) - AlarmManager forgets it across reboot exactly like it
 * forgets occurrence alarms, and re-deriving it from settings is idempotent (a no-op, or a
 * cancel, if the feature is disabled), so it is always safe to call unconditionally here.
 */
class RescheduleAllUseCase(
    private val repository: AlarmRepository,
    private val coordinator: AlarmSchedulingCoordinator,
    private val scheduleDailyConfirmationUseCase: ScheduleDailyConfirmationUseCase,
) {
    suspend fun execute(
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ) {
        val pendingOccurrences = repository.getAllPendingOccurrences()
        for (occurrence in pendingOccurrences) {
            val alarm = repository.getAlarm(occurrence.alarmId) ?: continue

            if (occurrence.scheduledTimeMillis <= nowMillis) {
                repository.saveOccurrence(occurrence.copy(status = OccurrenceStatus.MISSED, updatedAt = nowMillis))
                if (alarm.repeatType == RepeatType.WEEKLY && alarm.isEnabled) {
                    coordinator.scheduleNextOccurrence(alarm, zone, nowMillis)
                } else if (alarm.repeatType == RepeatType.ONE_TIME) {
                    repository.saveAlarm(alarm.copy(isEnabled = false, updatedAt = nowMillis))
                }
            } else {
                coordinator.rearmExisting(occurrence, alarm)
            }
        }

        val enabledAlarms = repository.getAllEnabledAlarms()
        for (alarm in enabledAlarms) {
            val hasPending = repository.getPendingOccurrencesForAlarm(alarm.id).isNotEmpty()
            if (!hasPending) {
                coordinator.scheduleNextOccurrence(alarm, zone, nowMillis)
            }
        }

        scheduleDailyConfirmationUseCase.execute(zone, nowMillis)
    }
}
