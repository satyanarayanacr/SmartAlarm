package com.smartalarm.app.domain.usecase

import com.smartalarm.app.domain.model.AlarmOccurrence
import java.time.ZoneId

/**
 * Skips a batch of occurrences in one call - backs the review screen's "Skip Selected" and "Skip
 * All" actions (spec section 7/8). Simply maps [SkipOccurrenceUseCase] over the given ids, so each
 * occurrence's own idempotency/race-condition handling applies individually; there is nothing
 * about doing several at once that changes those rules. [zone]/[nowMillis] are forwarded to every
 * call so the whole batch is evaluated against one consistent instant, exactly mirroring
 * [SkipOccurrenceUseCase]'s own defaults (and making the batch deterministically testable).
 */
class SkipOccurrencesUseCase(
    private val skipOccurrenceUseCase: SkipOccurrenceUseCase,
) {
    suspend fun execute(
        occurrenceIds: List<Long>,
        zone: ZoneId = ZoneId.systemDefault(),
        nowMillis: Long = System.currentTimeMillis(),
    ): List<AlarmOccurrence> =
        occurrenceIds.mapNotNull { skipOccurrenceUseCase.execute(it, zone, nowMillis) }
}
