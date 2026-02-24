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
import androidx.glance.LocalContext
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.currentState
import androidx.datastore.preferences.core.Preferences
import androidx.glance.unit.ColorProvider
import androidx.glance.Image
import androidx.glance.ImageProvider
import com.digitalocean.ocean.R
import com.google.gson.Gson

class MediumDropletStatsWidget : GlanceAppWidget() {
    
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        try {
            provideContent {
                MediumDropletStatsContent()
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
fun MediumDropletStatsContent() {
    val state = currentState<Preferences>()
    val isSubscribed = state[MediumDropletStatsWidgetReceiver.isSubscribedValueKey] ?: false
    val rawDroplet = state[MediumDropletStatsWidgetReceiver.selectedDropletKey]
    val droplet = try {
        if (rawDroplet != null && rawDroplet.isNotEmpty()) {
            Gson().fromJson(rawDroplet, DropletListItem::class.java)
        } else null
    } catch (e: Exception) { null }
    val dropletName = droplet?.name ?: ""

    val cpu = state[MediumDropletStatsWidgetReceiver.cpuKey]
    val memory = state[MediumDropletStatsWidgetReceiver.memoryKey]
    val disk = state[MediumDropletStatsWidgetReceiver.diskKey]
    val cpuText = cpu?.let { "$it%" } ?: "—"
    val memoryText = memory?.let { "$it%" } ?: "—"
    val diskText = disk?.let { "$it%" } ?: "—"
    
    val context = LocalContext.current
    val deepLink = if (droplet != null) {
        getAppDeepLink(context, droplet.connectionId, "droplets/${droplet.id}/home")
    } else {
        getAppDeepLink(context, null, "")
    }

    Box(
        contentAlignment = Alignment.TopStart,
        modifier = GlanceModifier
            .background(ColorProvider(Color(0xFF101012)))
            .cornerRadius(8.dp)
            .padding(10.dp)
            .fillMaxSize()
            .clickable {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLink))
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(intent)
            }
    ) {
        if (!isSubscribed) {
            SubscriptionRequiredView()
        } else {
            Column {
                // App icon at top left
                Row(
                    modifier = GlanceModifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.Start,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(
                        provider = ImageProvider(R.drawable.app_icon_widget),
                        contentDescription = "App Icon",
                        modifier = GlanceModifier.width(20.dp).height(20.dp)
                    )
                    Spacer(modifier = GlanceModifier.width(8.dp))
                    if (dropletName.isNotEmpty()) {
                        Text(
                            text = dropletName,
                            style = TextStyle(
                                fontSize = 12.sp,
                                color = ColorProvider(Color(0xFFFFFFFF)),
                                fontWeight = FontWeight.Normal
                            )
                        )
                    }
                    Spacer(modifier = GlanceModifier.width(8.dp))
                }
                Spacer(modifier = GlanceModifier.height(10.dp))
                
                Row(
                    modifier = GlanceModifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    StatColumnWithIcon(label = "CPU", value = cpuText, iconRes = R.drawable.cpu_icon, colorValue = Color(0xFF21C171))
                    Spacer(modifier = GlanceModifier.width(36.dp))
                    StatColumnWithIcon(label = "Memory", value = memoryText, iconRes = R.drawable.memory_icon, colorValue = Color(0xFF9B80ED))
                    Spacer(modifier = GlanceModifier.width(36.dp))
                    StatColumnWithIcon(label = "Disk", value = diskText, iconRes = R.drawable.disk_icon, colorValue = Color(0xFF3B82F6))
                }
            }
        }
    }
}

@Composable
private fun StatColumnWithIcon(label: String, value: String, iconRes: Int, colorValue: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        // Icon
        Image(
            provider = ImageProvider(iconRes),
            contentDescription = label,
            modifier = GlanceModifier.width(20.dp).height(20.dp)
        )
        Spacer(modifier = GlanceModifier.height(4.dp))
        Text(
            text = value,
            style = TextStyle(
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = ColorProvider(Color(0xFFFFFFFF)),
                textAlign = TextAlign.Center
            )
        )
        Spacer(modifier = GlanceModifier.height(2.dp))
        Text(
            text = label,
            style = TextStyle(
                fontSize = 14.sp,
                color = ColorProvider(colorValue),
                textAlign = TextAlign.Center
            )
        )
    }
}

private fun extractDropletName(dropletJson: String?): String? {
    if (dropletJson.isNullOrEmpty()) return null
    val nameKey = "\"name\":\""
    val idx = dropletJson.indexOf(nameKey)
    if (idx == -1) return null
    val start = idx + nameKey.length
    val end = dropletJson.indexOf('"', start)
    if (end <= start) return null
    return dropletJson.substring(start, end)
}

