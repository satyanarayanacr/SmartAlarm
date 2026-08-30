package com.smartalarm.app.data.local

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.smartalarm.app.data.local.entity.ConfirmationSettingsEntity
import com.smartalarm.app.domain.model.ConfirmationSettings

/**
 * Phase 1.1: adds the single-row `confirmation_settings` table. Nothing about the existing
 * `alarms` / `alarm_occurrences` tables changes - [com.smartalarm.app.domain.model.OccurrenceStatus.SKIPPED]
 * is a new *value* of an existing TEXT column, not a schema change Room needs to know about.
 */
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE IF NOT EXISTS `confirmation_settings` (
                `id` INTEGER NOT NULL,
                `isEnabled` INTEGER NOT NULL,
                `hour` INTEGER NOT NULL,
                `minute` INTEGER NOT NULL,
                `updatedAt` INTEGER NOT NULL,
                PRIMARY KEY(`id`)
            )
            """.trimIndent()
        )
        db.execSQL(
            """
            INSERT OR IGNORE INTO `confirmation_settings` (`id`, `isEnabled`, `hour`, `minute`, `updatedAt`)
            VALUES (
                ${ConfirmationSettingsEntity.SINGLETON_ID},
                ${if (ConfirmationSettings.DEFAULT_ENABLED) 1 else 0},
                ${ConfirmationSettings.DEFAULT_HOUR},
                ${ConfirmationSettings.DEFAULT_MINUTE},
                ${System.currentTimeMillis()}
            )
            """.trimIndent()
        )
    }
}

/**
 * Phase 1.2: adds per-alarm confirmation configuration columns to the `alarms` table.
 *
 * Non-destructive migration: alters existing `alarms` table with default values (enabled = 1,
 * hour = 21, minute = 0), preserving all existing alarms and their occurrences intact.
 */
val MIGRATION_2_3 = object : Migration(2, 3) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE `alarms` ADD COLUMN `isConfirmationEnabled` INTEGER NOT NULL DEFAULT 1")
        db.execSQL("ALTER TABLE `alarms` ADD COLUMN `confirmationHour` INTEGER NOT NULL DEFAULT 21")
        db.execSQL("ALTER TABLE `alarms` ADD COLUMN `confirmationMinute` INTEGER NOT NULL DEFAULT 0")
    }
}

