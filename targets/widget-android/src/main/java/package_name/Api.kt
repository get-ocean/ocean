package com.digitalocean.mobile

/**
 * DigitalOcean API helpers for widgets
 */

/**
 * Fetch connection projects
 * GET /v2/projects
 */
suspend fun fetchConnectionProjects(connection: Connection): List<ProjectItem> {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/v2/projects",
        connection = connection
    )
    val resp: ProjectsResponse = httpRequest(params)
    return resp.projects ?: emptyList()
}

/**
 * Fetch project resources
 * GET /v2/projects/{projectId}/resources
 */
suspend fun fetchProjectResources(connection: Connection, projectId: String): List<ProjectResourceItem> {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/v2/projects/$projectId/resources",
        connection = connection
    )
    val resp: ProjectResourcesResponse = httpRequest(params)
    return resp.resources ?: emptyList()
}

/**
 * Fetch droplet details
 * GET /v2/droplets/{dropletId}
 */
suspend fun fetchDroplet(connection: Connection, dropletId: String): DropletDetails {
    val params = FetchParams(
        method = HTTPMethod.GET,
        url = "/v2/droplets/$dropletId",
        connection = connection
    )
    val resp: DropletResponse = httpRequest(params)
    return resp.droplet
}

// --- Minimal response types for the requests above ---

data class ProjectsResponse(
    val projects: List<ProjectItem>?
)

data class ProjectItem(
    val id: String,
    val name: String
)

data class ProjectResourcesResponse(
    val resources: List<ProjectResourceItem>?
)

data class ProjectResourceItem(
    val urn: String
)

data class DropletResponse(
    val droplet: DropletDetails
)

data class DropletDetails(
    val id: String,
    val name: String,
    val vcpus: Int?
)

/**
 * Fetch droplet stats (CPU, Memory, Disk)
 * GET /v2/monitoring/metrics/droplet/cpu
 * GET /v2/monitoring/metrics/droplet/memory_total
 * GET /v2/monitoring/metrics/droplet/memory_available
 * GET /v2/monitoring/metrics/droplet/filesystem_size
 * GET /v2/monitoring/metrics/droplet/filesystem_free
 */
suspend fun fetchDropletStats(connection: Connection, dropletId: String): DropletStats? {
    val now = System.currentTimeMillis() / 1000
    val start = now - (24 * 60 * 60) // 24 hours ago
    val startTimestamp = start.toString()
    val endTimestamp = now.toString()
    
    try {
        // Fetch droplet details for vcpus
        val dropletDetails = fetchDroplet(connection, dropletId)
        val vcpus = dropletDetails.vcpus ?: 1
        
        // Fetch CPU
        val cpuUrl = "/v2/monitoring/metrics/droplet/cpu?host_id=$dropletId&start=$startTimestamp&end=$endTimestamp"
        val cpuParams = FetchParams(
            method = HTTPMethod.GET,
            url = cpuUrl,
            connection = connection
        )
        val cpuResp: PrometheusResponse = httpRequest(cpuParams)
        val cpuPercent = computeCpuPercent(cpuResp, vcpus)
        
        // Fetch Memory
        val memTotalUrl = "/v2/monitoring/metrics/droplet/memory_total?host_id=$dropletId&start=$startTimestamp&end=$endTimestamp"
        val memAvailUrl = "/v2/monitoring/metrics/droplet/memory_available?host_id=$dropletId&start=$startTimestamp&end=$endTimestamp"
        val memTotalParams = FetchParams(method = HTTPMethod.GET, url = memTotalUrl, connection = connection)
        val memAvailParams = FetchParams(method = HTTPMethod.GET, url = memAvailUrl, connection = connection)
        val memTotalResp: PrometheusResponse = httpRequest(memTotalParams)
        val memAvailResp: PrometheusResponse = httpRequest(memAvailParams)
        val memoryPercent = computeMemoryPercent(memTotalResp, memAvailResp)
        
        // Fetch Disk
        val fsSizeUrl = "/v2/monitoring/metrics/droplet/filesystem_size?host_id=$dropletId&start=$startTimestamp&end=$endTimestamp"
        val fsFreeUrl = "/v2/monitoring/metrics/droplet/filesystem_free?host_id=$dropletId&start=$startTimestamp&end=$endTimestamp"
        val fsSizeParams = FetchParams(method = HTTPMethod.GET, url = fsSizeUrl, connection = connection)
        val fsFreeParams = FetchParams(method = HTTPMethod.GET, url = fsFreeUrl, connection = connection)
        val fsSizeResp: PrometheusResponse = httpRequest(fsSizeParams)
        val fsFreeResp: PrometheusResponse = httpRequest(fsFreeParams)
        val diskPercent = computeDiskPercent(fsSizeResp, fsFreeResp)
        
        return DropletStats(cpu = cpuPercent, memory = memoryPercent, disk = diskPercent)
    } catch (e: Exception) {
        return null
    }
}

