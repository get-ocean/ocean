package com.digitalocean.mobile

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
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SmallShortcutWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = SmallShortcutWidget()

    companion object {
        // SharedPreferences
        private const val APP_GROUP_NAME = "group.com.digitalocean.mobile"
        private const val IS_SUBSCRIBED_KEY = "isSubscribed"
        val selectedDropletKey = stringPreferencesKey("selectedDroplet")
        val isSubscribedValueKey = booleanPreferencesKey("isSubscribed")
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)
        
        if (intent.action == "android.appwidget.action.APPWIDGET_UPDATE" || 
            intent.action == "android.appwidget.action.APPWIDGET_ENABLED" ||
            intent.action == "android.appwidget.action.APPWIDGET_UPDATE_OPTIONS") {
            CoroutineScope(Dispatchers.IO).launch {
                val sharedPrefs = context.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
                val glanceIds = GlanceAppWidgetManager(context).getGlanceIds(SmallShortcutWidget::class.java)

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

    fun onDropletSelected(context: Context, glanceId: GlanceId, droplet: DropletListItem?, isSubscribed: Boolean) {
        if (droplet == null) {
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            updateAppWidgetState(
                context = context,
                definition = PreferencesGlanceStateDefinition,
                glanceId = glanceId
            ) { prefs ->
                prefs.toMutablePreferences().apply {
                    this[selectedDropletKey] = Gson().toJson(droplet)
                    this[isSubscribedValueKey] = isSubscribed
                }
            }

            glanceAppWidget.update(context, glanceId)
        }
    }
}

