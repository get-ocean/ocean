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
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.currentState
import androidx.datastore.preferences.core.Preferences
import androidx.glance.unit.ColorProvider
import androidx.glance.Image
import androidx.glance.ImageProvider
import com.digitalocean.mobile.R
import com.google.gson.Gson

class MediumDropletBandwidthWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        try {
            provideContent {
                MediumDropletBandwidthContent()
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
fun MediumDropletBandwidthContent() {
    val state = currentState<Preferences>()
    val isSubscribed = state[MediumDropletBandwidthWidgetReceiver.isSubscribedValueKey] ?: false
    val rawDroplet = state[MediumDropletBandwidthWidgetReceiver.selectedDropletKey]
    val droplet = try {
        if (rawDroplet != null && rawDroplet.isNotEmpty()) {
            Gson().fromJson(rawDroplet, DropletListItem::class.java)
        } else null
    } catch (e: Exception) { null }
    val dropletName = droplet?.name ?: ""

    val inPub = state[MediumDropletBandwidthWidgetReceiver.inboundPublicKey]
    val outPub = state[MediumDropletBandwidthWidgetReceiver.outboundPublicKey]
    val inPriv = state[MediumDropletBandwidthWidgetReceiver.inboundPrivateKey]
    val outPriv = state[MediumDropletBandwidthWidgetReceiver.outboundPrivateKey]

    val context = LocalContext.current
    val deepLink = if (droplet != null) {
        val base = "ocean://droplets/${droplet.id}/home"
        if (droplet.connectionId.isNotEmpty()) {
            "$base?_widgetConnectionId=${droplet.connectionId}"
        } else {
            base
        }
    } else {
        "ocean://"
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
                Spacer(modifier = GlanceModifier.height(6.dp))
                Row(
                    modifier = GlanceModifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Blue public In
                    BandColWithIcon("In", inPub, R.drawable.arrow_down_blue, Color(0xFF3B82F6))
                    Spacer(modifier = GlanceModifier.width(20.dp))
                    // Blue public Out
                    BandColWithIcon("Out", outPub, R.drawable.arrow_up_blue, Color(0xFF3B82F6))
                    Spacer(modifier = GlanceModifier.width(20.dp))
                    // Green private In
                    BandColWithIcon("In", inPriv, R.drawable.arrow_down_teal, Color(0xFF21C171))
                    Spacer(modifier = GlanceModifier.width(20.dp))
                    // Green private Out
                    BandColWithIcon("Out", outPriv, R.drawable.arrow_up_teal, Color(0xFF21C171))
                }
            }
        }
    }

@Composable
private fun BandColWithIcon(label: String, valueBytes: Int?, iconRes: Int, colorValue: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        // Icon with arrow
        Image(
            provider = ImageProvider(iconRes),
            contentDescription = label,
            modifier = GlanceModifier.width(16.dp).height(16.dp)
        )
        Spacer(modifier = GlanceModifier.height(4.dp))
        Text(
            text = formatBytes(valueBytes),
            style = TextStyle(
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = ColorProvider(Color(0xFFFFFFFF)),
                textAlign = TextAlign.Center
            )
        )
        Spacer(modifier = GlanceModifier.height(2.dp))
        Text(
            text = label,
            style = TextStyle(
                fontSize = 12.sp,
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

private fun buildDeepLink(context: Context, dropletId: String?): String {
    if (dropletId.isNullOrEmpty()) return "ocean://"
    val prefs = context.getSharedPreferences("group.com.digitalocean.mobile", Context.MODE_PRIVATE)
    val isSubscribed = prefs.getBoolean("isSubscribed", false)
    return if (isSubscribed) "ocean://droplets/$dropletId/home" else "ocean://?showPaywall=1"
}

private fun formatBytes(bytes: Int?): String {
    if (bytes == null || bytes <= 0) return "—"
    val units = arrayOf("B", "KB", "MB", "GB", "TB", "PB")
    var v = bytes.toDouble()
    var i = 0
    while (v >= 1024 && i < units.lastIndex) {
        v /= 1024
        i++
    }
    val display = if (v >= 100 || v % 1.0 == 0.0) String.format("%.0f", v) else String.format("%.1f", v)
    return "$display${units[i]}"
}


