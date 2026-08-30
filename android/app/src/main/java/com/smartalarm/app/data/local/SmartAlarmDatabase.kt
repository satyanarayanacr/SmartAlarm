package com.smartalarm.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import com.smartalarm.app.data.local.dao.AlarmDao
import com.smartalarm.app.data.local.dao.AlarmOccurrenceDao
import com.smartalarm.app.data.local.dao.ConfirmationSettingsDao
import com.smartalarm.app.data.local.entity.AlarmEntity
import com.smartalarm.app.data.local.entity.AlarmOccurrenceEntity
import com.smartalarm.app.data.local.entity.ConfirmationSettingsEntity

/**
 * Room database. `exportSchema = true` (the default) writes JSON schema snapshots to app/schemas
 * (configured via the `room.schemaLocation` KSP arg in app/build.gradle.kts) - this is what makes
 * real, non-destructive [androidx.room.migration.Migration]s possible, instead of using
 * `fallbackToDestructiveMigration()`.
 *
 * Version 1: initial Phase 1 schema (alarms, alarm_occurrences).
 * Version 2 (Phase 1.1): adds confirmation_settings (see [MIGRATION_1_2] in Migrations.kt). Real
 * devices already running Phase 1 must upgrade through this migration, never a destructive
 * fallback - their existing alarms/occurrences must remain valid.
 */
@Database(
    entities = [AlarmEntity::class, AlarmOccurrenceEntity::class, ConfirmationSettingsEntity::class],
    version = 2,
    exportSchema = true,
)
abstract class SmartAlarmDatabase : RoomDatabase() {
    abstract fun alarmDao(): AlarmDao
    abstract fun alarmOccurrenceDao(): AlarmOccurrenceDao
    abstract fun confirmationSettingsDao(): ConfirmationSettingsDao

    companion object {
        const val DATABASE_NAME = "smart_alarm.db"

        /** Non-destructive migrations, in ascending order. */
        val MIGRATIONS: Array<Migration> = arrayOf(MIGRATION_1_2)
    }
}
