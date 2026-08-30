package com.smartalarm.app.data.repository

import com.smartalarm.app.data.local.dao.AlarmDao
import com.smartalarm.app.data.local.dao.AlarmOccurrenceDao
import com.smartalarm.app.data.local.dao.ConfirmationSettingsDao
import com.smartalarm.app.data.local.entity.toDomain
import com.smartalarm.app.data.local.entity.toEntity
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.ConfirmationSettings
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class RoomAlarmRepository(
    private val alarmDao: AlarmDao,
    private val occurrenceDao: AlarmOccurrenceDao,
    private val confirmationSettingsDao: ConfirmationSettingsDao,
) : AlarmRepository {

    override fun observeAlarms(): Flow<List<Alarm>> =
        alarmDao.observeAll().map { list -> list.map { it.toDomain() } }

    override fun observeOccurrences(): Flow<List<AlarmOccurrence>> =
        occurrenceDao.observeAll().map { list -> list.map { it.toDomain() } }

    override suspend fun getAlarm(alarmId: Long): Alarm? = alarmDao.getById(alarmId)?.toDomain()

    override suspend fun getAllEnabledAlarms(): List<Alarm> =
        alarmDao.getAllEnabled().map { it.toDomain() }

    override suspend fun saveAlarm(alarm: Alarm): Long {
        return if (alarm.id == 0L) {
            alarmDao.insert(alarm.toEntity())
        } else {
            alarmDao.update(alarm.toEntity())
            alarm.id
        }
    }

    override suspend fun deleteAlarm(alarm: Alarm) {
        alarmDao.delete(alarm.toEntity())
    }

    override suspend fun getOccurrence(occurrenceId: Long): AlarmOccurrence? =
        occurrenceDao.getById(occurrenceId)?.toDomain()

    override suspend fun getPendingOccurrencesForAlarm(alarmId: Long): List<AlarmOccurrence> =
        occurrenceDao.getPendingForAlarm(alarmId).map { it.toDomain() }

    override suspend fun getAllPendingOccurrences(): List<AlarmOccurrence> =
        occurrenceDao.getAllPending().map { it.toDomain() }

    override suspend fun saveOccurrence(occurrence: AlarmOccurrence): Long {
        return if (occurrence.id == 0L) {
            occurrenceDao.insert(occurrence.toEntity())
        } else {
            occurrenceDao.update(occurrence.toEntity())
            occurrence.id
        }
    }

    override suspend fun getScheduledOccurrencesBetween(startMillis: Long, endMillis: Long): List<AlarmOccurrence> =
        occurrenceDao.getScheduledInRange(startMillis, endMillis).map { it.toDomain() }

    override fun observeConfirmationSettings(): Flow<ConfirmationSettings> =
        confirmationSettingsDao.observe().map { it?.toDomain() ?: ConfirmationSettings() }

    override suspend fun getConfirmationSettings(): ConfirmationSettings {
        val existing = confirmationSettingsDao.get()
        if (existing != null) return existing.toDomain()

        // No row yet (fresh install, or an upgrade that didn't go through MIGRATION_1_2) - persist
        // the shipped defaults now so every subsequent read/schedule call sees a real, stable row.
        val defaults = ConfirmationSettings(updatedAt = System.currentTimeMillis())
        confirmationSettingsDao.upsert(defaults.toEntity())
        return defaults
    }

    override suspend fun saveConfirmationSettings(settings: ConfirmationSettings) {
        confirmationSettingsDao.upsert(settings.toEntity())
    }
}
