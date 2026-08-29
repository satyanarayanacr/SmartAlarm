package com.smartalarm.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.smartalarm.app.ui.theme.SmartAlarmTheme

/**
 * Single Activity for the empty-app foundation milestone.
 *
 * This screen exists to prove the real Android/Gradle/Compose toolchain works end to end
 * (manifest, application id, Compose rendering, theming). It intentionally contains none of
 * the Phase 1-4 alarm/zone/timezone functionality, which is migrated from the React/TypeScript
 * simulator in later, separately-approved milestones.
 */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            SmartAlarmTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    FoundationScreen()
                }
            }
        }
    }
}

@Composable
private fun FoundationScreen() {
    Scaffold { innerPadding: PaddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "⏰",
                style = MaterialTheme.typography.displayMedium
            )
            Text(
                text = "Smart Alarm",
                style = MaterialTheme.typography.headlineMedium
            )
            Text(
                text = "Android project foundation — Phase 4.5",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "Real Gradle build. Real Compose UI. No simulated timers.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun FoundationScreenPreview() {
    SmartAlarmTheme {
        FoundationScreen()
    }
}
