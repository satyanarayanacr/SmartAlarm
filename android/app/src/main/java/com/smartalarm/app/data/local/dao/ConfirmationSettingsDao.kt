package com.smartalarm.app.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.smartalarm.app.data.local.entity.ConfirmationSettingsEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface ConfirmationSettingsDao {
    // Literal 1 here matches ConfirmationSettingsEntity.SINGLETON_ID - kept as a plain literal
    // (not a string-template reference to that constant) since a Room @Query argument must be a
    // compile-time constant and this project has already hit enough real Kotlin-compiler/
    // annotation-processing edge cases this session to not add another one for a single "1".
    @Query("SELECT * FROM confirmation_settings WHERE id = 1 LIMIT 1")
    fun observe(): Flow<ConfirmationSettingsEntity?>

    @Query("SELECT * FROM confirmation_settings WHERE id = 1 LIMIT 1")
    suspend fun get(): ConfirmationSettingsEntity?

    // REPLACE (not ABORT/IGNORE): this is the one, single settings row - every save is really an
    // upsert keyed by the fixed SINGLETON_ID, never a genuine insert-vs-update decision like
    // AlarmDao/AlarmOccurrenceDao make based on id == 0L.
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entity: ConfirmationSettingsEntity)
}
