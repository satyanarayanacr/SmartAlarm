package com.smartalarm.app.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.smartalarm.app.notification.NotificationHelper

/**
 * Handles the confirmation notification's "KEEP ALL" action. Deliberately does nothing to any
 * occurrence: per the spec's "no response -> keep" default, a SCHEDULED occurrence already stays
 * scheduled unless the user explicitly skips it, so "keep all" has no state to change - it only
 * needs to dismiss the notification with clear positive acknowledgement. "REVIEW" (the other
 * action) is a plain content/activity intent handled by MainActivity instead, since it needs to
 * open the app's review screen rather than run in the background.
 */
class ConfirmationActionReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION_KEEP_ALL) return
        NotificationHelper.cancelDailyConfirmation(context)
    }

    companion object {
        const val ACTION_KEEP_ALL = "com.smartalarm.app.action.CONFIRMATION_KEEP_ALL"
    }
}
