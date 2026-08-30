package com.smartalarm.app.data.local

import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.smartalarm.app.data.local.entity.ConfirmationSettingsEntity
import com.smartalarm.app.domain.model.ConfirmationSettings

/**
 * Phase 1.1: adds the single-row `confirmation_settings` table. Nothing about the existing
 * `alarms` / `alarm_occurrences` tables changes - [com.smartalarm.app.domain.model.OccurrenceStatus.SKIPPED]
 * is a new *value* of an existing TEXT column, not a schema change Room needs to know about.
 *
 * Non-destructive by design (per the Phase 1.1 spec's "do not recreate the database... do not use
 * destructive migration"): a real device already running Phase 1 has real alarms and occurrences
 * in its `alarms`/`alarm_occurrences` tables, and this migration only adds a new table alongside
 * them - CREATE TABLE IF NOT EXISTS, no ALTER/DROP on the existing tables at all.
 *
 * The settings row is seeded here with the shipped defaults (enabled, 21:00) so an upgrading
 * install has a fully valid settings row immediately, without depending on a first-run write
 * happening before anything tries to read it (e.g. BootReceiver running before MainActivity ever
 * opens). `INSERT OR IGNORE` makes re-running this migration (should Room ever retry it) safe.
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
