package com.smartalarm.app.domain.usecase

import com.smartalarm.app.domain.model.AlarmOccurrence

/**
 * Keeps a batch of occurrences in one call - backs the review screen's "Keep Selected" and "Keep
 * All" actions (spec section 7/8). Since [KeepOccurrenceUseCase] is a no-op read, this is really
 * just "confirm these still exist and are unchanged"; it exists as its own named use case purely
 * so "keep all"/"keep selected" are explicit, independently testable operations per the spec's
 * test list, not an implicit "we simply didn't call skip".
 */
class KeepOccurrencesUseCase(
    private val keepOccurrenceUseCase: KeepOccurrenceUseCase,
) {
    suspend fun execute(occurrenceIds: List<Long>): List<AlarmOccurrence> =
        occurrenceIds.mapNotNull { keepOccurrenceUseCase.execute(it) }
}
