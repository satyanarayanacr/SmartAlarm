export interface AndroidSourceFile {
  path: string;
  language: 'kotlin' | 'xml' | 'groovy' | 'gradle' | 'json';
  category: 'manifest' | 'gradle' | 'model' | 'database' | 'scheduler' | 'receiver' | 'service' | 'viewmodel' | 'ui' | 'theme' | 'app';
  description: string;
  content: string;
}

export const ANDROID_PROJECT_FILES: AndroidSourceFile[] = [
  {
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    category: 'manifest',
    description: 'Declares exact alarm, boot, foreground service, and full-screen intent permissions and components',
    content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.smartalarm.app">

    <!-- Exact Alarm scheduling permissions (Android 12 & Android 14+) -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />

    <!-- Restore alarms after device reboot or update -->
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

    <!-- Wake device and full-screen notifications when ringing -->
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />

    <!-- Foreground service for continuous audio playback and notification -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <!-- Notification permission for Android 13+ (API 33+) -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    
    <!-- Haptic feedback vibration -->
    <uses-permission android:name="android.permission.VIBRATE" />

    <application
        android:name=".SmartAlarmApplication"
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.SmartAlarm"
        tools:targetApi="34">

        <!-- Main Compose Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.SmartAlarm">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Dedicated Full Screen Ringing Activity for Lockscreen Wake -->
        <activity
            android:name=".ui.screens.AlarmRingingActivity"
            android:exported="false"
            android:excludeFromRecents="true"
            android:launchMode="singleInstance"
            android:showOnLockScreen="true"
            android:showWhenLocked="true"
            android:turnScreenOn="true"
            android:theme="@style/Theme.SmartAlarm.Ringing" />

        <!-- BroadcastReceiver for AlarmManager triggers -->
        <receiver
            android:name=".receiver.AlarmReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="com.smartalarm.app.ACTION_ALARM_TRIGGER" />
                <action android:name="com.smartalarm.app.ACTION_SNOOZE_ALARM" />
                <action android:name="com.smartalarm.app.ACTION_DISMISS_ALARM" />
            </intent-filter>
        </receiver>

        <!-- BroadcastReceiver for Device Reboot Recovery -->
        <receiver
            android:name=".receiver.RebootReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="com.htc.intent.action.QUICKBOOT_POWERON" />
            </intent-filter>
        </receiver>

        <!-- Foreground Service for audio ringing & notification controls -->
        <service
            android:name=".service.AlarmService"
            android:exported="false"
            android:foregroundServiceType="mediaPlayback" />

    </application>
</manifest>`
  },
  {
    path: 'app/build.gradle.kts',
    language: 'gradle',
    category: 'gradle',
    description: 'Modern Kotlin DSL Gradle build script with Compose, Room, Lifecycle, and Coroutines',
    content: `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.kapt)
}

android {
    namespace = "com.smartalarm.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.smartalarm.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    // Core & Lifecycle
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)

    // Jetpack Compose & Material 3
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)

    // Room Database
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    kapt(libs.androidx.room.compiler)

    // Coroutines
    implementation(libs.kotlinx.coroutines.android)

    // Navigation Compose
    implementation(libs.androidx.navigation.compose)
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/data/model/Alarm.kt',
    language: 'kotlin',
    category: 'model',
    description: 'Room Entity representing the persistent Alarm model with repeat days and skip flag',
    content: `package com.smartalarm.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Represents a persistent Alarm in Room database.
 * 
 * Designed with future-proofing for intelligent skips,
 * location/context hooks, and dynamic audio sources.
 */
@Entity(tableName = "alarms")
data class Alarm(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val name: String,
    val hour: Int, // 0-23
    val minute: Int, // 0-59
    val isEnabled: Boolean = true,
    val repeatType: RepeatType = RepeatType.WEEKLY,
    val daysOfWeek: Set<Int> = emptySet(), // 1 (Mon) to 7 (Sun)
    val soundSelection: String = "radar",
    val isVibrationEnabled: Boolean = true,
    val isSnoozeEnabled: Boolean = true,
    val snoozeDurationMinutes: Int = 9,
    val nextTriggerMillis: Long = 0L,
    val isSkippedNext: Boolean = false, // Future-proof: skips the immediate next occurrence
    val createdTimestamp: Long = System.currentTimeMillis(),
    val updatedTimestamp: Long = System.currentTimeMillis()
)

enum class RepeatType {
    ONETIME,
    WEEKLY
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/data/local/Converters.kt',
    language: 'kotlin',
    category: 'database',
    description: 'Room TypeConverters for Set<Int> and Enum serialization',
    content: `package com.smartalarm.app.data.local

import androidx.room.TypeConverter
import com.smartalarm.app.data.model.RepeatType

/**
 * Room TypeConverters to persist collections and enums as SQLite primitives.
 */
