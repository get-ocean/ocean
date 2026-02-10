package com.digitalocean.mobile

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.systemBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.state.PreferencesGlanceStateDefinition
import com.google.gson.Gson
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class LargeProjectDropletsConfigurationActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            setResult(RESULT_CANCELED)

            val appWidgetId = intent?.extras?.getInt(
                AppWidgetManager.EXTRA_APPWIDGET_ID,
                AppWidgetManager.INVALID_APPWIDGET_ID
            ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

            if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
                Log.e("LargeProjectConfig", "Invalid appWidgetId")
                finish()
                return
            }

            setContent {
                var connections by remember { mutableStateOf<List<Connection>>(emptyList()) }
                var projects by remember { mutableStateOf<List<ProjectListItem>>(emptyList()) }
                var isLoading by remember { mutableStateOf(true) }
                var error by remember { mutableStateOf<String?>(null) }

                LaunchedEffect(Unit) {
                    val APP_GROUP_NAME = "group.com.digitalocean.mobile"
                    val CONNECTIONS_KEY = "connections"

                    // First, try to read connections immediately
                    try {
                        val prefs = applicationContext.getSharedPreferences(APP_GROUP_NAME, Context.MODE_PRIVATE)
                        val rawConnections = prefs.getString(CONNECTIONS_KEY, "[]") ?: "[]"
                        val parsed = try {
                            if (rawConnections.isNotEmpty() && rawConnections != "[]") {
                                Gson().fromJson(rawConnections, Array<Connection>::class.java)?.filter {
                                    it.id != null && it.apiToken != null
                                } ?: emptyList()
                            } else emptyList()
                        } catch (_: Exception) { emptyList() }
                        if (parsed.isNotEmpty()) {
                            connections = parsed
                        }
                    } catch (_: Exception) {}

                    // Fetch projects from all connections
                    try {
                        val allProjects = mutableListOf<ProjectListItem>()
                        for (connection in connections) {
                            if (connection.id == null || connection.apiToken == null) continue
                            try {
                                val connectionProjects = withContext(Dispatchers.IO) {
                                    fetchConnectionProjects(connection)
                                }
                                allProjects.addAll(connectionProjects.map { 
                                    ProjectListItem(id = it.id, name = it.name, connectionId = connection.id) 
                                })
                            } catch (e: Exception) {
                                Log.e("LargeProjectConfig", "Error fetching projects: ${e.message}", e)
                            }
                        }
                        projects = allProjects
                        isLoading = false
                    } catch (e: Exception) {
                        Log.e("LargeProjectConfig", "Error: ${e.message}", e)
                        error = e.message
                        isLoading = false
                    }
                }

                MaterialTheme {
                    Surface(
                        modifier = Modifier
                            .fillMaxSize()
                            .windowInsetsPadding(WindowInsets.systemBars),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        ProjectConfigurationScreen(
                            projects = projects,
                            isLoading = isLoading,
                            error = error,
                            onProjectSelected = { project ->
                                val glanceId = GlanceAppWidgetManager(applicationContext).getGlanceIdBy(appWidgetId)
                                CoroutineScope(Dispatchers.IO).launch {
                                    // Store project
                                    updateAppWidgetState(
                                        context = applicationContext,
                                        definition = PreferencesGlanceStateDefinition,
                                        glanceId = glanceId
                                    ) { prefs ->
                                        prefs.toMutablePreferences().apply {
                                            this[stringPreferencesKey("selectedProject")] = Gson().toJson(project)
                                        }
                                    }
                                    
                                    // Fetch droplets from project
                                    try {
                                        val sharedPrefs = applicationContext.getSharedPreferences("group.com.digitalocean.mobile", Context.MODE_PRIVATE)
                                        val connectionsJson = sharedPrefs.getString("connections", "[]") ?: "[]"
                                        val connections = try {
                                            Gson().fromJson(connectionsJson, Array<Connection>::class.java)?.filter {
                                                it.id != null && it.apiToken != null
                                            } ?: emptyList()
                                        } catch (_: Exception) { emptyList() }
                                        
                                        if (connections.isNotEmpty()) {
                                            val connection = connections.first()
                                            
                                            // Get project resources to find droplets
                                            val resources = withContext(Dispatchers.IO) {
                                                fetchProjectResources(connection, project.id)
                                            }
                                            val dropletUrns = resources.filter { it.urn.startsWith("do:droplet:") }
                                            
                                            // Extract droplet IDs from URNs
                                            val dropletIds = dropletUrns.map { it.urn.removePrefix("do:droplet:") }
                                            
                                            // Fetch droplets and their stats
                                            val dropletRows = mutableListOf<String>()
                                            
                                            for (dropletId in dropletIds) {
                                                try {
                                                    val droplet = withContext(Dispatchers.IO) {
                                                        fetchDroplet(connection, dropletId)
                                                    }
                                                    val stats = withContext(Dispatchers.IO) {
                                                        fetchDropletStats(connection, dropletId)
                                                    }
                                                    val row = "${droplet.id}:${droplet.name}:${stats?.cpu ?: ""}:${stats?.memory ?: ""}:${stats?.disk ?: ""}:${connection.id}"
                                                    dropletRows.add(row)
                                                } catch (e: Exception) {
                                                    Log.e("LargeProjectConfig", "Error fetching droplet $dropletId: ${e.message}", e)
                                                }
                                            }
                                            
                                            // Store droplet rows
                                            val serialized = dropletRows.joinToString("|")
                                            LargeProjectDropletsWidgetReceiver().updateDropletRows(applicationContext, glanceId, serialized)
                                        }
                                    } catch (e: Exception) {
                                        Log.e("LargeProjectConfig", "Error fetching droplets: ${e.message}", e)
                                    }
                                }
                                val resultValue = Intent().apply {
                                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                                }
                                setResult(RESULT_OK, resultValue)
                                
                                val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
                                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
                                }
                                sendBroadcast(intent)
                                
                                finish()
                            },
                            onCancel = { finish() }
                        )
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("LargeProjectConfig", "Error in onCreate: ${e.message}", e)
            e.printStackTrace()
            finish()
        }
    }
}

@Composable
private fun ProjectConfigurationScreen(
    projects: List<ProjectListItem>,
    isLoading: Boolean,
    error: String?,
    onProjectSelected: (ProjectListItem) -> Unit,
    onCancel: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Configure Project Droplets",
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Select a project to display droplets",
            fontSize = 14.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(24.dp))

        when {
            isLoading -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }
            error != null -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "Error", color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = error, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = onCancel) { Text("Cancel") }
                    }
                }
            }
            projects.isEmpty() -> {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "No projects found", color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = "Please add a connection in the app first", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = onCancel) { Text("Cancel") }
                    }
                }
            }
            else -> {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(projects) { project ->
                        ProjectListItemView(project = project, onClick = { onProjectSelected(project) })
                    }
                }
            }
        }
    }
}

@Composable
private fun ProjectListItemView(project: ProjectListItem, onClick: () -> Unit) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        color = MaterialTheme.colorScheme.surfaceVariant,
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = project.name, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            }
        }
    }
}


