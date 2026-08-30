package com.smartalarm.app.domain.usecase

import com.smartalarm.app.data.repository.AlarmRepository
import com.smartalarm.app.domain.model.AlarmOccurrence

/**
 * "Keep" is Phase 1.1's explicit-no-op: per the spec's "no response -> keep" default rule, a
 * SCHEDULED occurrence that is kept needs no state change at all - it was already going to ring.
 * This use case exists mainly for symmetry with [SkipOccurrenceUseCase] and so "keep" is an
 * explicit, independently testable action (spec tests: "keep all", "keep selected", "no response
 * keeps alarm scheduled") rather than an implicit absence of a call - it deliberately never
 * writes an "explicitly confirmed" flag anywhere (no such state is persisted; see the Phase 1.1
 * report's rationale for not introducing one beyond the required SKIPPED status).
 */
class KeepOccurrenceUseCase(
    private val repository: AlarmRepository,
) {
    suspend fun execute(occurrenceId: Long): AlarmOccurrence? = repository.getOccurrence(occurrenceId)
}
