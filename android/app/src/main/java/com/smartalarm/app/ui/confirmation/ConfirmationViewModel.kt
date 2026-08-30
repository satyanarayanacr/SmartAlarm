package com.smartalarm.app.ui.confirmation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartalarm.app.ServiceLocator
import com.smartalarm.app.domain.model.ConfirmationSettings
import com.smartalarm.app.domain.usecase.ConfirmableOccurrence
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ReviewUiState(
    val isLoading: Boolean = true,
    val confirmable: List<ConfirmableOccurrence> = emptyList(),
)

/**
 * Backs both the settings screen (observes/updates [ConfirmationSettings]) and the review screen
 * (loads and acts on tomorrow's confirmable occurrences). Combined into one ViewModel since both
 * screens are small, share the same [ServiceLocator], and are never shown at the same time -
 * matching [com.smartalarm.app.ui.alarms.AlarmListViewModel]'s existing "one ViewModel calls into
 * UseCases, screens stay dumb" pattern.
 */
class ConfirmationViewModel(private val locator: ServiceLocator) : ViewModel() {

    val settings: StateFlow<ConfirmationSettings> = locator.repository.observeConfirmationSettings()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ConfirmationSettings())

    private val _reviewState = MutableStateFlow(ReviewUiState())
    val reviewState: StateFlow<ReviewUiState> = _reviewState

    fun updateSettings(newSettings: ConfirmationSettings) {
        viewModelScope.launch { locator.updateConfirmationSettingsUseCase.execute(newSettings) }
    }

    /** Loads (or reloads) tomorrow's confirmable occurrences - call when the review screen opens. */
    fun loadTomorrowsOccurrences() {
        viewModelScope.launch {
            _reviewState.value = ReviewUiState(isLoading = true)
            val confirmable = locator.getTomorrowsConfirmableOccurrencesUseCase.execute()
            _reviewState.value = ReviewUiState(isLoading = false, confirmable = confirmable)
        }
    }

    fun keepSelected(occurrenceIds: List<Long>, onDone: () -> Unit) {
        viewModelScope.launch {
            locator.keepOccurrencesUseCase.execute(occurrenceIds)
            onDone()
        }
    }

    fun skipSelected(occurrenceIds: List<Long>, onDone: () -> Unit) {
        viewModelScope.launch {
            locator.skipOccurrencesUseCase.execute(occurrenceIds)
            onDone()
        }
    }

    class Factory(private val locator: ServiceLocator) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            require(modelClass.isAssignableFrom(ConfirmationViewModel::class.java))
            return ConfirmationViewModel(locator) as T
        }
    }
}