class Converters {
    @TypeConverter
    fun fromIntSet(set: Set<Int>?): String {
        return set?.joinToString(",") ?: ""
    }

    @TypeConverter
    fun toIntSet(data: String?): Set<Int> {
        if (data.isNullOrEmpty()) return emptySet()
        return data.split(",")
            .mapNotNull { it.trim().toIntOrNull() }
            .toSet()
    }

    @TypeConverter
    fun fromRepeatType(type: RepeatType?): String {
        return type?.name ?: RepeatType.WEEKLY.name
    }

    @TypeConverter
    fun toRepeatType(data: String?): RepeatType {
        return try {
            RepeatType.valueOf(data ?: RepeatType.WEEKLY.name)
        } catch (e: Exception) {
            RepeatType.WEEKLY
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/data/local/AlarmDao.kt',
    language: 'kotlin',
    category: 'database',
    description: 'Data Access Object exposing reactive Kotlin Flow and suspend queries for Room',
    content: `package com.smartalarm.app.data.local

import androidx.room.*
import com.smartalarm.app.data.model.Alarm
import kotlinx.coroutines.flow.Flow

@Dao
interface AlarmDao {

    @Query("SELECT * FROM alarms ORDER BY hour ASC, minute ASC")
    fun getAllAlarms(): Flow<List<Alarm>>

    @Query("SELECT * FROM alarms WHERE isEnabled = 1")
    suspend fun getEnabledAlarms(): List<Alarm>

    @Query("SELECT * FROM alarms WHERE id = :id LIMIT 1")
    suspend fun getAlarmById(id: Long): Alarm?

    @Query("SELECT * FROM alarms WHERE id = :id LIMIT 1")
    fun getAlarmByIdFlow(id: Long): Flow<Alarm?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAlarm(alarm: Alarm): Long

    @Update
    suspend fun updateAlarm(alarm: Alarm)

    @Delete
    suspend fun deleteAlarm(alarm: Alarm)

    @Query("DELETE FROM alarms WHERE id = :id")
    suspend fun deleteAlarmById(id: Long)

    @Query("UPDATE alarms SET isEnabled = :isEnabled, updatedTimestamp = :updatedTime WHERE id = :id")
    suspend fun setAlarmEnabled(id: Long, isEnabled: Boolean, updatedTime: Long = System.currentTimeMillis())

    @Query("UPDATE alarms SET isSkippedNext = :isSkipped, nextTriggerMillis = :nextTrigger WHERE id = :id")
    suspend fun updateSkipStatus(id: Long, isSkipped: Boolean, nextTrigger: Long)
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/data/local/AlarmDatabase.kt',
    language: 'kotlin',
    category: 'database',
    description: 'Room Database singleton provider with versioning and migration strategy',
    content: `package com.smartalarm.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.smartalarm.app.data.model.Alarm

@Database(entities = [Alarm::class], version = 1, exportSchema = false)
@TypeConverters(Converters::class)
abstract class AlarmDatabase : RoomDatabase() {

    abstract fun alarmDao(): AlarmDao

    companion object {
        @Volatile
        private var INSTANCE: AlarmDatabase? = null

        fun getInstance(context: Context): AlarmDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AlarmDatabase::class.java,
                    "smart_alarm.db"
                ).fallbackToDestructiveMigration()
                 .build()
                INSTANCE = instance
                instance
            }
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/scheduler/AlarmUtils.kt',
    language: 'kotlin',
    category: 'scheduler',
    description: 'Deterministic next trigger calculation for one-time and weekly repeating alarms',
    content: `package com.smartalarm.app.scheduler

import java.util.Calendar

object AlarmUtils {

    /**
     * Calculates the exact next epoch millis when the alarm should fire.
     * 
     * @param hour 0-23
     * @param minute 0-59
     * @param daysOfWeek Set of ISO day indices: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun
     * @param isSkippedNext If true, intentionally jumps over the immediately upcoming occurrence
     * @param fromTime Epoch millis anchor (defaults to now)
     */
    fun calculateNextOccurrence(
        hour: Int,
        minute: Int,
        daysOfWeek: Set<Int>,
        isSkippedNext: Boolean = false,
        fromTime: Long = System.currentTimeMillis()
    ): Long {
        val calendar = Calendar.getInstance().apply {
            timeInMillis = fromTime
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        // Helper: Convert Calendar.DAY_OF_WEEK (1=Sun, 2=Mon... 7=Sat) to ISO 1=Mon..7=Sun
        fun getIsoDay(cal: Calendar): Int {
            val dayOfWeek = cal.get(Calendar.DAY_OF_WEEK)
            return if (dayOfWeek == Calendar.SUNDAY) 7 else dayOfWeek - 1
        }

        // One-time Alarm (Empty days set)
        if (daysOfWeek.isEmpty()) {
            if (calendar.timeInMillis <= fromTime) {
                calendar.add(Calendar.DAY_OF_YEAR, 1)
            }
            return calendar.timeInMillis
        }

        // Repeating Alarm: Check if today is a valid occurrence
        val todayIso = getIsoDay(calendar)
        if (calendar.timeInMillis > fromTime && daysOfWeek.contains(todayIso) && !isSkippedNext) {
            return calendar.timeInMillis
        }

        // Search next days
        var searchCal = calendar.clone() as Calendar
        if (searchCal.timeInMillis <= fromTime || (isSkippedNext && searchCal.timeInMillis > fromTime && daysOfWeek.contains(todayIso))) {
            searchCal.add(Calendar.DAY_OF_YEAR, 1)
        }

        var loops = 0
        while (loops < 14) {
            val iso = getIsoDay(searchCal)
            if (daysOfWeek.contains(iso)) {
                return searchCal.timeInMillis
            }
            searchCal.add(Calendar.DAY_OF_YEAR, 1)
            loops++
        }

        return calendar.timeInMillis
    }

    fun formatDaysOfWeek(daysOfWeek: Set<Int>): String {
        if (daysOfWeek.isEmpty()) return "One-time"
        if (daysOfWeek.size == 7) return "Every day"
        
        val sorted = daysOfWeek.sorted()
        if (sorted == listOf(1, 2, 3, 4, 5)) return "Mon – Fri (Weekdays)"
        if (sorted == listOf(6, 7)) return "Sat, Sun (Weekends)"

        val names = mapOf(
            1 to "Mon", 2 to "Tue", 3 to "Wed",
            4 to "Thu", 5 to "Fri", 6 to "Sat", 7 to "Sun"
        )
        return sorted.mapNotNull { names[it] }.joinToString(" ")
    }
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/scheduler/AlarmScheduler.kt',
    language: 'kotlin',
    category: 'scheduler',
    description: 'Interface isolating Android AlarmManager interactions for clean architecture & testability',
    content: `package com.smartalarm.app.scheduler

import com.smartalarm.app.data.model.Alarm

interface AlarmScheduler {
    fun schedule(alarm: Alarm)
    fun scheduleSnooze(alarm: Alarm, durationMinutes: Int)
    fun cancel(alarmId: Long)
    fun canScheduleExactAlarms(): Boolean
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/scheduler/AndroidAlarmScheduler.kt',
    language: 'kotlin',
    category: 'scheduler',
    description: 'Android AlarmManager implementation using setAlarmClock for exact Doze-proof waking',
    content: `package com.smartalarm.app.scheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import com.smartalarm.app.MainActivity
import com.smartalarm.app.data.model.Alarm
import com.smartalarm.app.receiver.AlarmReceiver

class AndroidAlarmScheduler(private val context: Context) : AlarmScheduler {

    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    override fun schedule(alarm: Alarm) {
        if (!alarm.isEnabled) {
            cancel(alarm.id)
            return
        }

        val triggerTime = if (alarm.nextTriggerMillis > System.currentTimeMillis()) {
            alarm.nextTriggerMillis
        } else {
            AlarmUtils.calculateNextOccurrence(alarm.hour, alarm.minute, alarm.daysOfWeek, alarm.isSkippedNext)
        }

        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_TRIGGER
            putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarm.id)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarm.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Show Alarm icon in status bar and launch app when tapped
        val showIntent = Intent(context, MainActivity::class.java)
        val showPendingIntent = PendingIntent.getActivity(
            context,
            alarm.id.toInt(),
            showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTime, showPendingIntent)

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (alarmManager.canScheduleExactAlarms()) {
                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
                    Log.d(TAG, "Exact Alarm \${alarm.id} scheduled for \${triggerTime}")
                } else {
                    Log.w(TAG, "Missing SCHEDULE_EXACT_ALARM permission, scheduling best effort")
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerTime, pendingIntent)
                }
            } else {
                alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
            }
        } catch (e: SecurityException) {
            Log.e(TAG, "SecurityException while scheduling alarm \${alarm.id}", e)
        }
    }

    override fun scheduleSnooze(alarm: Alarm, durationMinutes: Int) {
        val triggerTime = System.currentTimeMillis() + (durationMinutes * 60 * 1000L)
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_TRIGGER
            putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarm.id)
            putExtra(AlarmReceiver.EXTRA_IS_SNOOZE, true)
        }

        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarm.id.toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val showIntent = Intent(context, MainActivity::class.java)
        val showPendingIntent = PendingIntent.getActivity(
            context,
            alarm.id.toInt(),
            showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val alarmClockInfo = AlarmManager.AlarmClockInfo(triggerTime, showPendingIntent)
        alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
    }

    override fun cancel(alarmId: Long) {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = AlarmReceiver.ACTION_TRIGGER
        }
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            alarmId.toInt(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
            Log.d(TAG, "Alarm \${alarmId} cancelled successfully")
        }
    }

    override fun canScheduleExactAlarms(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            alarmManager.canScheduleExactAlarms()
        } else {
            true
        }
    }

    companion object {
        private const val TAG = "AndroidAlarmScheduler"
    }
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/receiver/AlarmReceiver.kt',
    language: 'kotlin',
    category: 'receiver',
    description: 'BroadcastReceiver that handles alarm triggers, wakes device, and starts full-screen activity & service',
    content: `package com.smartalarm.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import androidx.core.content.ContextCompat
import com.smartalarm.app.data.local.AlarmDatabase
import com.smartalarm.app.data.repository.AlarmRepositoryImpl
import com.smartalarm.app.scheduler.AndroidAlarmScheduler
import com.smartalarm.app.service.AlarmService
import com.smartalarm.app.ui.screens.AlarmRingingActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getLongExtra(EXTRA_ALARM_ID, -1L)
        if (alarmId == -1L) return

        // 1. Acquire WakeLock briefly to ensure execution on lockscreen
        val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.FULL_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
            "SmartAlarm:AlarmWakeLock"
        )
        wakeLock.acquire(10 * 60 * 1000L) // 10 min max

        // 2. Launch Foreground Ringing Service (Plays sound, manages notifications)
        val serviceIntent = Intent(context, AlarmService::class.java).apply {
            putExtra(EXTRA_ALARM_ID, alarmId)
        }
        ContextCompat.startForegroundService(context, serviceIntent)

        // 3. Launch Full Screen Activity if device is unlocked or locked
        val ringingIntent = Intent(context, AlarmRingingActivity::class.java).apply {
            putExtra(EXTRA_ALARM_ID, alarmId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        }
        context.startActivity(ringingIntent)

        // 4. Update Repeating Schedule in Database
        CoroutineScope(Dispatchers.IO).launch {
            val db = AlarmDatabase.getInstance(context)
            val scheduler = AndroidAlarmScheduler(context)
            val repository = AlarmRepositoryImpl(db.alarmDao(), scheduler)
            repository.handleAlarmTriggered(alarmId)
        }
    }

    companion object {
        const val ACTION_TRIGGER = "com.smartalarm.app.ACTION_ALARM_TRIGGER"
        const val EXTRA_ALARM_ID = "EXTRA_ALARM_ID"
        const val EXTRA_IS_SNOOZE = "EXTRA_IS_SNOOZE"
    }
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/receiver/RebootReceiver.kt',
    language: 'kotlin',
    category: 'receiver',
    description: 'BroadcastReceiver that automatically reschedules all active alarms upon device reboot',
    content: `package com.smartalarm.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.smartalarm.app.data.local.AlarmDatabase
import com.smartalarm.app.scheduler.AndroidAlarmScheduler
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Restores all enabled alarms in AlarmManager after device reboot or app upgrade.
 */
class RebootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        if (action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON") {
            
            Log.d(TAG, "Reboot/Upgrade detected (\${action}). Rescheduling alarms...")

            val pendingResult = goAsync()
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val db = AlarmDatabase.getInstance(context)
                    val scheduler = AndroidAlarmScheduler(context)
                    val enabledAlarms = db.alarmDao().getEnabledAlarms()

                    Log.d(TAG, "Restoring \${enabledAlarms.size} active alarms to AlarmManager")
                    for (alarm in enabledAlarms) {
                        scheduler.schedule(alarm)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error restoring alarms on boot", e)
                } finally {
                    pendingResult.finish()
                }
            }
        }
    }

    companion object {
        private const val TAG = "RebootReceiver"
    }
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/service/AlarmService.kt',
    language: 'kotlin',
    category: 'service',
    description: 'Foreground service playing bundled sounds via MediaPlayer with notification actions',
    content: `package com.smartalarm.app.service

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.*
import androidx.core.app.NotificationCompat
import com.smartalarm.app.MainActivity
import com.smartalarm.app.R
import com.smartalarm.app.data.local.AlarmDatabase
import com.smartalarm.app.ui.screens.AlarmRingingActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class AlarmService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val alarmId = intent?.getLongExtra(AlarmReceiver.EXTRA_ALARM_ID, -1L) ?: -1L
        
        CoroutineScope(Dispatchers.IO).launch {
            val db = AlarmDatabase.getInstance(applicationContext)
            val alarm = db.alarmDao().getAlarmById(alarmId)

            val alarmTitle = alarm?.name?.ifBlank { "Alarm" } ?: "Alarm"
            val notification = buildForegroundNotification(alarmId, alarmTitle)
            startForeground(NOTIFICATION_ID, notification)

            playAudio(alarm?.soundSelection)
            if (alarm?.isVibrationEnabled != false) {
                startVibration()
            }
        }

        return START_NOT_STICKY
    }

    private fun playAudio(soundSelection: String?) {
        try {
            val alertUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, alertUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startVibration() {
        vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        val pattern = longArrayOf(0, 500, 300, 500, 300, 1000)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
        } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(pattern, 0)
        }
    }

    private fun buildForegroundNotification(alarmId: Long, title: String): Notification {
        val fullScreenIntent = Intent(this, AlarmRingingActivity::class.java).apply {
            putExtra(AlarmReceiver.EXTRA_ALARM_ID, alarmId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            alarmId.toInt(),
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(title)
            .setContentText("Alarm is ringing")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setOngoing(true)
            .setAutoCancel(false)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Alarm Ringing Service",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Critical alerts when alarm fires"
                setSound(null, null)
                enableVibration(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null

        vibrator?.cancel()
        vibrator = null

        super.onDestroy()
    }

    companion object {
        const val CHANNEL_ID = "SMART_ALARM_RING_CHANNEL"
        const val NOTIFICATION_ID = 1001
    }
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/data/repository/AlarmRepository.kt',
    language: 'kotlin',
    category: 'database',
    description: 'Repository interface defining clean domain operations for alarms',
    content: `package com.smartalarm.app.data.repository

import com.smartalarm.app.data.model.Alarm
import kotlinx.coroutines.flow.Flow

interface AlarmRepository {
    fun getAllAlarms(): Flow<List<Alarm>>
    suspend fun getAlarmById(id: Long): Alarm?
    suspend fun saveAlarm(alarm: Alarm): Long
    suspend fun toggleAlarm(id: Long, isEnabled: Boolean)
    suspend fun deleteAlarm(alarm: Alarm)
    suspend fun skipNextOccurrence(id: Long)
    suspend fun handleAlarmTriggered(id: Long)
    suspend fun snoozeAlarm(id: Long)
    suspend fun dismissAlarm(id: Long)
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/data/repository/AlarmRepositoryImpl.kt',
    language: 'kotlin',
    category: 'database',
    description: 'Repository implementation coordinating Room database and AlarmScheduler',
    content: `package com.smartalarm.app.data.repository

import com.smartalarm.app.data.local.AlarmDao
import com.smartalarm.app.data.model.Alarm
import com.smartalarm.app.data.model.RepeatType
import com.smartalarm.app.scheduler.AlarmScheduler
import com.smartalarm.app.scheduler.AlarmUtils
import kotlinx.coroutines.flow.Flow

class AlarmRepositoryImpl(
    private val dao: AlarmDao,
    private val scheduler: AlarmScheduler
) : AlarmRepository {

    override fun getAllAlarms(): Flow<List<Alarm>> = dao.getAllAlarms()

    override suspend fun getAlarmById(id: Long): Alarm? = dao.getAlarmById(id)

    override suspend fun saveAlarm(alarm: Alarm): Long {
        val nextTrigger = AlarmUtils.calculateNextOccurrence(
            hour = alarm.hour,
            minute = alarm.minute,
            daysOfWeek = alarm.daysOfWeek,
            isSkippedNext = alarm.isSkippedNext
        )

        val updatedAlarm = alarm.copy(
            nextTriggerMillis = nextTrigger,
            updatedTimestamp = System.currentTimeMillis()
        )

        val id = if (alarm.id == 0L) {
            dao.insertAlarm(updatedAlarm)
        } else {
            dao.updateAlarm(updatedAlarm)
            alarm.id
        }

        val finalAlarm = updatedAlarm.copy(id = id)
        if (finalAlarm.isEnabled) {
            scheduler.schedule(finalAlarm)
        } else {
            scheduler.cancel(finalAlarm.id)
        }

        return id
    }

    override suspend fun toggleAlarm(id: Long, isEnabled: Boolean) {
        val alarm = dao.getAlarmById(id) ?: return
        val nextTrigger = if (isEnabled) {
            AlarmUtils.calculateNextOccurrence(alarm.hour, alarm.minute, alarm.daysOfWeek, alarm.isSkippedNext)
        } else {
            0L
        }

        val updated = alarm.copy(
            isEnabled = isEnabled,
            nextTriggerMillis = nextTrigger,
            updatedTimestamp = System.currentTimeMillis()
        )
        dao.updateAlarm(updated)

        if (isEnabled) {
            scheduler.schedule(updated)
        } else {
            scheduler.cancel(id)
        }
    }

    override suspend fun deleteAlarm(alarm: Alarm) {
        scheduler.cancel(alarm.id)
        dao.deleteAlarm(alarm)
    }

    override suspend fun skipNextOccurrence(id: Long) {
        val alarm = dao.getAlarmById(id) ?: return
        val newSkipState = !alarm.isSkippedNext
        val nextTrigger = AlarmUtils.calculateNextOccurrence(
            hour = alarm.hour,
            minute = alarm.minute,
            daysOfWeek = alarm.daysOfWeek,
            isSkippedNext = newSkipState
        )

        val updated = alarm.copy(
            isSkippedNext = newSkipState,
            nextTriggerMillis = nextTrigger,
            updatedTimestamp = System.currentTimeMillis()
        )
        dao.updateAlarm(updated)
        scheduler.schedule(updated)
    }

    override suspend fun handleAlarmTriggered(id: Long) {
        val alarm = dao.getAlarmById(id) ?: return

        // If one-time, disable after trigger. If weekly repeating, calculate next cycle!
        if (alarm.repeatType == RepeatType.ONETIME || alarm.daysOfWeek.isEmpty()) {
            val updated = alarm.copy(isEnabled = false, nextTriggerMillis = 0L)
            dao.updateAlarm(updated)
        } else {
            val nextCycle = AlarmUtils.calculateNextOccurrence(
                hour = alarm.hour,
                minute = alarm.minute,
                daysOfWeek = alarm.daysOfWeek,
                isSkippedNext = false // Reset skip flag
            )
            val updated = alarm.copy(
                isSkippedNext = false,
                nextTriggerMillis = nextCycle
            )
            dao.updateAlarm(updated)
            scheduler.schedule(updated)
        }
    }

    override suspend fun snoozeAlarm(id: Long) {
        val alarm = dao.getAlarmById(id) ?: return
        scheduler.scheduleSnooze(alarm, alarm.snoozeDurationMinutes)
    }

    override suspend fun dismissAlarm(id: Long) {
        // Will be called when user dismisses active ring
        handleAlarmTriggered(id)
    }
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/ui/viewmodel/AlarmViewModel.kt',
    language: 'kotlin',
    category: 'viewmodel',
    description: 'MVVM ViewModel exposing UI state Flow, delete, toggle, and skip actions',
    content: `package com.smartalarm.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartalarm.app.data.model.Alarm
import com.smartalarm.app.data.repository.AlarmRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

data class AlarmUiState(
    val alarms: List<Alarm> = emptyList(),
    val isLoading: Boolean = false,
    val userMessage: String? = null
)

class AlarmViewModel(
    private val repository: AlarmRepository
) : ViewModel() {

    private val _userMessage = MutableStateFlow<String?>(null)

    val uiState: StateFlow<AlarmUiState> = combine(
        repository.getAllAlarms(),
        _userMessage
    ) { alarms, message ->
        AlarmUiState(
            alarms = alarms,
            isLoading = false,
            userMessage = message
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = AlarmUiState(isLoading = true)
    )

    fun toggleAlarm(alarm: Alarm, isEnabled: Boolean) {
        viewModelScope.launch {
            repository.toggleAlarm(alarm.id, isEnabled)
        }
    }

    fun deleteAlarm(alarm: Alarm) {
        viewModelScope.launch {
            repository.deleteAlarm(alarm)
            _userMessage.value = "Alarm deleted"
        }
    }

    fun toggleSkipNext(alarmId: Long) {
        viewModelScope.launch {
            repository.skipNextOccurrence(alarmId)
        }
    }

    fun clearUserMessage() {
        _userMessage.value = null
    }
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/ui/screens/AlarmListScreen.kt',
    language: 'kotlin',
    category: 'ui',
    description: 'Jetpack Compose Material 3 Alarm list screen with cards, AM/PM, toggle, and FAB',
    content: `package com.smartalarm.app.ui.screens

import androidx.compose.animation.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartalarm.app.data.model.Alarm
import com.smartalarm.app.scheduler.AlarmUtils
import com.smartalarm.app.ui.viewmodel.AlarmUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlarmListScreen(
    uiState: AlarmUiState,
    onAddAlarmClick: () -> Unit,
    onEditAlarmClick: (Long) -> Unit,
    onToggleAlarm: (Alarm, Boolean) -> Unit,
    onDeleteAlarm: (Alarm) -> Unit,
    onToggleSkip: (Long) -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Alarm, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        Spacer(modifier = Modifier.width(12.dp))
                        Text("Smart Alarm", fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddAlarmClick,
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer
            ) {
                Icon(Icons.Default.Add, contentDescription = "Create Alarm")
            }
        }
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (uiState.alarms.isEmpty() && !uiState.isLoading) {
                EmptyAlarmsPlaceholder(modifier = Modifier.align(Alignment.Center))
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(uiState.alarms, key = { it.id }) { alarm ->
                        AlarmCard(
                            alarm = alarm,
                            onToggle = { isEnabled -> onToggleAlarm(alarm, isEnabled) },
                            onClick = { onEditAlarmClick(alarm.id) },
                            onDelete = { onDeleteAlarm(alarm) },
                            onSkip = { onToggleSkip(alarm.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AlarmCard(
    alarm: Alarm,
    onToggle: (Boolean) -> Unit,
    onClick: () -> Unit,
    onDelete: () -> Unit,
    onSkip: () -> Unit
) {
    val displayHour = if (alarm.hour % 12 == 0) 12 else alarm.hour % 12
    val amPm = if (alarm.hour >= 12) "PM" else "AM"
    val timeFormatted = String.format("%02d:%02d", displayHour, alarm.minute)
    val daysFormatted = AlarmUtils.formatDaysOfWeek(alarm.daysOfWeek)

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (alarm.isEnabled)
                MaterialTheme.colorScheme.surfaceVariant
            else
                MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(verticalAlignment = Alignment.Bottom) {
                        Text(
                            text = timeFormatted,
                            style = MaterialTheme.typography.displaySmall,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = amPm,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.padding(bottom = 6.dp)
                        )
                    }
                    if (alarm.name.isNotBlank()) {
                        Text(
                            text = alarm.name,
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
                Switch(
                    checked = alarm.isEnabled,
                    onCheckedChange = onToggle
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = daysFormatted,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.primary
                )
                IconButton(onClick = onDelete) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Delete Alarm",
                        tint = MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Composable
fun EmptyAlarmsPlaceholder(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            Icons.Default.Alarm,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = MaterialTheme.colorScheme.outline
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "No alarms scheduled",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.outline
        )
        Text(
            text = "Tap + to create your first alarm",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.outline
        )
    }
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/ui/screens/AlarmRingingActivity.kt',
    language: 'kotlin',
    category: 'ui',
    description: 'Full-screen LockScreen activity for when alarm fires with Dismiss and Snooze buttons',
    content: `package com.smartalarm.app.ui.screens

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Alarm
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Snooze
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.smartalarm.app.data.local.AlarmDatabase
import com.smartalarm.app.data.model.Alarm
import com.smartalarm.app.data.repository.AlarmRepositoryImpl
import com.smartalarm.app.receiver.AlarmReceiver
import com.smartalarm.app.scheduler.AndroidAlarmScheduler
import com.smartalarm.app.service.AlarmService
import com.smartalarm.app.ui.theme.SmartAlarmTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

class AlarmRingingActivity : ComponentActivity() {

    private var alarmId: Long = -1L

    override fun onCreate(savedInstanceState: Bundle?) {
        showOnLockScreen()
        super.onCreate(savedInstanceState)

        alarmId = intent.getLongExtra(AlarmReceiver.EXTRA_ALARM_ID, -1L)

        setContent {
            SmartAlarmTheme(darkTheme = true) {
                RingingScreen(
                    alarmId = alarmId,
                    onDismiss = { dismissAlarm() },
                    onSnooze = { snoozeAlarm() }
                )
            }
        }
    }

    private fun showOnLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
    }

    private fun dismissAlarm() {
        stopService(Intent(this, AlarmService::class.java))
        CoroutineScope(Dispatchers.IO).launch {
            val db = AlarmDatabase.getInstance(applicationContext)
            val scheduler = AndroidAlarmScheduler(applicationContext)
            val repository = AlarmRepositoryImpl(db.alarmDao(), scheduler)
            repository.dismissAlarm(alarmId)
        }
        finish()
    }

    private fun snoozeAlarm() {
        stopService(Intent(this, AlarmService::class.java))
        CoroutineScope(Dispatchers.IO).launch {
            val db = AlarmDatabase.getInstance(applicationContext)
            val scheduler = AndroidAlarmScheduler(applicationContext)
            val repository = AlarmRepositoryImpl(db.alarmDao(), scheduler)
            repository.snoozeAlarm(alarmId)
        }
        finish()
    }
}

@Composable
fun RingingScreen(
    alarmId: Long,
    onDismiss: () -> Unit,
    onSnooze: () -> Unit
) {
    var currentTime by remember { mutableStateOf(SimpleDateFormat("hh:mm", Locale.getDefault()).format(Date())) }
    var amPm by remember { mutableStateOf(SimpleDateFormat("a", Locale.getDefault()).format(Date())) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            // Top icon & status
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.padding(top = 40.dp)
            ) {
                Icon(
                    Icons.Default.Alarm,
                    contentDescription = null,
                    modifier = Modifier.size(56.dp),
                    tint = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Alarm Ringing",
                    style = MaterialTheme.typography.titleLarge,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            // Big Clock
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = currentTime,
                        style = MaterialTheme.typography.displayLarge.copy(fontSize = 72.sp),
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = amPm,
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )
                }
            }

            // Action Buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 48.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Snooze Button
                OutlinedButton(
                    onClick = onSnooze,
                    shape = CircleShape,
                    modifier = Modifier.size(96.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = MaterialTheme.colorScheme.primary
                    )
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Snooze, contentDescription = "Snooze")
                        Text("Snooze", style = MaterialTheme.typography.labelMedium)
                    }
                }

                // Dismiss Button
                Button(
                    onClick = onDismiss,
                    shape = CircleShape,
                    modifier = Modifier.size(96.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error,
                        contentColor = MaterialTheme.colorScheme.onError
                    )
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Close, contentDescription = "Dismiss")
                        Text("Dismiss", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/ui/theme/Theme.kt',
    language: 'kotlin',
    category: 'theme',
    description: 'Material 3 dynamic color theme and typography setup for Android',
    content: `package com.smartalarm.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFFD0BCFF),
    onPrimary = Color(0xFF381E72),
    primaryContainer = Color(0xFF4F378B),
    onPrimaryContainer = Color(0xFFEADDFF),
    secondary = Color(0xFFCCC2DC),
    background = Color(0xFF141218),
    surface = Color(0xFF141218),
    surfaceVariant = Color(0xFF49454F),
    onSurface = Color(0xFFE6E1E5)
)

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF6750A4),
    onPrimary = Color(0xFFFFFFFF),
    primaryContainer = Color(0xFFEADDFF),
    onPrimaryContainer = Color(0xFF21005D),
    secondary = Color(0xFF625B71),
    background = Color(0xFFFEF7FF),
    surface = Color(0xFFFEF7FF),
    surfaceVariant = Color(0xFFE7E0EC),
    onSurface = Color(0xFF1D1B20)
)

@Composable
fun SmartAlarmTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography(),
        content = content
    )
}`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/data/model/AlarmOccurrence.kt',
    language: 'kotlin',
    category: 'model',
    description: 'Room Entity representing an individual scheduled occurrence of an alarm (1:N relationship with Alarm)',
    content: `package com.smartalarm.app.data.model

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

enum class OccurrenceStatus {
    CONFIRMATION_SCHEDULED,
    WAITING_FOR_USER,
    CONFIRMED,
    SKIPPED,
    MODIFIED,
    DISMISSED,
    EXPIRED
}

enum class ConfirmationStatus {
    PENDING,
    CONFIRMED_YES,
    SKIPPED_ONCE,
    MODIFIED_TIME,
    DECIDE_LATER,
    SKIPPED_MULTI_DAY,
    AUTO_EXPIRED
}

enum class MissedConfirmationDefault {
    DO_NOT_RING,
    RING_ANYWAY
}

@Entity(
    tableName = "alarm_occurrences",
    foreignKeys = [
        ForeignKey(
            entity = Alarm::class,
            parentColumns = ["id"],
            childColumns = ["parent_alarm_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("parent_alarm_id")]
)
data class AlarmOccurrence(
    @PrimaryKey
    val id: String,
    
    @ColumnInfo(name = "parent_alarm_id")
    val parentAlarmId: String,
    
    @ColumnInfo(name = "parent_alarm_name")
    val parentAlarmName: String,
    
    @ColumnInfo(name = "scheduled_date_time")
    val scheduledDateTime: Long,
    
    @ColumnInfo(name = "confirmation_scheduled_time")
    val confirmationScheduledTime: Long,
    
    @ColumnInfo(name = "status")
    val status: OccurrenceStatus = OccurrenceStatus.CONFIRMATION_SCHEDULED,
    
    @ColumnInfo(name = "confirmation_status")
    val confirmationStatus: ConfirmationStatus = ConfirmationStatus.PENDING,
    
    @ColumnInfo(name = "modified_hour")
    val modifiedHour: Int? = null,
    
    @ColumnInfo(name = "modified_minute")
    val modifiedMinute: Int? = null,
    
    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)`
  },
  {
    path: 'app/src/main/java/com/smartalarm/app/domain/engine/AlarmDecisionEngine.kt',
    language: 'kotlin',
    category: 'scheduler',
    description: 'AI Assistant Ready decision engine interface & implementation for evaluating adaptive alarm behavior',
    content: `package com.smartalarm.app.domain.engine

import com.smartalarm.app.data.model.Alarm
import com.smartalarm.app.data.model.AlarmBehavior

sealed class AlarmActionDecision {
    data class RingAlarm(val scheduledTimeMillis: Long) : AlarmActionDecision()
    data class AskConfirmation(val confirmationTimeMillis: Long, val targetAlarmTimeMillis: Long) : AlarmActionDecision()
    object DoNothing : AlarmActionDecision()
}

interface AlarmDecisionEngine {
    fun evaluate(alarm: Alarm, nextTriggerMillis: Long, nowMillis: Long): AlarmActionDecision
}

class DefaultAlarmDecisionEngine : AlarmDecisionEngine {
    override fun evaluate(alarm: Alarm, nextTriggerMillis: Long, nowMillis: Long): AlarmActionDecision {
        if (!alarm.isEnabled) return AlarmActionDecision.DoNothing
        
        return when (alarm.behavior) {
            AlarmBehavior.ALWAYS -> AlarmActionDecision.RingAlarm(nextTriggerMillis)
            AlarmBehavior.ASK_BEFORE -> {
                val leadMillis = (alarm.askAdvanceMinutes ?: 720) * 60 * 1000L
                val askTime = nextTriggerMillis - leadMillis
                AlarmActionDecision.AskConfirmation(
                    confirmationTimeMillis = askTime,
                    targetAlarmTimeMillis = nextTriggerMillis
                )
            }
        }
    }
}`
  }
];
