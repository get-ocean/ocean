package com.digitalocean.mobile

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.appwidget.GlanceAppWidgetManager
import com.google.gson.Gson
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class SmallShortcutConfigurationActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        try {
            setResult(RESULT_CANCELED)
            
            val appWidgetId = intent?.extras?.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            ) ?: AppWidgetManager.INVALID_APPWIDGET_ID
            
            if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
                Log.e("SmallShortcutConfig", "Invalid appWidgetId")
                finish()
                return
            }
            
            setContent {
                var selectedDroplet by remember { mutableStateOf<DropletListItem?>(null) }
                var droplets by remember { mutableStateOf<List<DropletListItem>>(emptyList()) }
                var isLoading by remember { mutableStateOf(true) }
                var error by remember { mutableStateOf<String?>(null) }
                var connections by remember { mutableStateOf<List<Connection>>(emptyList()) }
                val scope = rememberCoroutineScope()
                
                LaunchedEffect(Unit) {
                    val APP_GROUP_NAME = "group.com.digitalocean.mobile"
                    val CONNECTIONS_KEY = "connections"
                    val IS_SUBSCRIBED_KEY = "isSubscribed"

                    // Try to read connections once
                    try {
                        val prefs = applicationContext.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
                        val rawConnections = prefs.getString(CONNECTIONS_KEY, "[]") ?: "[]"
                        
                        val parsedConnections = try {
                            if (rawConnections.isNotEmpty() && rawConnections != "[]") {
                                Gson().fromJson(rawConnections, Array<Connection>::class.java)?.filter { 
                                    it.id != null && it.apiToken != null 
                                } ?: emptyList()
                            } else {
                                emptyList()
                            }
                        } catch (e: Exception) {
                            emptyList()
                        }
                        
                        if (parsedConnections.isNotEmpty()) {
                            connections = parsedConnections
                        }
                    } catch (e: Exception) {
                        Log.e("SmallShortcutConfig", "Error reading connections: ${e.message}")
                    }
                    
                    if (connections.isEmpty()) {
                        Log.d("SmallShortcutConfig", "No connections found")
                        isLoading = false
                    } else {
                        scope.launch {
                            try {
                                droplets = fetchDropletsFromConnections(connections)
                                isLoading = false
                            } catch (e: Exception) {
                                Log.e("SmallShortcutConfig", "Error fetching droplets: ${e.message}", e)
                                error = e.message
                                isLoading = false
                            }
                        }
                    }
                }
                
                MaterialTheme {
                    Surface(
                        modifier = Modifier
                            .fillMaxSize()
                            .windowInsetsPadding(WindowInsets.systemBars),
                        color = Color(0xFF101012)
                    ) {
                        WidgetConfigurationScreen(
                        widgetTitle = "Droplet Shortcut",
                        widgetDescription = "Quickly open your droplet",
                        droplets = droplets,
                        isLoading = isLoading,
                        error = error,
                        isAuthorized = connections.isNotEmpty(),
                        debugConnections = connections.toList(),
                        onDropletSelected = { droplet ->
                            selectedDroplet = droplet
                            val prefs = applicationContext.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
                            val isSubscribed = prefs.getBoolean(IS_SUBSCRIBED_KEY, false)
                            val glanceId = GlanceAppWidgetManager(applicationContext).getGlanceIdBy(appWidgetId)
                            
                            SmallShortcutWidgetReceiver().onDropletSelected(
                                applicationContext,
                                glanceId,
                                DropletListItem(id = droplet.id, name = droplet.name, connectionId = droplet.connectionId),
                                isSubscribed
                            )
                            
                            val resultValue = Intent().apply {
                                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                            }
                            setResult(RESULT_OK, resultValue)
                            finish()
                        },
                        onCancel = { finish() }
                    )
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("SmallShortcutConfig", "Error in onCreate: ${e.message}", e)
            e.printStackTrace()
            finish()
        }
    }
}

private suspend fun fetchDropletsFromConnections(connections: List<Connection>): List<DropletListItem> {
    val allDroplets = mutableListOf<DropletListItem>()
    
    for (connection in connections) {
        if (connection.id == null || connection.apiToken == null) continue
        
        try {
            val projects = withContext(Dispatchers.IO) {
                fetchConnectionProjects(connection)
            }
            Log.d("SmallShortcutConfig", "Found ${projects.size} projects for connection")
            
            for (project in projects) {
                try {
                    val resources = withContext(Dispatchers.IO) {
                        fetchProjectResources(connection, project.id)
                    }
                    val dropletUrns = resources.filter { it.urn.startsWith("do:droplet:") }
                    Log.d("SmallShortcutConfig", "Found ${dropletUrns.size} droplets in project ${project.name}")
                    
                    for (urn in dropletUrns) {
                        val dropletId = urn.urn.removePrefix("do:droplet:")
                        try {
                            val droplet = withContext(Dispatchers.IO) {
                                fetchDroplet(connection, dropletId)
                            }
                            allDroplets.add(
                                DropletListItem(
                                    id = droplet.id,
                                    name = droplet.name
                                )
                            )
                        } catch (e: Exception) {
                            Log.e("SmallShortcutConfig", "Error fetching droplet $dropletId: ${e.message}", e)
                        }
                    }
                } catch (e: Exception) {
                    Log.e("SmallShortcutConfig", "Error fetching resources for project ${project.id}: ${e.message}", e)
                }
            }
        } catch (e: Exception) {
            Log.e("SmallShortcutConfig", "Error fetching for connection: ${e.message}", e)
        }
    }
    
    return allDroplets
}

@Composable
private fun WidgetConfigurationScreen(
    widgetTitle: String,
    widgetDescription: String,
    droplets: List<DropletListItem> = emptyList(),
    isLoading: Boolean = true,
    error: String? = null,
    isAuthorized: Boolean = false,
    debugConnections: List<Connection> = emptyList(),
    onDropletSelected: (DropletListItem) -> Unit,
    onCancel: () -> Unit
) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            Text(
                text = widgetTitle,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            Text(
                text = widgetDescription,
                fontSize = 14.sp,
                color = Color(0xFFE6ECF2)
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            when {
                !isAuthorized -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = "Unauthorized", color = Color(0xFFFE4E5C), fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = "Open the app to connect your account", color = Color(0xFFABB5BF), fontSize = 12.sp)
                        }
                    }
                }
                isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF14D8D4))
                    }
                }
                error != null -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = "Error", color = Color(0xFFFE4E5C), fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = error ?: "Unknown error", color = Color(0xFFABB5BF), fontSize = 12.sp)
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = onCancel) { Text("Cancel") }
                        }
                    }
                }
                droplets.isEmpty() -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(text = "No droplets found", color = Color.White, fontWeight = FontWeight.Bold)
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(text = "Please add a connection in the app first", color = Color(0xFFABB5BF), fontSize = 12.sp)
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = onCancel) { Text("Cancel") }
                        }
                    }
                }
                else -> {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(droplets) { droplet ->
                            DropletListItemView(site = droplet, onClick = { onDropletSelected(droplet) })
                        }
                    }
                }
            }
        }
}


