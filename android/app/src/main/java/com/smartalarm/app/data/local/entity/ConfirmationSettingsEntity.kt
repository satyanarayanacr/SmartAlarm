package com.smartalarm.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.smartalarm.app.domain.model.ConfirmationSettings

/**
 * Room table for the Phase 1.1 daily-confirmation preference. Deliberately a single-row
 * ("singleton") table rather than a key-value settings table: there is exactly one global
 * confirmation preference in Phase 1.1 (see [ConfirmationSettings]'s doc), and a single fixed
 * primary key (always [SINGLETON_ID]) with `OnConflictStrategy.REPLACE` on upsert is the simplest
 * way to represent "there is only ever one row" in Room without a separate existence check.
 */
@Entity(tableName = "confirmation_settings")
data class ConfirmationSettingsEntity(
    @PrimaryKey
    val id: Int = SINGLETON_ID,
    val isEnabled: Boolean,
    val hour: Int,
    val minute: Int,
    val updatedAt: Long,
) {
    companion object {
        const val SINGLETON_ID = 1
    }
}

fun ConfirmationSettingsEntity.toDomain(): ConfirmationSettings = ConfirmationSettings(
    isEnabled = isEnabled,
    hour = hour,
    minute = minute,
    updatedAt = updatedAt,
)

fun ConfirmationSettings.toEntity(): ConfirmationSettingsEntity = ConfirmationSettingsEntity(
    isEnabled = isEnabled,
    hour = hour,
    minute = minute,
    updatedAt = updatedAt,
)
