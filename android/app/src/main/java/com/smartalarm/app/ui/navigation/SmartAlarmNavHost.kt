package com.smartalarm.app.ui.navigation

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.smartalarm.app.ui.confirmation.ConfirmationReviewScreen
import com.smartalarm.app.ui.confirmation.ConfirmationSettingsScreen
import com.smartalarm.app.ui.confirmation.ConfirmationViewModel

private const val ROUTE_LIST = "alarms"
private const val ROUTE_EDIT = "alarm_edit/{alarmId}"
private const val ROUTE_SETTINGS = "confirmation_settings"
private const val ROUTE_REVIEW = "confirmation_review"
private const val NEW_ALARM_ID = -1L

/** What the wide-layout secondary pane currently shows, alongside the always-visible alarm list. */
private sealed interface SecondaryPane {
    data object None : SecondaryPane
    data class Editor(val alarm: Alarm?) : SecondaryPane
    data object Settings : SecondaryPane
    data object Review : SecondaryPane
}

/**
 * Root navigation host. [isWideLayout] (computed once in MainActivity from the window width)
 * decides the *arrangement* only: compact width navigates between full-screen destinations as
 * normal, expanded width shows the alarm list alongside a secondary pane using the same
 * composables and the same NavController-driven/state-driven data - one Compose codebase for both
 * phone and tablet, per the Phase 1 spec (and Phase 1.1's settings/review screens follow the same
 * rule).
 *
 * [reviewRequestId] increments every time MainActivity receives a "review tomorrow's alarms"
 * intent (the daily confirmation notification's REVIEW action or content tap) - observed here so
 * tapping that notification opens the review screen regardless of which screen was showing.
 */
@Composable
fun SmartAlarmNavHost(locator: ServiceLocator, isWideLayout: Boolean, reviewRequestId: Int = 0) {
    val navController = rememberNavController()
    val viewModel: AlarmListViewModel = viewModel(factory = AlarmListViewModel.Factory(locator))
    val uiState by viewModel.uiState.collectAsState()
    val confirmationViewModel: ConfirmationViewModel = viewModel(factory = ConfirmationViewModel.Factory(locator))
    val confirmationSettings by confirmationViewModel.settings.collectAsState()
    val reviewState by confirmationViewModel.reviewState.collectAsState()

    if (isWideLayout) {
        var selectedAlarm by remember { mutableStateOf<Alarm?>(null) }
        var secondaryPane by remember { mutableStateOf<SecondaryPane>(SecondaryPane.None) }

        LaunchedEffect(reviewRequestId) {
            if (reviewRequestId > 0) {
                confirmationViewModel.loadTomorrowsOccurrences()
                secondaryPane = SecondaryPane.Review
            }
        }

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
                onAddAlarm = { selectedAlarm = null; secondaryPane = SecondaryPane.Editor(null) },
                onEditAlarm = { selectedAlarm = it; secondaryPane = SecondaryPane.Editor(it) },
                onToggleAlarm = viewModel::toggleEnabled,
                onDeleteAlarm = {
                    viewModel.delete(it)
                    if (selectedAlarm?.id == it.id) secondaryPane = SecondaryPane.None
                },
                onOpenSettings = { secondaryPane = SecondaryPane.Settings },
                modifier = Modifier.fillMaxWidth(if (secondaryPane == SecondaryPane.None) 1f else 0.5f),
            )
            when (val pane = secondaryPane) {
                is SecondaryPane.Editor -> AlarmEditScreen(
                    alarmToEdit = pane.alarm,
                    onSave = { viewModel.save(it); secondaryPane = SecondaryPane.None },
                    onDelete = { viewModel.delete(it); secondaryPane = SecondaryPane.None },
                    onCancel = { secondaryPane = SecondaryPane.None },
                    modifier = Modifier.fillMaxWidth(0.5f),
                )
                SecondaryPane.Settings -> ConfirmationSettingsScreen(
                    settings = confirmationSettings,
                    onSettingsChanged = confirmationViewModel::updateSettings,
                    onBack = { secondaryPane = SecondaryPane.None },
                    modifier = Modifier.fillMaxWidth(0.5f),
                )
                SecondaryPane.Review -> ConfirmationReviewScreen(
                    isLoading = reviewState.isLoading,
                    confirmable = reviewState.confirmable,
                    onKeepAll = {
                        confirmationViewModel.keepSelected(reviewState.confirmable.map { it.occurrence.id }) {
                            secondaryPane = SecondaryPane.None
                        }
                    },
                    onSkipAll = {
                        confirmationViewModel.skipSelected(reviewState.confirmable.map { it.occurrence.id }) {
                            secondaryPane = SecondaryPane.None
                        }
                    },
                    onKeepSelected = { ids -> confirmationViewModel.keepSelected(ids) { secondaryPane = SecondaryPane.None } },
                    onSkipSelected = { ids -> confirmationViewModel.skipSelected(ids) { secondaryPane = SecondaryPane.None } },
                    onBack = { secondaryPane = SecondaryPane.None },
                    modifier = Modifier.fillMaxWidth(0.5f),
                )
                SecondaryPane.None -> Unit
            }
        }
        return
    }

    // Compact layout: tapping the confirmation notification navigates straight to the review
    // route, regardless of whatever screen was already on-screen/backstacked.
    LaunchedEffect(reviewRequestId) {
        if (reviewRequestId > 0) {
            confirmationViewModel.loadTomorrowsOccurrences()
            navController.navigate(ROUTE_REVIEW)
        }
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
                onOpenSettings = { navController.navigate(ROUTE_SETTINGS) },
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
        composable(ROUTE_SETTINGS) {
            ConfirmationSettingsScreen(
                settings = confirmationSettings,
                onSettingsChanged = confirmationViewModel::updateSettings,
                onBack = { navController.popBackStack() },
            )
        }
        composable(ROUTE_REVIEW) {
            ConfirmationReviewScreen(
                isLoading = reviewState.isLoading,
                confirmable = reviewState.confirmable,
                onKeepAll = {
                    confirmationViewModel.keepSelected(reviewState.confirmable.map { it.occurrence.id }) {
                        navController.popBackStack()
                    }
                },
                onSkipAll = {
                    confirmationViewModel.skipSelected(reviewState.confirmable.map { it.occurrence.id }) {
                        navController.popBackStack()
                    }
                },
                onKeepSelected = { ids -> confirmationViewModel.keepSelected(ids) { navController.popBackStack() } },
                onSkipSelected = { ids -> confirmationViewModel.skipSelected(ids) { navController.popBackStack() } },
                onBack = { navController.popBackStack() },
            )
        }
    }
}
