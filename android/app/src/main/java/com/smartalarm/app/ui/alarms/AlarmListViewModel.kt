package com.smartalarm.app.ui.alarms

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartalarm.app.ServiceLocator
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.AlarmOccurrence
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class AlarmListUiState(
    val alarms: List<Alarm> = emptyList(),
    val occurrences: List<AlarmOccurrence> = emptyList(),
)

/**
 * Owns the alarm list screen's state and is the only place UI code calls into UseCases from.
 * Combines the repository's two observable flows (alarms, occurrences) so the list can show each
 * alarm's next scheduled occurrence without a manual refresh.
 */
class AlarmListViewModel(private val locator: ServiceLocator) : ViewModel() {

    val uiState: StateFlow<AlarmListUiState> = combine(
        locator.repository.observeAlarms(),
        locator.repository.observeOccurrences(),
    ) { alarms, occurrences ->
        AlarmListUiState(alarms = alarms, occurrences = occurrences)
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5_000),
        initialValue = AlarmListUiState(),
    )

    fun toggleEnabled(alarmId: Long, isEnabled: Boolean) {
        viewModelScope.launch { locator.toggleAlarmEnabledUseCase.execute(alarmId, isEnabled) }
    }

    fun delete(alarm: Alarm) {
        viewModelScope.launch { locator.deleteAlarmUseCase.execute(alarm) }
    }

    fun save(alarm: Alarm) {
        viewModelScope.launch { locator.createOrUpdateAlarmUseCase.execute(alarm) }
    }

    suspend fun getAlarm(alarmId: Long): Alarm? = locator.repository.getAlarm(alarmId)

    class Factory(private val locator: ServiceLocator) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            require(modelClass.isAssignableFrom(AlarmListViewModel::class.java))
            return AlarmListViewModel(locator) as T
        }
    }
}
