package com.smartalarm.app.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.smartalarm.app.data.local.dao.AlarmDao
import com.smartalarm.app.data.local.dao.AlarmOccurrenceDao
import com.smartalarm.app.data.local.entity.AlarmEntity
import com.smartalarm.app.data.local.entity.AlarmOccurrenceEntity

/**
 * Room database for Phase 1. `exportSchema = true` (the default) writes JSON schema snapshots to
 * app/schemas (configured via the `room.schemaLocation` KSP arg in app/build.gradle.kts) - this
 * is what makes real, non-destructive [androidx.room.migration.Migration]s possible when Phase 2+
 * needs to add columns/tables, instead of using `fallbackToDestructiveMigration()`.
 *
 * Version 1: initial Phase 1 schema (alarms, alarm_occurrences). There is nothing to migrate from
 * yet; MIGRATIONS is kept as an explicit (currently empty) array so future phases add to it here
 * rather than reaching for a destructive fallback.
 */
@Database(
    entities = [AlarmEntity::class, AlarmOccurrenceEntity::class],
    version = 1,
    exportSchema = true,
)
abstract class SmartAlarmDatabase : RoomDatabase() {
    abstract fun alarmDao(): AlarmDao
    abstract fun alarmOccurrenceDao(): AlarmOccurrenceDao

    companion object {
        const val DATABASE_NAME = "smart_alarm.db"

        /** Non-destructive migrations, in ascending order. Empty until schema version 2 exists. */
        val MIGRATIONS: Array<androidx.room.migration.Migration> = emptyArray()
    }
}
