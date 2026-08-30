package com.smartalarm.app.ui.alarms

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.domain.model.RepeatType

private val DAY_ORDER = listOf(1, 2, 3, 4, 5, 6, 7)
private val DAY_SHORT_LABELS = mapOf(
    1 to "M", 2 to "T", 3 to "W", 4 to "T", 5 to "F", 6 to "S", 7 to "S",
)

/**
 * Material 3 Create/Edit alarm screen supporting per-alarm confirmation configuration.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlarmEditScreen(
    alarmToEdit: Alarm?,
    onSave: (Alarm) -> Unit,
    onDelete: (Alarm) -> Unit,
    onCancel: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val alarmTimePickerState = rememberTimePickerState(
        initialHour = alarmToEdit?.hour ?: 7,
        initialMinute = alarmToEdit?.minute ?: 0,
        is24Hour = false,
    )
    var name by remember { mutableStateOf(alarmToEdit?.name ?: "Alarm") }
    var repeatType by remember { mutableStateOf(alarmToEdit?.repeatType ?: RepeatType.ONE_TIME) }
    var selectedDays by remember { mutableStateOf(alarmToEdit?.daysOfWeek ?: emptySet()) }
    var vibrationEnabled by remember { mutableStateOf(alarmToEdit?.isVibrationEnabled ?: true) }
    var snoozeEnabled by remember { mutableStateOf(alarmToEdit?.isSnoozeEnabled ?: true) }
    var snoozeMinutes by remember { mutableStateOf((alarmToEdit?.snoozeDurationMinutes ?: 9).toFloat()) }

    var isConfirmationEnabled by remember { mutableStateOf(alarmToEdit?.isConfirmationEnabled ?: false) }
    var confirmationHour by remember { mutableStateOf(alarmToEdit?.confirmationHour ?: 21) }
    var confirmationMinute by remember { mutableStateOf(alarmToEdit?.confirmationMinute ?: 0) }
    var showConfirmationPicker by remember { mutableStateOf(false) }

    val confirmationTimePickerState = rememberTimePickerState(
        initialHour = confirmationHour,
        initialMinute = confirmationMinute,
        is24Hour = false,
    )

    var validationError by remember { mutableStateOf<String?>(null) }

    fun toggleDay(day: Int) {
        selectedDays = if (day in selectedDays) selectedDays - day else selectedDays + day
        repeatType = if (selectedDays.isEmpty()) RepeatType.ONE_TIME else RepeatType.WEEKLY
    }

    Scaffold(
        modifier = modifier,
        topBar = {
            TopAppBar(title = { Text(if (alarmToEdit == null) "New alarm" else "Edit alarm") })
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            ) {
                Column(
                    modifier = Modifier.padding(16.dp).fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    TimePicker(state = alarmTimePickerState)
                }
            }

            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Alarm name") },
                modifier = Modifier.fillMaxWidth(),
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Repeat schedule", style = MaterialTheme.typography.labelLarge)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        DAY_ORDER.forEach { day ->
                            FilterChip(
                                selected = day in selectedDays,
                                onClick = { toggleDay(day) },
                                label = { Text(DAY_SHORT_LABELS.getValue(day)) },
                            )
                        }
                    }
                    Text(
                        text = if (repeatType == RepeatType.ONE_TIME) "Rings once" else "Rings weekly on selected days",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(modifier = Modifier.widthIn(max = 240.dp)) {
                            Text("Ask before ringing", style = MaterialTheme.typography.titleMedium)
                            Text(
                                "Receive a notification the evening before to confirm or skip.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        Switch(
                            checked = isConfirmationEnabled,
                            onCheckedChange = { isConfirmationEnabled = it },
                        )
                    }

                    if (isConfirmationEnabled) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                text = "Confirmation time: " + formatAlarmTime(confirmationHour, confirmationMinute),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                            TextButton(onClick = { showConfirmationPicker = !showConfirmationPicker }) {
                                Text(if (showConfirmationPicker) "Done" else "Change")
                            }
                        }

                        if (showConfirmationPicker) {
                            Column(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                TimePicker(state = confirmationTimePickerState)
                                Button(
                                    onClick = {
                                        confirmationHour = confirmationTimePickerState.hour
                                        confirmationMinute = confirmationTimePickerState.minute
                                        showConfirmationPicker = false
                                    },
                                    modifier = Modifier.padding(top = 8.dp),
                                ) {
                                    Text("Set confirmation time")
                                }
                            }
                        }
                    }
                }
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            ) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Vibrate", style = MaterialTheme.typography.titleMedium)
                        Switch(checked = vibrationEnabled, onCheckedChange = { vibrationEnabled = it })
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Snooze", style = MaterialTheme.typography.titleMedium)
                        Switch(checked = snoozeEnabled, onCheckedChange = { snoozeEnabled = it })
                    }

                    if (snoozeEnabled) {
                        Text("Snooze duration: ${snoozeMinutes.toInt()} min", style = MaterialTheme.typography.labelMedium)
                        Slider(
                            value = snoozeMinutes,
                            onValueChange = { snoozeMinutes = it },
                            valueRange = 1f..30f,
                            steps = 28,
                        )
                    }
                }
            }

            validationError?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Row(modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(
                    onClick = onCancel,
                    modifier = Modifier.fillMaxWidth(0.5f).padding(end = 6.dp),
                ) { Text("Cancel") }
                Button(
                    modifier = Modifier.fillMaxWidth(0.5f).padding(start = 6.dp),
                    onClick = {
                        if (repeatType == RepeatType.WEEKLY && selectedDays.isEmpty()) {
                            validationError = "Select at least one day, or switch to one-time"
                            return@Button
                        }
                        validationError = null
                        val effectiveConfHour = if (showConfirmationPicker) confirmationTimePickerState.hour else confirmationHour
                        val effectiveConfMin = if (showConfirmationPicker) confirmationTimePickerState.minute else confirmationMinute
                        val alarm = Alarm(
                            id = alarmToEdit?.id ?: 0L,
                            name = name.ifBlank { "Alarm" },
                            hour = alarmTimePickerState.hour,
                            minute = alarmTimePickerState.minute,
                            isEnabled = alarmToEdit?.isEnabled ?: true,
                            repeatType = repeatType,
                            daysOfWeek = if (repeatType == RepeatType.WEEKLY) selectedDays else emptySet(),
                            isVibrationEnabled = vibrationEnabled,
                            isSnoozeEnabled = snoozeEnabled,
                            snoozeDurationMinutes = snoozeMinutes.toInt().coerceIn(1, 60),
                            isConfirmationEnabled = isConfirmationEnabled,
                            confirmationHour = effectiveConfHour,
                            confirmationMinute = effectiveConfMin,
                        )
                        onSave(alarm)
                    },
                ) { Text("Save") }
            }

            if (alarmToEdit != null) {
                OutlinedButton(
                    onClick = { onDelete(alarmToEdit) },
                    modifier = Modifier.fillMaxWidth(),
                ) { Text("Delete alarm") }
            }
        }
    }
}

