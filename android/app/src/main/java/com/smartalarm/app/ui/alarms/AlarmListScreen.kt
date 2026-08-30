package com.smartalarm.app.ui.alarms

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.AlarmOccurrence
import com.smartalarm.app.domain.model.OccurrenceStatus
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Adaptive alarm list. Single Compose codebase for phone and tablet, portrait and landscape: the
 * list itself always renders the same way (a scrolling column of cards), and [isWideLayout]
 * (computed once by the caller from the current window width, see MainActivity) only changes
 * whether it is shown alone (compact width - phones, portrait tablets) or side-by-side with the
 * edit pane (expanded width - landscape tablets/foldables), matching the "adaptive, not two
 * separate codebases" requirement.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlarmListScreen(
    alarms: List<Alarm>,
    occurrences: List<AlarmOccurrence>,
    onAddAlarm: () -> Unit,
    onEditAlarm: (Alarm) -> Unit,
    onToggleAlarm: (Long, Boolean) -> Unit,
    onDeleteAlarm: (Alarm) -> Unit,
    onOpenSettings: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Smart Alarm") },
                actions = { TextButton(onClick = onOpenSettings) { Text("Settings") } },
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddAlarm) { Text("+", style = MaterialTheme.typography.headlineSmall) }
        },
    ) { padding ->
        if (alarms.isEmpty()) {
            Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("No alarms yet", style = MaterialTheme.typography.titleMedium)
                Text(
                    "Tap + to create your first alarm",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            val sorted = alarms.sortedWith(compareBy({ it.hour }, { it.minute }))
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(sorted, key = { it.id }) { alarm ->
                    val nextOccurrence = occurrences
                        .filter {
                            it.alarmId == alarm.id &&
                                (it.status == OccurrenceStatus.SCHEDULED || it.status == OccurrenceStatus.SNOOZED)
                        }
                        .minByOrNull { it.scheduledTimeMillis }
                    AlarmCard(
                        alarm = alarm,
                        nextOccurrence = nextOccurrence,
                        onToggle = { checked -> onToggleAlarm(alarm.id, checked) },
                        onEdit = { onEditAlarm(alarm) },
                        onDelete = { onDeleteAlarm(alarm) },
                    )
                }
            }
        }
    }
}

@Composable
private fun AlarmCard(
    alarm: Alarm,
    nextOccurrence: AlarmOccurrence?,
    onToggle: (Boolean) -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Modifier.weight(1f) (the idiomatic choice here) hits the same real Kotlin
                // 2.4.10/Compose UI 1.12.0 "internal in file" compile failure documented in
                // SmartAlarmNavHost.kt - widthIn(max) is an unrelated API that keeps the text
                // column from pushing the Switch off-screen without depending on RowScope.weight.
                Column(modifier = Modifier.widthIn(max = 240.dp)) {
                    Text(
                        text = formatAlarmTime(alarm.hour, alarm.minute),
                        style = MaterialTheme.typography.headlineSmall,
                        textDecoration = if (alarm.isEnabled) null else TextDecoration.LineThrough,
                    )
                    Text(
                        text = alarm.name.ifBlank { "Alarm" },
                        style = MaterialTheme.typography.bodyLarge,
                    )
                    Text(
                        text = formatRepeatDays(alarm),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                    )
                    if (alarm.isEnabled && nextOccurrence != null) {
                        Text(
                            text = "Next: " + formatDateTime(nextOccurrence.scheduledTimeMillis),
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Switch(checked = alarm.isEnabled, onCheckedChange = onToggle)
            }
            Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                TextButton(onClick = onEdit) { Text("Edit") }
                TextButton(onClick = onDelete) { Text("Delete") }
            }
        }
    }
}

private fun formatDateTime(millis: Long): String =
    SimpleDateFormat("EEE, MMM d 'at' h:mm a", Locale.getDefault()).format(Date(millis))
