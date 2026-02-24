package com.digitalocean.ocean

import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

private const val TAG = "OceanWidgetFetcher"

enum class HTTPMethod(val value: String) {
    GET("GET"),
    POST("POST"),
    PUT("PUT"),
    PATCH("PATCH"),
    DELETE("DELETE")
}

data class FetchParams(
    val method: HTTPMethod,
    val url: String,
    val connection: Connection,
    val body: String? = null,
    val baseUrl: String? = null
)

suspend fun fetch(params: FetchParams): ByteArray = withContext(Dispatchers.IO) {
    val isPOSTRequest = params.body != null && params.method == HTTPMethod.POST

    if (!params.url.startsWith("/")) {
        Log.e(TAG, "InvalidUrl: URL should start with / — provided=${params.url}")
        throw Exception("URL should start with /")
    }

    val fullUrlString = params.baseUrl?.let { "$it${params.url}" }
        ?: "https://api.digitalocean.com${params.url}"

    Log.d(TAG, "Constructed full URL: $fullUrlString")

    val url = URL(fullUrlString)
    val conn = (url.openConnection() as HttpURLConnection).apply {
        requestMethod = params.method.value
        setRequestProperty("Accept", "application/json")
        setRequestProperty("Authorization", "Bearer ${params.connection.apiToken ?: ""}")
        connectTimeout = 15000
        readTimeout = 20000
    }

    try {
        if (isPOSTRequest) {
            conn.doOutput = true
            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(params.body)
                writer.flush()
            }
        }

        conn.connect()
        val responseCode = conn.responseCode
        Log.d(TAG, "HTTP status=$responseCode")

        if (responseCode !in 200..299) {
            val errorMsg = conn.errorStream?.bufferedReader()?.use { it.readText() }
                ?: "HTTP Error: $responseCode"
            Log.e(TAG, "HTTP error: $errorMsg")
            throw Exception("HTTP Error: $responseCode. $errorMsg")
        }

        conn.inputStream.use { input ->
            val buffer = ByteArrayOutputStream()
            val data = ByteArray(1024)
            var nRead: Int
            while (input.read(data, 0, data.size).also { nRead = it } != -1) {
                buffer.write(data, 0, nRead)
            }
            buffer.toByteArray()
        }
    } finally {
        conn.disconnect()
    }
}

suspend inline fun <reified T> httpRequest(params: FetchParams): T {
    val data = fetch(params)
    val json = String(data, Charsets.UTF_8)
    val type = object : TypeToken<T>() {}.type
    return Gson().fromJson(json, type)
}


