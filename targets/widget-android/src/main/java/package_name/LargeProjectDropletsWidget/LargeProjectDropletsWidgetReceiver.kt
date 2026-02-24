package com.digitalocean.ocean

import android.content.Context
import android.content.Intent
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.state.PreferencesGlanceStateDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class LargeProjectDropletsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = LargeProjectDropletsWidget()

    companion object {
        private const val APP_GROUP_NAME = "group.com.digitalocean.ocean"
        private const val IS_SUBSCRIBED_KEY = "isSubscribed"

        val selectedProjectKey = stringPreferencesKey("selectedProject")
        val isSubscribedValueKey = booleanPreferencesKey("isSubscribed")
        // Simple serialized droplet rows (e.g., "id:name:cpu:mem:disk|id:name:cpu:mem:disk|...")
        val dropletRowsKey = stringPreferencesKey("dropletRows")
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        if (intent.action == "android.appwidget.action.APPWIDGET_UPDATE") {
            CoroutineScope(Dispatchers.IO).launch {
                val sharedPrefs = context.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
                val glanceIds = GlanceAppWidgetManager(context).getGlanceIds(LargeProjectDropletsWidget::class.java)
                glanceIds.forEach { glanceId ->
                    updateAppWidgetState(
                        context = context,
                        definition = PreferencesGlanceStateDefinition,
                        glanceId = glanceId
                    ) { prefs ->
                        prefs.toMutablePreferences().apply {
                            this[isSubscribedValueKey] = sharedPrefs.getBoolean(IS_SUBSCRIBED_KEY, false)
                        }
                    }
                    glanceAppWidget.update(context, glanceId)
                }
            }
        }
    }

    fun onProjectSelected(context: Context, glanceId: GlanceId, projectJson: String?, isSubscribed: Boolean) {
        if (projectJson == null) return
        CoroutineScope(Dispatchers.IO).launch {
            updateAppWidgetState(
                context = context,
                definition = PreferencesGlanceStateDefinition,
                glanceId = glanceId
            ) { prefs ->
                prefs.toMutablePreferences().apply {
                    this[selectedProjectKey] = projectJson
                    this[isSubscribedValueKey] = isSubscribed
                }
            }
            glanceAppWidget.update(context, glanceId)
        }
    }

    fun updateDropletRows(context: Context, glanceId: GlanceId, serializedRows: String) {
        CoroutineScope(Dispatchers.IO).launch {
            updateAppWidgetState(
                context = context,
                definition = PreferencesGlanceStateDefinition,
                glanceId = glanceId
            ) { prefs ->
                prefs.toMutablePreferences().apply {
                    this[dropletRowsKey] = serializedRows
                }
            }
            glanceAppWidget.update(context, glanceId)
        }
    }
}


