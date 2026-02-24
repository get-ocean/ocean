package com.digitalocean.ocean

import android.content.Context
import android.content.Intent
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
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

class MediumDropletStatsWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MediumDropletStatsWidget()

    companion object {
        // SharedPreferences (mirrors iOS app group + keys)
        private const val APP_GROUP_NAME = "group.com.digitalocean.ocean"
        private const val IS_SUBSCRIBED_KEY = "isSubscribed"

        // Glance preferences keys
        val selectedDropletKey = stringPreferencesKey("selectedDroplet")
        val selectedProjectKey = stringPreferencesKey("selectedProject")
        val isSubscribedValueKey = booleanPreferencesKey("isSubscribed")
        val cpuKey = intPreferencesKey("cpuPercent")
        val memoryKey = intPreferencesKey("memoryPercent")
        val diskKey = intPreferencesKey("diskPercent")
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == "android.appwidget.action.APPWIDGET_UPDATE") {
            CoroutineScope(Dispatchers.IO).launch {
                val sharedPrefs = context.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
                val glanceIds = GlanceAppWidgetManager(context).getGlanceIds(MediumDropletStatsWidget::class.java)

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

    fun onDropletSelected(context: Context, glanceId: GlanceId, dropletJson: String?, isSubscribed: Boolean) {
        if (dropletJson == null) {
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            updateAppWidgetState(
                context = context,
                definition = PreferencesGlanceStateDefinition,
                glanceId = glanceId
            ) { prefs ->
                prefs.toMutablePreferences().apply {
                    this[selectedDropletKey] = dropletJson
                    this[isSubscribedValueKey] = isSubscribed
                }
            }

            glanceAppWidget.update(context, glanceId)
        }
    }

    fun updateNowStats(
        context: Context,
        glanceId: GlanceId,
        cpuPercent: Int?,
        memoryPercent: Int?,
        diskPercent: Int?
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            updateAppWidgetState(
                context = context,
                definition = PreferencesGlanceStateDefinition,
                glanceId = glanceId
            ) { prefs ->
                prefs.toMutablePreferences().apply {
                    cpuPercent?.let { this[cpuKey] = it }
                    memoryPercent?.let { this[memoryKey] = it }
                    diskPercent?.let { this[diskKey] = it }
                }
            }

            glanceAppWidget.update(context, glanceId)
        }
    }
}


