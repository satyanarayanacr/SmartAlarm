package com.smartalarm.app.data.repository

import com.smartalarm.app.data.local.dao.AlarmDao
import com.smartalarm.app.data.local.dao.AlarmOccurrenceDao
import com.smartalarm.app.data.local.entity.toDomain
import com.smartalarm.app.data.local.entity.toEntity
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.AlarmOccurrence
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class RoomAlarmRepository(
    private val alarmDao: AlarmDao,
    private val occurrenceDao: AlarmOccurrenceDao,
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
}
