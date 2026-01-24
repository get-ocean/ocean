package com.digitalocean.mobile

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

class MediumDropletBandwidthWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = MediumDropletBandwidthWidget()

    companion object {
        private const val APP_GROUP_NAME = "group.com.digitalocean.mobile"
        private const val IS_SUBSCRIBED_KEY = "isSubscribed"

        val selectedDropletKey = stringPreferencesKey("selectedDroplet")
        val selectedProjectKey = stringPreferencesKey("selectedProject")
        val isSubscribedValueKey = booleanPreferencesKey("isSubscribed")
        val inboundPublicKey = intPreferencesKey("inboundPublic")
        val outboundPublicKey = intPreferencesKey("outboundPublic")
        val inboundPrivateKey = intPreferencesKey("inboundPrivate")
        val outboundPrivateKey = intPreferencesKey("outboundPrivate")
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        if (intent.action == "android.appwidget.action.APPWIDGET_UPDATE") {
            CoroutineScope(Dispatchers.IO).launch {
                val sharedPrefs = context.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
                val glanceIds = GlanceAppWidgetManager(context).getGlanceIds(MediumDropletBandwidthWidget::class.java)

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
        if (dropletJson == null) return

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

    fun updateBandwidth(
        context: Context,
        glanceId: GlanceId,
        inPub: Int?, outPub: Int?, inPriv: Int?, outPriv: Int?
    ) {
        CoroutineScope(Dispatchers.IO).launch {
            updateAppWidgetState(
                context = context,
                definition = PreferencesGlanceStateDefinition,
                glanceId = glanceId
            ) { prefs ->
                prefs.toMutablePreferences().apply {
                    inPub?.let { this[inboundPublicKey] = it }
                    outPub?.let { this[outboundPublicKey] = it }
                    inPriv?.let { this[inboundPrivateKey] = it }
                    outPriv?.let { this[outboundPrivateKey] = it }
                }
            }
            glanceAppWidget.update(context, glanceId)
        }
    }
}


