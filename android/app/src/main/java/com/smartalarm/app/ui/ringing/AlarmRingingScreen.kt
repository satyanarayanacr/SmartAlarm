package com.smartalarm.app.ui.ringing

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp

/**
 * Visual reference: the simulator's `AlarmRingingScreen.tsx` full-screen ringing card (bell icon,
 * alarm name, big clock area substituted here with the alarm name/time, Snooze + Dismiss action
 * row). Reimplemented natively rather than ported line-for-line, per the Phase 1 spec.
 *
 * Uses plain emoji/text rather than androidx.compose.material.icons.* on purpose: the small
 * "core" icon set does not reliably include alarm/snooze glyphs, and pulling in the much larger
 * material-icons-extended artifact just for two icons was judged not worth another dependency
 * and version to track in Phase 1.
 */
@Composable
fun AlarmRingingScreen(
    alarmName: String,
    snoozeEnabled: Boolean,
    snoozeDurationMinutes: Int,
    onSnooze: () -> Unit,
    onDismiss: () -> Unit,
) {
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Scaffold { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(24.dp),
                verticalArrangement = Arrangement.SpaceBetween,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(top = 48.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.Top),
                ) {
                    Text(text = "⏰", style = MaterialTheme.typography.displayMedium)
                    Text(text = "Ringing now", style = MaterialTheme.typography.labelLarge)
                    Text(
                        text = alarmName.ifBlank { "Alarm" },
                        style = MaterialTheme.typography.headlineMedium,
                    )
                }

                // Modifier.weight(1f) (the idiomatic choice here) hits the same real Kotlin
                // 2.4.10/Compose UI 1.12.0 "internal in file" compile failure documented in
                // SmartAlarmNavHost.kt. fillMaxWidth(fraction) + directional padding gives the
                // same 50/50 split (or full width when Snooze is hidden) with an ~16dp gap
                // without depending on RowScope.weight - see the longer explanation on the
                // equivalent Cancel/Save buttons in AlarmEditScreen.kt.
                val dismissModifier = if (snoozeEnabled) {
                    Modifier.fillMaxWidth(0.5f).padding(start = 8.dp)
                } else {
                    Modifier.fillMaxWidth()
                }
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 24.dp),
                ) {
                    if (snoozeEnabled) {
                        OutlinedButton(
                            onClick = onSnooze,
                            modifier = Modifier.fillMaxWidth(0.5f).padding(end = 8.dp),
                        ) {
                            Text("Snooze ${snoozeDurationMinutes}m")
                        }
                    }
                    Button(
                        onClick = onDismiss,
                        modifier = dismissModifier,
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    ) {
                        Text("Dismiss")
                    }
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun AlarmRingingScreenPreview() {
    AlarmRingingScreen(
        alarmName = "Morning Alarm",
        snoozeEnabled = true,
        snoozeDurationMinutes = 9,
        onSnooze = {},
        onDismiss = {},
    )
}
