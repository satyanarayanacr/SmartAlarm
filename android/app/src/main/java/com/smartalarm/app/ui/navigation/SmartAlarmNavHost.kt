package com.smartalarm.app.ui.navigation

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.smartalarm.app.ServiceLocator
import com.smartalarm.app.domain.model.Alarm
import com.smartalarm.app.ui.alarms.AlarmEditScreen
import com.smartalarm.app.ui.alarms.AlarmListScreen
import com.smartalarm.app.ui.alarms.AlarmListViewModel

private const val ROUTE_LIST = "alarms"
private const val ROUTE_EDIT = "alarm_edit/{alarmId}"
private const val NEW_ALARM_ID = -1L

/**
 * Root navigation host. [isWideLayout] (computed once in MainActivity from the window width)
 * decides the *arrangement* only: compact width navigates between full-screen list/edit
 * destinations as normal, expanded width shows both side by side using the same two composables
 * and the same NavController-driven state - one Compose codebase for both phone and tablet, per
 * the Phase 1 spec.
 */
@Composable
fun SmartAlarmNavHost(locator: ServiceLocator, isWideLayout: Boolean) {
    val navController = rememberNavController()
    val viewModel: AlarmListViewModel = viewModel(factory = AlarmListViewModel.Factory(locator))
    val uiState by viewModel.uiState.collectAsState()

    if (isWideLayout) {
        var selectedAlarm by remember { mutableStateOf<Alarm?>(null) }
        var showEditor by remember { mutableStateOf(false) }

        // NOTE: uses Modifier.fillMaxWidth(fraction) instead of RowScope.weight() to split the
        // two panes. weight() is the more idiomatic Compose API for this and was used originally,
        // but androidx.compose.foundation.layout.weight (Compose UI 1.12.0 / BOM 2026.08.00) fails
        // every real compile in this project with "Cannot access 'val RowColumnParentData?.weight:
        // Float': it is internal in file" - reproduced identically across Kotlin 2.3.20, 2.4.10,
        // and 2.4.20-RC2, with a clean single-version dependency graph (verified via
        // :app:dependencies) and after a full --no-build-cache --rerun-tasks cache bypass, so this
        // is a real Kotlin-compiler/Compose-UI-1.12.0 binary incompatibility specific to that one
        // declaration, not a version, cache, or classpath problem. fillMaxWidth(fraction) achieves
        // the identical 50/50 (or 100/0 when the editor pane is hidden) split for this fixed
        // two-pane layout without touching the affected API: a Row measures each non-weighted
        // child against its own full width constraint and places children sequentially, so two
        // children each fillMaxWidth(0.5f) tile left-half/right-half with no overlap, exactly like
        // two weight(1f) children would have.
        Row(modifier = Modifier.fillMaxSize()) {
            AlarmListScreen(
                alarms = uiState.alarms,
                occurrences = uiState.occurrences,
                onAddAlarm = { selectedAlarm = null; showEditor = true },
                onEditAlarm = { selectedAlarm = it; showEditor = true },
                onToggleAlarm = viewModel::toggleEnabled,
                onDeleteAlarm = { viewModel.delete(it); if (selectedAlarm?.id == it.id) showEditor = false },
                modifier = Modifier.fillMaxWidth(if (showEditor) 0.5f else 1f),
            )
            if (showEditor) {
                AlarmEditScreen(
                    alarmToEdit = selectedAlarm,
                    onSave = { viewModel.save(it); showEditor = false },
                    onDelete = { viewModel.delete(it); showEditor = false },
                    onCancel = { showEditor = false },
                    modifier = Modifier.fillMaxWidth(0.5f),
                )
            }
        }
        return
    }

    NavHost(navController = navController, startDestination = ROUTE_LIST) {
        composable(ROUTE_LIST) {
            AlarmListScreen(
                alarms = uiState.alarms,
                occurrences = uiState.occurrences,
                onAddAlarm = { navController.navigate("alarm_edit/$NEW_ALARM_ID") },
                onEditAlarm = { navController.navigate("alarm_edit/${it.id}") },
                onToggleAlarm = viewModel::toggleEnabled,
                onDeleteAlarm = { viewModel.delete(it) },
            )
        }
        composable(
            route = ROUTE_EDIT,
            arguments = listOf(navArgument("alarmId") { type = NavType.LongType }),
        ) { backStackEntry ->
            val alarmId = backStackEntry.arguments?.getLong("alarmId") ?: NEW_ALARM_ID
            val alarmToEdit = uiState.alarms.find { it.id == alarmId }
            AlarmEditScreen(
                alarmToEdit = if (alarmId == NEW_ALARM_ID) null else alarmToEdit,
                onSave = { viewModel.save(it); navController.popBackStack() },
                onDelete = { viewModel.delete(it); navController.popBackStack() },
                onCancel = { navController.popBackStack() },
            )
        }
    }
}
