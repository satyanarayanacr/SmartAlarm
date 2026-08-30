package com.smartalarm.app.ui.confirmation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.smartalarm.app.domain.model.ConfirmationSettings

/**
 * Settings screen for Phase 1.1's daily alarm confirmation (spec section 15): an enable/disable
 * switch plus the confirmation time-of-day, both backed by the single persisted
 * [ConfirmationSettings] row. Every change is applied immediately via [onSettingsChanged] (same
 * "no explicit Save button" style already used for the enabled toggle on the alarm list) rather
 * than requiring a separate confirm step - there is nothing destructive here to guard against.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConfirmationSettingsScreen(
    settings: ConfirmationSettings,
    onSettingsChanged: (ConfirmationSettings) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val timePickerState = rememberTimePickerState(
        initialHour = settings.hour,
        initialMinute = settings.minute,
        is24Hour = false,
    )
    // Keep the picker in sync if `settings` changes from outside this screen (e.g. the Flow
    // re-emits after a save triggered elsewhere) - without this, re-opening the screen a second
    // time could show stale picker state left over from a previous composition.
    LaunchedEffect(settings.hour, settings.minute) {
        timePickerState.hour = settings.hour
        timePickerState.minute = settings.minute
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Daily alarm confirmation") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.widthIn(max = 260.dp)) {
                    Text("Ask me about tomorrow's alarms", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "For recurring alarms, ask each day whether you still need tomorrow's alarm.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Switch(
                    checked = settings.isEnabled,
                    onCheckedChange = { onSettingsChanged(settings.copy(isEnabled = it)) },
                )
            }

            if (settings.isEnabled) {
                Text("Confirmation time", style = MaterialTheme.typography.labelLarge)
                TimePicker(state = timePickerState)
                TextButton(
                    onClick = {
                        onSettingsChanged(
                            settings.copy(hour = timePickerState.hour, minute = timePickerState.minute)
                        )
                    },
                ) { Text("Set confirmation time") }
            } else {
                Text(
                    "No daily confirmation notifications will be scheduled while this is off. " +
                        "Your alarms will continue to work normally.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
