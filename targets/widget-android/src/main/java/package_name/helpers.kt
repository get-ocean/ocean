package com.digitalocean.mobile

import android.content.Context
import java.text.NumberFormat
import java.util.Locale
import kotlin.math.abs

fun formatCompactCount(value: Int): String {
    val absValue = abs(value)
    val sign = if (value < 0) "-" else ""

    val formatter = NumberFormat.getNumberInstance(Locale.US).apply {
        minimumFractionDigits = 0
        maximumFractionDigits = 1
        isGroupingUsed = false
    }

    val (scaled, suffix) = when {
        absValue >= 1_000_000_000 -> Pair(absValue / 1_000_000_000.0, "B")
        absValue >= 1_000_000 -> Pair(absValue / 1_000_000.0, "M")
        absValue >= 1_000 -> Pair(absValue / 1_000.0, "K")
        else -> return value.toString()
    }

    val numberString = formatter.format(scaled)
    return "$sign$numberString$suffix"
}

/**
 * Generate deep link to the app
 */
fun getAppDeepLink(context: Context, connectionId: String?, path: String): String {
    if (connectionId == null) {
        return "ocean://"
    }

    val prefs = context.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
    val isSubscribed = prefs.getBoolean(IS_SUBSCRIBED_KEY, false)

    return if (isSubscribed) {
        val separator = if (path.contains("?")) "&" else "?"
        "ocean://$path${separator}_widgetConnectionId=$connectionId"
    } else {
        "ocean://?showPaywall=1"
    }
}

fun getTimestampHoursAgo(hours: Int): Long {
    return System.currentTimeMillis() - (hours * 60 * 60 * 1000L)
}


