package com.digitalocean.ocean

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.size
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.currentState
import androidx.datastore.preferences.core.Preferences
import androidx.glance.unit.ColorProvider
import com.digitalocean.ocean.R
import com.google.gson.Gson

class SmallShortcutWidget : GlanceAppWidget() {
    
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        try {
            provideContent {
                OceanGlanceTheme {
                    SmallShortcutContent()
                }
            }
        } catch (e: Exception) {
            // Fallback to minimal content if anything fails
            provideContent {
                Box(
                    modifier = GlanceModifier
                        .fillMaxSize()
                        .background(ColorProvider(Color(0xFF101012)))
                        .padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Widget Error",
                        style = TextStyle(
                            color = ColorProvider(Color(0xFFFFFFFF)),
                            fontSize = 14.sp
                        )
                    )
                }
            }
        }
    }
}

@Composable
fun SmallShortcutContent() {
    val state = currentState<Preferences>()
    val rawDroplet = state[SmallShortcutWidgetReceiver.selectedDropletKey]
    val isSubscribed = state[SmallShortcutWidgetReceiver.isSubscribedValueKey] ?: false
    val droplet = try {
        if (rawDroplet != null && rawDroplet.isNotEmpty()) {
            Gson().fromJson(rawDroplet, DropletListItem::class.java)
        } else {
            null
        }
    } catch (e: Exception) {
        null
    }
    
    val context = LocalContext.current
    val deepLink = if (droplet != null) {
        getAppDeepLink(context, droplet.connectionId, "droplets/${droplet.id}/home")
    } else {
        getAppDeepLink(context, null, "")
    }
    
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(Color(0xFF101012)))
            .padding(12.dp)
            .clickable {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink))
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
            },
        contentAlignment = Alignment.Center
    ) {
        if (!isSubscribed) {
            SubscriptionRequiredView()
        } else {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = GlanceModifier.fillMaxSize()
            ) {
                // App Icon
                Image(
                    provider = ImageProvider(R.drawable.app_icon_widget),
                    contentDescription = "App Icon",
                    modifier = GlanceModifier.size(50.dp)
                )
                
                Spacer(modifier = GlanceModifier.height(6.dp))
                
                // Droplet Name or Placeholder
                if (droplet != null) {
                    Text(
                        text = droplet.name,
                        style = TextStyle(
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = ColorProvider(Color(0xFFFFFFFF)),
                            textAlign = TextAlign.Center
                        ),
                        maxLines = 2
                    )
                } else {
                    // Placeholder loading state
                    Box(
                        modifier = GlanceModifier
                            .size(120.dp, 10.dp)
                            .background(ColorProvider(Color(0xFF1E242C)))
                    ) { }
                }
            }
        }
    }
}