private fun computeCpuPercent(response: PrometheusResponse, vcpus: Int): Int? {
    val values = response.data?.result?.getOrNull(0)?.values
    if (values.isNullOrEmpty()) return null
    
    // Get latest CPU value - the API returns CPU usage as a rate
    // We need to sum across all series and average, then divide by vcpus
    val allSeries = response.data?.result ?: emptyList()
    if (allSeries.isEmpty()) return null
    
    // Sum the latest values from all series (one per CPU core)
    var totalCpu = 0.0
    var count = 0
    for (series in allSeries) {
        val latest = series.values?.lastOrNull()?.getOrNull(1)?.toDoubleOrNull()
        if (latest != null) {
            totalCpu += latest
            count++
        }
    }
    
    if (count == 0) return null
    // Average across cores, then convert to percentage (assuming values are 0-1 range or 0-100)
    val avgCpu = totalCpu / count
    // If values are already percentages (0-100), divide by vcpus; if 0-1, multiply by 100
    val cpuPercent = if (avgCpu > 1.0) {
        (avgCpu / vcpus).toInt()
    } else {
        (avgCpu * 100 / vcpus).toInt()
    }
    return cpuPercent.coerceIn(0, 100)
}

private fun computeMemoryPercent(totalResp: PrometheusResponse, availResp: PrometheusResponse): Int? {
    val totalValues = totalResp.data?.result?.getOrNull(0)?.values
    val availValues = availResp.data?.result?.getOrNull(0)?.values
    if (totalValues.isNullOrEmpty() || availValues.isNullOrEmpty()) return null
    
    val total = totalValues.lastOrNull()?.getOrNull(1)?.toDoubleOrNull() ?: return null
    val available = availValues.lastOrNull()?.getOrNull(1)?.toDoubleOrNull() ?: return null
    
    if (total <= 0) return null
    val used = (total - available).coerceAtLeast(0.0)
    val percent = ((used / total) * 100).toInt().coerceIn(0, 100)
    return percent
}

private fun computeDiskPercent(sizeResp: PrometheusResponse, freeResp: PrometheusResponse): Int? {
    // Sum across all filesystem series
    val sizeValues = sizeResp.data?.result?.flatMap { it.values ?: emptyList() } ?: emptyList()
    val freeValues = freeResp.data?.result?.flatMap { it.values ?: emptyList() } ?: emptyList()
    
    if (sizeValues.isEmpty() || freeValues.isEmpty()) return null
    
    val totalSize = sizeValues.lastOrNull()?.getOrNull(1)?.toDoubleOrNull() ?: return null
    val totalFree = freeValues.lastOrNull()?.getOrNull(1)?.toDoubleOrNull() ?: return null
    
    if (totalSize <= 0) return null
    val used = (totalSize - totalFree).coerceAtLeast(0.0)
    val percent = ((used / totalSize) * 100).toInt().coerceIn(0, 100)
    return percent
}

