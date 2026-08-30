package com.smartalarm.app.ui.confirmation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.smartalarm.app.domain.usecase.ConfirmableOccurrence
import com.smartalarm.app.ui.alarms.formatAlarmTime
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * "Do you need these tomorrow?" review screen (spec section 8). Each row's checkbox means
 * "include this alarm in whichever action button I press next" - not "keep" or "skip" by itself.
 * Every row starts checked (matching the spec's mockup, and "no response -> keep" in spirit: the
 * default action is Keep Selected on everything). To skip just one alarm while keeping the rest
 * (spec section 7's "skip one, keep another"), uncheck every row except that one and tap
 * "Skip Selected" - or leave everything checked and tap "Skip Selected" to skip them all, which is
 * exactly what "Skip All" also does as a one-tap shortcut. "Keep All" / "Skip All" always act on
 * the full list regardless of checkbox state (spec section 7's stated minimum); "Keep Selected" /
 * "Skip Selected" act on whatever is currently checked (section 8's named buttons).
 *
 * Adaptive by construction, not by having two implementations: this is a single Compose function
 * used identically from both the compact (NavHost route) and wide (side-by-side pane) layouts in
 * [com.smartalarm.app.ui.navigation.SmartAlarmNavHost] - only the caller's arrangement differs.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ConfirmationReviewScreen(
    isLoading: Boolean,
    confirmable: List<ConfirmableOccurrence>,
    onKeepAll: () -> Unit,
    onSkipAll: () -> Unit,
    onKeepSelected: (List<Long>) -> Unit,
    onSkipSelected: (List<Long>) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    // occurrenceId -> checked (true = keep). Re-seeded whenever the underlying list changes (e.g.
    // after a partial skip removes some rows) so stale ids from a previous load never linger.
    var checkedIds by remember(confirmable) {
        mutableStateOf(confirmable.map { it.occurrence.id }.toSet())
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(
                title = { Text("Tomorrow's alarms") },
                navigationIcon = { TextButton(onClick = onBack) { Text("Back") } },
            )
        },
    ) { padding ->
        when {
            isLoading -> Column(
                modifier = Modifier.fillMaxSize().padding(padding),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) { CircularProgressIndicator() }

            confirmable.isEmpty() -> Column(
                modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text("No recurring alarms need confirmation for tomorrow.", style = MaterialTheme.typography.bodyMedium)
            }

            else -> Column(modifier = Modifier.fillMaxSize().padding(padding)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    OutlinedButton(
                        onClick = onKeepAll,
                        modifier = Modifier.fillMaxWidth(0.5f),
                    ) { Text("Keep all") }
                    OutlinedButton(
                        onClick = onSkipAll,
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Skip all") }
                }

                LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(confirmable, key = { it.occurrence.id }) { item ->
                        val checked = item.occurrence.id in checkedIds
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Checkbox(
                                    checked = checked,
                                    onCheckedChange = { isChecked ->
                                        checkedIds = if (isChecked) {
                                            checkedIds + item.occurrence.id
                                        } else {
                                            checkedIds - item.occurrence.id
                                        }
                                    },
                                )
                                Column {
                                    Text(
                                        text = formatAlarmTime(item.alarm.hour, item.alarm.minute) +
                                            " (" + formatDate(item.occurrence.scheduledTimeMillis) + ")",
                                        style = MaterialTheme.typography.bodyLarge,
                                    )
                                    Text(
                                        text = item.alarm.name.ifBlank { "Alarm" },
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                            }
                        }
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    OutlinedButton(
                        onClick = { onKeepSelected(checkedIds.toList()) },
                        modifier = Modifier.fillMaxWidth(0.5f),
                    ) { Text("Keep selected") }
                    OutlinedButton(
                        onClick = { onSkipSelected(checkedIds.toList()) },
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Skip selected") }
                }
            }
        }
    }
}

private fun formatDate(millis: Long): String =
    SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(Date(millis))
