package com.digitalocean.ocean

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceComposable
import androidx.glance.GlanceTheme
import androidx.glance.material3.ColorProviders
import androidx.glance.unit.ColorProvider
import com.digitalocean.ocean.R

@Composable
private fun oceanLightColorPalette() = lightColorScheme(
    background = colorResource(R.color.bgApp),
    onSurface = colorResource(R.color.neutral000),
    onSurfaceVariant = androidx.compose.ui.graphics.Color(0xFFABB5BF),
    surfaceVariant = androidx.compose.ui.graphics.Color(0xFF1E242C),
    primary = colorResource(R.color.teal300),
    error = colorResource(R.color.red500),
    outline = colorResource(R.color.gold400)
)

@Composable
private fun oceanDarkColorPalette() = darkColorScheme(
    background = colorResource(R.color.bgApp),
    onSurface = colorResource(R.color.neutral000),
    onSurfaceVariant = androidx.compose.ui.graphics.Color(0xFFABB5BF),
    surfaceVariant = androidx.compose.ui.graphics.Color(0xFF1E242C),
    primary = colorResource(R.color.teal300),
    error = colorResource(R.color.red500),
    outline = colorResource(R.color.gold400)
)

// Glance-compatible color palette using ColorProvider (direct color values)
// Using default GlanceTheme colors - widgets will use GlanceTheme.colors directly
// Colors are defined inline in widgets where needed

@Composable
private fun oceanTypography() = Typography(
    titleLarge = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        color = colorResource(R.color.neutral000)
    ),
    bodyLarge = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 20.sp,
        color = colorResource(R.color.neutral000)
    ),
    bodyMedium = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        color = colorResource(R.color.neutral000)
    )
)

@Composable
fun OceanMaterialTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) oceanDarkColorPalette() else oceanLightColorPalette()

    MaterialTheme(
        colorScheme = colors,
        typography = oceanTypography(),
        content = content
    )
}

@Composable
@GlanceComposable
fun OceanGlanceTheme(
    content: @Composable () -> Unit
) {
    // Use default GlanceTheme - widgets handle colors directly via ColorProvider
    GlanceTheme(
        content = content
    )
}


