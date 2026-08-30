package com.smartalarm.app.notification

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.receiver.AlarmActionReceiver
import com.smartalarm.app.ui.ringing.AlarmRingingActivity

/**
 * Owns the alarm notification channel and builds the ringing notification (full-screen intent +
 * lock-screen visible + Snooze/Dismiss actions). The channel's own sound is disabled
 * ([NotificationChannel.setSound] null) because [AlarmRingingActivity] plays the alarm tone
 * itself via a looping player - a channel sound would double up with it.
 */
object NotificationHelper {
    const val CHANNEL_ID = "alarm_ringing_channel"
    private const val CHANNEL_NAME = "Alarm ringing"

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val existing = manager.getNotificationChannel(CHANNEL_ID)
        if (existing != null) return

        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Shown while an alarm is ringing"
            setSound(null, null)
            enableVibration(false) // AlarmRingingActivity/AlarmReceiver handles vibration directly
            setBypassDnd(true)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        }
        manager.createNotificationChannel(channel)
    }

    fun areNotificationsEnabled(context: Context): Boolean =
        NotificationManagerCompat.from(context).areNotificationsEnabled()

    fun notificationIdFor(occurrenceId: Long): Int = occurrenceId.toInt()

    fun showRinging(context: Context, alarm: Alarm, occurrenceId: Long) {
        ensureChannel(context)

        val fullScreenIntent = Intent(context, AlarmRingingActivity::class.java).apply {
            putExtra(AlarmRingingActivity.EXTRA_OCCURRENCE_ID, occurrenceId)
            putExtra(AlarmRingingActivity.EXTRA_ALARM_ID, alarm.id)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            occurrenceId.toInt(),
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(alarm.name.ifBlank { "Alarm" })
            .setContentText("Tap to open")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(dismissAction(context, occurrenceId))

        if (alarm.isSnoozeEnabled) {
            builder.addAction(snoozeAction(context, occurrenceId))
        }

        // MainActivity already requests POST_NOTIFICATIONS at app launch (API 33+), but this is a
        // real BroadcastReceiver-triggered call that can run long after that - a user may have
        // since revoked the permission from system settings. Checking here (rather than relying
        // solely on that earlier request) is both what Android Lint's MissingPermission check
        // requires and the only way to be certain right at the moment we actually need it.
        //
        // The check is written inline (not delegated to a helper function) because Android
        // Lint's MissingPermission analysis does not reliably trace a permission check across a
        // function boundary - verified directly: an earlier version of this code that called a
        // private hasNotificationPermission(context): Boolean helper still failed lintDebug with
        // the identical error on this exact line, even though the logic was equivalent.
        //
        // KNOWN PHASE 1 LIMITATION: if permission was revoked, this occurrence's notification -
        // and with it the full-screen intent that launches AlarmRingingActivity (see
        // AlarmReceiver) - is skipped entirely, so the alarm neither rings audibly nor shows any
        // UI for that occurrence. There is currently no non-notification fallback path (e.g.
        // directly starting AlarmRingingActivity from the receiver) to cover this case; that
        // would need its own design work (background-activity-launch restrictions differ by
        // Android version) and is left for a later phase rather than folded into this build fix.
        // Written as one literal condition directly inside the `if` (not a local val computed
        // beforehand, not a helper function) to match the exact form Lint's MissingPermission
        // analysis reliably recognizes.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        ) {
            NotificationManagerCompat.from(context).notify(notificationIdFor(occurrenceId), builder.build())
        }
    }

    fun cancel(context: Context, occurrenceId: Long) {
        NotificationManagerCompat.from(context).cancel(notificationIdFor(occurrenceId))
    }

    private fun snoozeAction(context: Context, occurrenceId: Long): NotificationCompat.Action {
        val intent = actionIntent(context, AlarmActionReceiver.ACTION_SNOOZE, occurrenceId)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCodeFor(occurrenceId, AlarmActionReceiver.ACTION_SNOOZE),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Action.Builder(0, "Snooze", pendingIntent).build()
    }

    private fun dismissAction(context: Context, occurrenceId: Long): NotificationCompat.Action {
        val intent = actionIntent(context, AlarmActionReceiver.ACTION_DISMISS, occurrenceId)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCodeFor(occurrenceId, AlarmActionReceiver.ACTION_DISMISS),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Action.Builder(0, "Dismiss", pendingIntent).build()
    }

    private fun actionIntent(context: Context, action: String, occurrenceId: Long): Intent =
        Intent(context, AlarmActionReceiver::class.java).apply {
            this.action = action
            data = Uri.parse("smartalarm://occurrence/$occurrenceId/$action")
            putExtra(AlarmActionReceiver.EXTRA_OCCURRENCE_ID, occurrenceId)
        }

    // Distinct request codes per (occurrenceId, action) so the Snooze and Dismiss
    // PendingIntents on the same notification never collide with each other.
    private fun requestCodeFor(occurrenceId: Long, action: String): Int =
        (occurrenceId.toInt() * 31) + action.hashCode()
}
