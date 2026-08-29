package com.smartalarm.app.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext

private val LightColors = lightColorScheme(
    primary = SmartAlarmPrimaryLight,
    onPrimary = SmartAlarmOnPrimaryLight,
    secondary = SmartAlarmSecondaryLight,
    background = SmartAlarmBackgroundLight,
    surface = SmartAlarmSurfaceLight,
    onSurface = SmartAlarmOnSurfaceLight,
    onSurfaceVariant = SmartAlarmOnSurfaceVariantLight
)

private val DarkColors = darkColorScheme(
    primary = SmartAlarmPrimaryDark,
    onPrimary = SmartAlarmOnPrimaryDark,
    secondary = SmartAlarmSecondaryDark,
    background = SmartAlarmBackgroundDark,
    surface = SmartAlarmSurfaceDark,
    onSurface = SmartAlarmOnSurfaceDark,
    onSurfaceVariant = SmartAlarmOnSurfaceVariantDark
)

/**
 * App-wide Material3 theme. Supports Android 12+ dynamic color (wallpaper-derived palette)
 * with a static SmartAlarm brand palette as the fallback for older devices, matching
 * minSdk 26 support.
 */
@Composable
fun SmartAlarmTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColors
        else -> LightColors
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
