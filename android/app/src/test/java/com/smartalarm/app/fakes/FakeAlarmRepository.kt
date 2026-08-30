package com.smartalarm.app.fakes

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.OccurrenceStatus
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

/** In-memory [AlarmRepository] for unit tests - no Room, no Android framework classes. */
class FakeAlarmRepository : AlarmRepository {
    private var nextAlarmId = 1L
    private var nextOccurrenceId = 1L
    private val alarms = linkedMapOf<Long, Alarm>()
    private val occurrences = linkedMapOf<Long, AlarmOccurrence>()

    private val alarmsFlow = MutableStateFlow<List<Alarm>>(emptyList())
    private val occurrencesFlow = MutableStateFlow<List<AlarmOccurrence>>(emptyList())

    override fun observeAlarms(): Flow<List<Alarm>> = alarmsFlow
    override fun observeOccurrences(): Flow<List<AlarmOccurrence>> = occurrencesFlow

    override suspend fun getAlarm(alarmId: Long): Alarm? = alarms[alarmId]

    override suspend fun getAllEnabledAlarms(): List<Alarm> = alarms.values.filter { it.isEnabled }

    override suspend fun saveAlarm(alarm: Alarm): Long {
        val id = if (alarm.id == 0L) nextAlarmId++ else alarm.id
        alarms[id] = alarm.copy(id = id)
        alarmsFlow.value = alarms.values.toList()
        return id
    }

    override suspend fun deleteAlarm(alarm: Alarm) {
        alarms.remove(alarm.id)
        occurrences.values.filter { it.alarmId == alarm.id }.map { it.id }.forEach { occurrences.remove(it) }
        alarmsFlow.value = alarms.values.toList()
        occurrencesFlow.value = occurrences.values.toList()
    }

    override suspend fun getOccurrence(occurrenceId: Long): AlarmOccurrence? = occurrences[occurrenceId]

    private val pendingStatuses = setOf(OccurrenceStatus.SCHEDULED, OccurrenceStatus.SNOOZED)

    override suspend fun getPendingOccurrencesForAlarm(alarmId: Long): List<AlarmOccurrence> =
        occurrences.values.filter { it.alarmId == alarmId && it.status in pendingStatuses }

    override suspend fun getAllPendingOccurrences(): List<AlarmOccurrence> =
        occurrences.values.filter { it.status in pendingStatuses }

    override suspend fun saveOccurrence(occurrence: AlarmOccurrence): Long {
        val id = if (occurrence.id == 0L) nextOccurrenceId++ else occurrence.id
        occurrences[id] = occurrence.copy(id = id)
        occurrencesFlow.value = occurrences.values.toList()
        return id
    }

    fun allOccurrences(): List<AlarmOccurrence> = occurrences.values.toList()
}
