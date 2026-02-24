package com.digitalocean.ocean

import com.google.gson.annotations.SerializedName

// App Group Configuration
const val APP_GROUP_NAME = "group.com.digitalocean.ocean"
const val CONNECTIONS_KEY = "connections"
const val IS_SUBSCRIBED_KEY = "isSubscribed"
const val WIDGET_STATE_KEY = "ocean::widgetState"

// Connection Model - kept nullable to match JS bridge serialization
data class Connection(
    val id: String?,
    val apiToken: String?
)

// Widget Intent States (placeholder for future use)
enum class WidgetIntentState(val value: Int) {
    LOADING(0),
    API_FAILED(1),
    READY(2)
}

// Droplet Stats Models (now values)
data class DropletNowStats(
    val cpuPercent: Int?,
    val memoryPercent: Int?,
    val diskPercent: Int?
)

// Bandwidth totals (bytes)
data class DropletBandwidthTotals(
    val inboundPublic: Int?,
    val outboundPublic: Int?,
    val inboundPrivate: Int?,
    val outboundPrivate: Int?
)

// Simple list items used by configuration screens
data class DropletListItem(
    val id: String,
    val name: String,
    val connectionId: String
)

data class ProjectListItem(
    val id: String,
    val name: String,
    val connectionId: String
)

// Minimal Prometheus-like series for potential Android fetching
data class PrometheusSample(
    @SerializedName("0") val timestamp: Double? = null,
    @SerializedName("1") val value: String? = null
)

enum class RangeOption(val displayName: String) {
    DAY("24H"),
    WEEK("7D");

    fun toHours(): Int = when (this) {
        DAY -> 24
        WEEK -> 168
    }
}


