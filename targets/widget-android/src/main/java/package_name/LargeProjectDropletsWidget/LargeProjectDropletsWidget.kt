package com.digitalocean.mobile

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
import androidx.glance.text.TextStyle
import androidx.glance.currentState
import androidx.datastore.preferences.core.Preferences
import androidx.glance.unit.ColorProvider
import androidx.glance.Image
import androidx.glance.ImageProvider
import com.digitalocean.mobile.R

class LargeProjectDropletsWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        try {
            provideContent {
                LargeProjectDropletsContent()
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
fun LargeProjectDropletsContent() {
    val state = currentState<Preferences>()
    val isSubscribed = state[LargeProjectDropletsWidgetReceiver.isSubscribedValueKey] ?: false
    val projectJson = state[LargeProjectDropletsWidgetReceiver.selectedProjectKey]
    val dropletRowsJson = state[LargeProjectDropletsWidgetReceiver.dropletRowsKey] ?: ""
    
    val projectName = extractProjectName(projectJson) ?: ""
    val droplets = parseDropletRows(dropletRowsJson)
    
    val displayDroplets = droplets

    val context = LocalContext.current

    Box(
        modifier = GlanceModifier
            .background(ColorProvider(Color(0xFF101012)))
            .cornerRadius(12.dp)
            .padding(16.dp)
            .fillMaxSize()
    ) {
        Column {
            // App icon and project name
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
                Text(
                    text = projectName,
                    style = TextStyle(
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(Color(0xFFFFFFFF))
                    )
                )
            }
            Spacer(modifier = GlanceModifier.height(12.dp))
            // Droplet list
            displayDroplets.forEachIndexed { index, droplet ->
                DropletRowView(droplet = droplet, context = context)
                if (index != displayDroplets.lastIndex) {
                    Spacer(modifier = GlanceModifier.height(12.dp))
                }
            }
        }
    }
}

@Composable
private fun DropletRowView(droplet: DropletRow, context: Context) {
    Row(
        modifier = GlanceModifier.fillMaxWidth(),
        horizontalAlignment = Alignment.Start,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(
                text = droplet.name,
                style = TextStyle(
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Normal,
                    color = ColorProvider(Color(0xFFFFFFFF))
                )
            )
            Spacer(modifier = GlanceModifier.height(4.dp))
            Row {
                Text(
                    text = "CPU: ${droplet.cpu?.toString() ?: "-"}%",
                    style = TextStyle(
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(Color(0xFF3B82F6)) // Blue
                    )
                )
                Spacer(modifier = GlanceModifier.width(10.dp))
                Text(
                    text = "Mem: ${droplet.memory?.toString() ?: "-"}%",
                    style = TextStyle(
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(Color(0xFF21C171)) // Green
                    )
                )
                Spacer(modifier = GlanceModifier.width(10.dp))
                Text(
                    text = "Disk: ${droplet.disk?.toString() ?: "-"}%",
                    style = TextStyle(
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(Color(0xFF9B80ED)) // Purple
                    )
                )
            }
        }

        // putting in a box to cover the remaining width and OPEN btn in end
        Box(
            modifier = GlanceModifier.fillMaxWidth(),
            contentAlignment = Alignment.CenterEnd
        ) {
            Box(
                modifier = GlanceModifier
                    .background(ColorProvider(Color(0xFF3B82F6))) // Blue
                    .cornerRadius(16.dp)
                    .padding(horizontal = 12.dp, vertical = 6.dp)
                    .clickable {
                        val base = "ocean://droplets/${droplet.id}/home"
                        val deepLink = if (droplet.connectionId != null && droplet.connectionId.isNotEmpty()) {
                            "$base?_widgetConnectionId=${droplet.connectionId}"
                        } else {
                            base
                        }
                        val intent = Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse(deepLink)
                        )
                        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        context.startActivity(intent)
                    }
            ) {
                Text(
                    text = "OPEN",
                    style = TextStyle(
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(Color(0xFFFFFFFF))
                    )
                )
            }
        }
    }
}

data class DropletRow(
    val id: String,
    val name: String,
    val cpu: Int?,
    val memory: Int?,
    val disk: Int?,
    val connectionId: String?
)

private fun parseDropletRows(serialized: String): List<DropletRow> {
    if (serialized.isEmpty()) return emptyList()
    // Expect "id:name:cpu:mem:disk|id:name:cpu:mem:disk|..."
    return serialized.split("|").mapNotNull {
        val parts = it.split(":")
        if (parts.size >= 5) {
            DropletRow(
                id = parts[0],
                name = parts[1],
                cpu = parts[2].toIntOrNull(),
                memory = parts[3].toIntOrNull(),
                disk = parts[4].toIntOrNull(),
                connectionId = if (parts.size >= 6) parts[5] else null
            )
        } else null
    }
}

private fun parseRows(serialized: String): List<String> {
    if (serialized.isEmpty()) return emptyList()
    // Expect "id:name|id:name|..."
    return serialized.split("|").mapNotNull {
        val parts = it.split(":")
        if (parts.size >= 2) parts[1] else null
    }.take(6)
}

private fun extractProjectName(projectJson: String?): String? {
    // Keep simple to avoid adding JSON dependencies here; format expected like {"id":"...","name":"..."}
    if (projectJson.isNullOrEmpty()) return null
    val nameKey = "\"name\":\""
    val idx = projectJson.indexOf(nameKey)
    if (idx == -1) return null
    val start = idx + nameKey.length
    val end = projectJson.indexOf('"', start)
    if (end <= start) return null
    return projectJson.substring(start, end)
}

private fun buildDeepLinkProject(context: Context): String {
    val prefs = context.getSharedPreferences("group.com.digitalocean.mobile", Context.MODE_PRIVATE)
    val isSubscribed = prefs.getBoolean("isSubscribed", false)
    return if (isSubscribed) "ocean://" else "ocean://?showPaywall=1"
}