private fun extractLatestValue(response: PrometheusResponse): Int? {
    val values = response.data?.result?.getOrNull(0)?.values
    if (values.isNullOrEmpty()) return null
    
    val latest = values.lastOrNull()?.getOrNull(1)
    return latest?.toDoubleOrNull()?.toInt()
}

data class DropletStats(
    val cpu: Int?,
    val memory: Int?,
    val disk: Int?
)

/**
 * Fetch droplet bandwidth totals
 * GET /v2/monitoring/metrics/droplet/bandwidth
 */
suspend fun fetchDropletBandwidth(connection: Connection, dropletId: String): DropletBandwidth? {
    val now = System.currentTimeMillis() / 1000
    val start = now - (24 * 60 * 60) // 24 hours ago
    val startTimestamp = start.toString()
    val endTimestamp = now.toString()
    
    try {
        // Fetch all bandwidth metrics
        val inPubUrl = "/v2/monitoring/metrics/droplet/bandwidth?host_id=$dropletId&interface=public&direction=inbound&start=$startTimestamp&end=$endTimestamp"
        val outPubUrl = "/v2/monitoring/metrics/droplet/bandwidth?host_id=$dropletId&interface=public&direction=outbound&start=$startTimestamp&end=$endTimestamp"
        val inPrivUrl = "/v2/monitoring/metrics/droplet/bandwidth?host_id=$dropletId&interface=private&direction=inbound&start=$startTimestamp&end=$endTimestamp"
        val outPrivUrl = "/v2/monitoring/metrics/droplet/bandwidth?host_id=$dropletId&interface=private&direction=outbound&start=$startTimestamp&end=$endTimestamp"
        
        val inPubParams = FetchParams(method = HTTPMethod.GET, url = inPubUrl, connection = connection)
        val outPubParams = FetchParams(method = HTTPMethod.GET, url = outPubUrl, connection = connection)
        val inPrivParams = FetchParams(method = HTTPMethod.GET, url = inPrivUrl, connection = connection)
        val outPrivParams = FetchParams(method = HTTPMethod.GET, url = outPrivUrl, connection = connection)
        
        val inPubResp: PrometheusResponse = httpRequest(inPubParams)
        val outPubResp: PrometheusResponse = httpRequest(outPubParams)
        val inPrivResp: PrometheusResponse = httpRequest(inPrivParams)
        val outPrivResp: PrometheusResponse = httpRequest(outPrivParams)
        
        // Sum values across all series and convert MB to bytes
        val inboundPublic = sumBandwidthValues(inPubResp)
        val outboundPublic = sumBandwidthValues(outPubResp)
        val inboundPrivate = sumBandwidthValues(inPrivResp)
        val outboundPrivate = sumBandwidthValues(outPrivResp)
        
        return DropletBandwidth(
            inboundPublic = inboundPublic,
            outboundPublic = outboundPublic,
            inboundPrivate = inboundPrivate,
            outboundPrivate = outboundPrivate
        )
    } catch (e: Exception) {
        return null
    }
}

private fun sumBandwidthValues(response: PrometheusResponse): Int? {
    val allSeries = response.data?.result ?: emptyList()
    if (allSeries.isEmpty()) return null
    
    // Sum the latest values from all series (convert MB to bytes)
    var totalMb = 0.0
    for (series in allSeries) {
        val latest = series.values?.lastOrNull()?.getOrNull(1)?.toDoubleOrNull()
        if (latest != null) {
            totalMb += latest
        }
    }
    
    if (totalMb == 0.0) return null
    // Convert MB to bytes
    return (totalMb * 1024.0 * 1024.0).toInt()
}

data class DropletBandwidth(
    val inboundPublic: Int?,
    val outboundPublic: Int?,
    val inboundPrivate: Int?,
    val outboundPrivate: Int?
)

data class PrometheusResponse(
    val data: PrometheusData?
)

data class PrometheusData(
    val result: List<PrometheusResult>?
)

data class PrometheusResult(
    val values: List<List<String>>?
)


