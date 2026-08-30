package com.smartalarm.app.data.repository

import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.ConfirmationSettings
import kotlinx.coroutines.flow.Flow

/**
 * Repository abstraction over Room. UseCases and ViewModels depend on this interface, never on
 * Room types directly - keeps the UI -> ViewModel -> UseCase -> Repository -> Room layering clean
 * and testable (UseCases can be unit tested against a fake implementation with no Android/Room
 * dependency at all).
 */
interface AlarmRepository {
    fun observeAlarms(): Flow<List<Alarm>>
    fun observeOccurrences(): Flow<List<AlarmOccurrence>>

    suspend fun getAlarm(alarmId: Long): Alarm?
    suspend fun getAllEnabledAlarms(): List<Alarm>

    /** Inserts a new alarm and returns its assigned id, or updates an existing one (id != 0). */
    suspend fun saveAlarm(alarm: Alarm): Long
    suspend fun deleteAlarm(alarm: Alarm)

    suspend fun getOccurrence(occurrenceId: Long): AlarmOccurrence?

    /** Occurrences still SCHEDULED or SNOOZED for [alarmId] - i.e. currently armed with AlarmManager. */
    suspend fun getPendingOccurrencesForAlarm(alarmId: Long): List<AlarmOccurrence>

    /** Every occurrence still SCHEDULED or SNOOZED, across all alarms. */
    suspend fun getAllPendingOccurrences(): List<AlarmOccurrence>

    /** Inserts a new occurrence and returns its assigned id, or updates an existing one (id != 0). */
    suspend fun saveOccurrence(occurrence: AlarmOccurrence): Long

    /** Occurrences still SCHEDULED whose scheduled time falls in [startMillis, endMillis). */
    suspend fun getScheduledOccurrencesBetween(startMillis: Long, endMillis: Long): List<AlarmOccurrence>

    /** Phase 1.1: the global daily-confirmation preference. See [ConfirmationSettings]. */
    fun observeConfirmationSettings(): Flow<ConfirmationSettings>

    /**
     * Returns the current settings, creating and persisting the shipped defaults first if none
     * exist yet (a fresh install past Phase 1.1, or - defensively - a Phase 1 install upgraded
     * without going through [com.smartalarm.app.data.local.MIGRATION_1_2] for some reason).
     */
    suspend fun getConfirmationSettings(): ConfirmationSettings

    suspend fun saveConfirmationSettings(settings: ConfirmationSettings)
}
