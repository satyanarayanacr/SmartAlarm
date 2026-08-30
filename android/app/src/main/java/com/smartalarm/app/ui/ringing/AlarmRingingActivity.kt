package com.smartalarm.app.ui.ringing

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.lifecycleScope
import com.smartalarm.app.SmartAlarmApplication
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.notification.NotificationHelper
import com.smartalarm.app.ui.theme.SmartAlarmTheme
import kotlinx.coroutines.launch

/**
 * Full-screen, lock-screen-capable ringing UI. Launched either directly by AlarmManager's
 * full-screen intent (device locked / high-priority case) or by tapping the ringing notification.
 * `launchMode="singleInstance"` in the manifest guarantees at most one instance is ever showing,
 * even if both paths fire for the same occurrence.
 */
class AlarmRingingActivity : ComponentActivity() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        showOverLockScreen()

        val occurrenceId = intent.getLongExtra(EXTRA_OCCURRENCE_ID, -1L)
        val alarmId = intent.getLongExtra(EXTRA_ALARM_ID, -1L)

        if (occurrenceId == -1L || alarmId == -1L) {
            finish()
            return
        }

        val locator = (application as SmartAlarmApplication).serviceLocator

        setContent {
            SmartAlarmTheme {
                var alarm by remember { mutableStateOf<Alarm?>(null) }

                LaunchedEffect(alarmId) {
                    alarm = locator.repository.getAlarm(alarmId)
                    alarm?.let { startRinging(it) }
                }

                alarm?.let { currentAlarm ->
                    AlarmRingingScreen(
                        alarmName = currentAlarm.name,
                        snoozeEnabled = currentAlarm.isSnoozeEnabled,
                        snoozeDurationMinutes = currentAlarm.snoozeDurationMinutes,
                        onSnooze = {
                            lifecycleScope.launch {
                                locator.snoozeOccurrenceUseCase.execute(occurrenceId)
                                NotificationHelper.cancel(this@AlarmRingingActivity, occurrenceId)
                                finish()
                            }
                        },
                        onDismiss = {
                            lifecycleScope.launch {
                                locator.dismissOccurrenceUseCase.execute(occurrenceId)
                                NotificationHelper.cancel(this@AlarmRingingActivity, occurrenceId)
                                finish()
                            }
                        },
                    )
                }
            }
        }
    }

    private fun showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                    WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun startRinging(alarm: Alarm) {
        val uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        mediaPlayer = MediaPlayer().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            isLooping = true
            try {
                setDataSource(this@AlarmRingingActivity, uri)
                prepare()
                start()
            } catch (_: Exception) {
                // Fails safe: a missing/unreadable ringtone URI must never crash the ringing
                // screen - the visual UI and vibration still work, and dismiss/snooze still do.
            }
        }

        if (alarm.isVibrationEnabled) {
            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            val pattern = longArrayOf(0, 500, 500)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
        }
    }

    override fun onDestroy() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
        mediaPlayer = null
        vibrator?.cancel()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_OCCURRENCE_ID = "extra_occurrence_id"
        const val EXTRA_ALARM_ID = "extra_alarm_id"
    }
}
