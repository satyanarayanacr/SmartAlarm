package com.smartalarm.app

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.smartalarm.app.ui.navigation.SmartAlarmNavHost
import com.smartalarm.app.ui.theme.SmartAlarmTheme

/** Compact vs. expanded window-width breakpoint (dp), matching Material's standard guidance. */
private const val WIDE_LAYOUT_MIN_WIDTH_DP = 600

class MainActivity : ComponentActivity() {

    private val requestNotificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { /* No further action needed: the system remembers the user's choice. */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val locator = (application as SmartAlarmApplication).serviceLocator

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
            if (!granted) {
                requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        setContent {
            SmartAlarmTheme {
                Surface(color = MaterialTheme.colorScheme.background) {
                    val isWideLayout = LocalConfiguration.current.screenWidthDp >= WIDE_LAYOUT_MIN_WIDTH_DP

                    var exactAlarmGranted by remember {
                        mutableStateOf(locator.scheduler.canScheduleExactAlarms())
                    }

                    // Re-check exact-alarm permission whenever this Activity resumes, so
                    // returning from the Settings screen below immediately reflects the user's
                    // choice without needing to restart the Activity.
                    val lifecycleOwner = LocalLifecycleOwner.current
                    DisposableEffect(lifecycleOwner) {
                        val observer = LifecycleEventObserver { _, event ->
                            if (event == Lifecycle.Event.ON_RESUME) {
                                exactAlarmGranted = locator.scheduler.canScheduleExactAlarms()
                            }
                        }
                        lifecycleOwner.lifecycle.addObserver(observer)
                        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
                    }

                    Column {
                        if (!exactAlarmGranted) {
                            ExactAlarmPermissionBanner(
                                onRequestPermission = {
                                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                                        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                                            data = Uri.parse("package:$packageName")
                                        }
                                        startActivity(intent)
                                    }
                                },
                            )
                        }
                        SmartAlarmNavHost(locator = locator, isWideLayout = isWideLayout)
                    }
                }
            }
        }
    }
}

@Composable
private fun ExactAlarmPermissionBanner(onRequestPermission: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "Exact alarms need permission to ring on time.",
            modifier = Modifier.padding(end = 8.dp),
            style = MaterialTheme.typography.bodySmall,
        )
        Button(onClick = onRequestPermission) { Text("Allow") }
    }
}
