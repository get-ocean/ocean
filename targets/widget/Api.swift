import Foundation

// NOT NEEDED
//func fetchConnectionAccount(connection: Connection) async throws -> ConnectionAccountResponse {
//  let params = FetchParams<NoBody>(
//    method: HTTPMethod.GET,
//    url: "/v2/account",
//    connection: connection
//  )
//  
//  return try await httpRequest(params: params)
//}

func fetchConnectionProjects(connection: Connection) async throws -> ConnectionProjectsResponse {
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
    url: "/v2/projects",
    connection: connection
  )
  
  return try await httpRequest(params: params)
}


func fetchProjectResources(connection: Connection, projectId: String) async throws -> ConnectionResourcesResponse {
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
    url: "/v2/projects/\(projectId)/resources",
    connection: connection
  )
  
  return try await httpRequest(params: params)
}


func fetchDroplet(connection: Connection, dropletId: String) async throws -> ConnectionDropletRespone {
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
    url: "/v2/droplets/\(dropletId)",
    connection: connection
  )
  
  return try await httpRequest(params: params)
}

// Parallel best-effort fetch; skips failures and returns only successful droplets
func fetchDropletsSkipFailures(connection: Connection, dropletIds: [String]) async -> [ConnectionDroplet] {
  await withTaskGroup(of: ConnectionDroplet?.self) { group in
    for id in dropletIds {
      group.addTask {
        do {
          let resp = try await fetchDroplet(connection: connection, dropletId: id)
          return resp.droplet
        } catch {
          return nil
        }
      }
    }
    var results: [ConnectionDroplet] = []
    for await droplet in group {
      if let d = droplet {
        results.append(d)
      }
    }
    return results
  }
}


// MARK: - DigitalOcean Monitoring (Prometheus-like) helpers

private func buildUnixSecondsRange(from fromMs: Int?, to toMs: Int?) -> (String, String) {
  let nowMs = Int(Date().timeIntervalSince1970 * 1000)
  let defaultTo = toMs ?? nowMs
  let defaultFrom = fromMs ?? (defaultTo - 24 * 60 * 60 * 1000)
  let start = String(Int(Double(defaultFrom) / 1000.0))
  let end = String(Int(Double(defaultTo) / 1000.0))
  return (start, end)
}

// CPU percentage series for a droplet
func fetchDropletCpuSeries(connection: Connection, dropletId: String, from fromMs: Int?, to toMs: Int?) async throws -> PrometheusQueryResponse {
  let (start, end) = buildUnixSecondsRange(from: fromMs, to: toMs)
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
    url: "/v2/monitoring/metrics/droplet/cpu?host_id=\(dropletId)&start=\(start)&end=\(end)",
    connection: connection
  )
  return try await httpRequest(params: params)
}

// Memory total and available; caller computes percent
func fetchDropletMemoryTotalSeries(connection: Connection, dropletId: String, from fromMs: Int?, to toMs: Int?) async throws -> PrometheusQueryResponse {
  let (start, end) = buildUnixSecondsRange(from: fromMs, to: toMs)
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
    url: "/v2/monitoring/metrics/droplet/memory_total?host_id=\(dropletId)&start=\(start)&end=\(end)",
    connection: connection
  )
  return try await httpRequest(params: params)
}

func fetchDropletMemoryAvailableSeries(connection: Connection, dropletId: String, from fromMs: Int?, to toMs: Int?) async throws -> PrometheusQueryResponse {
  let (start, end) = buildUnixSecondsRange(from: fromMs, to: toMs)
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
    url: "/v2/monitoring/metrics/droplet/memory_available?host_id=\(dropletId)&start=\(start)&end=\(end)",
    connection: connection
  )
  return try await httpRequest(params: params)
}

// Disk filesystem totals
func fetchDropletFilesystemSizeSeries(connection: Connection, dropletId: String, from fromMs: Int?, to toMs: Int?) async throws -> PrometheusQueryResponse {
  let (start, end) = buildUnixSecondsRange(from: fromMs, to: toMs)
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
    url: "/v2/monitoring/metrics/droplet/filesystem_size?host_id=\(dropletId)&start=\(start)&end=\(end)",
    connection: connection
  )
  return try await httpRequest(params: params)
}

func fetchDropletFilesystemFreeSeries(connection: Connection, dropletId: String, from fromMs: Int?, to toMs: Int?) async throws -> PrometheusQueryResponse {
  let (start, end) = buildUnixSecondsRange(from: fromMs, to: toMs)
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
    url: "/v2/monitoring/metrics/droplet/filesystem_free?host_id=\(dropletId)&start=\(start)&end=\(end)",
    connection: connection
  )
  return try await httpRequest(params: params)
}

// Bandwidth directions/interfaces
func fetchDropletBandwidthSeries(connection: Connection, dropletId: String, iface: String, direction: String, from fromMs: Int?, to toMs: Int?) async throws -> PrometheusQueryResponse {
  let (start, end) = buildUnixSecondsRange(from: fromMs, to: toMs)
  let params = FetchParams<NoBody>(
    method: HTTPMethod.GET,
    url: "/v2/monitoring/metrics/droplet/bandwidth?host_id=\(dropletId)&interface=\(iface)&direction=\(direction)&start=\(start)&end=\(end)",
    connection: connection
  )
  return try await httpRequest(params: params)
}

// MARK: - Aggregators for "Now" stats

private func latestValue(from response: PrometheusQueryResponse) -> Double? {
  guard let series = response.data?.result.first else { return nil }
  guard let last = series.values.last else { return nil }
  let num = Double(last.value)
  return num
}

private func latestSumAcrossSeries(from response: PrometheusQueryResponse) -> Double? {
  guard let results = response.data?.result, !results.isEmpty else { return nil }
  var sum: Double = 0
  var hasAny = false
  for ts in results {
    if let last = ts.values.last, let v = Double(last.value) {
      sum += v
      hasAny = true
    }
  }
  return hasAny ? sum : nil
}

// For bandwidth totals, mimic app logic by summing all values in the first series.
// The app treats the summed value as MB; we will convert to bytes when formatting.
private func sumFirstSeriesValues(from response: PrometheusQueryResponse) -> Double? {
  guard let series = response.data?.result.first else { return nil }
  var sum: Double = 0
  var hasAny = false
  for sample in series.values {
    if let v = Double(sample.value) {
      sum += v
      hasAny = true
    }
  }
  return hasAny ? sum : nil
}

private func sumAllSeriesValues(from response: PrometheusQueryResponse) -> Double? {
  guard let results = response.data?.result, !results.isEmpty else { return nil }
  var sum: Double = 0
  var hasAny = false
  for series in results {
    for sample in series.values {
      if let v = Double(sample.value) {
        sum += v
        hasAny = true
      }
    }
  }
  return hasAny ? sum : nil
}

func fetchDropletNowStats(connection: Connection, dropletId: String) async throws -> DropletNowStats {
  async let memTotal = fetchDropletMemoryTotalSeries(connection: connection, dropletId: dropletId, from: nil, to: nil)
  async let memAvail = fetchDropletMemoryAvailableSeries(connection: connection, dropletId: dropletId, from: nil, to: nil)
  async let fsSize = fetchDropletFilesystemSizeSeries(connection: connection, dropletId: dropletId, from: nil, to: nil)
  async let fsFree = fetchDropletFilesystemFreeSeries(connection: connection, dropletId: dropletId, from: nil, to: nil)
  async let cpu = fetchDropletCpuSeries(connection: connection, dropletId: dropletId, from: nil, to: nil)
  async let dropletResp = fetchDroplet(connection: connection, dropletId: dropletId)
  
  let (memTotalResp, memAvailResp, fsSizeResp, fsFreeResp, cpuResp, dropletDetails) = try await (memTotal, memAvail, fsSize, fsFree, cpu, dropletResp)
  
  var cpuPercent: Int? = nil
  if let percent = computeCpuPercentFromResponse(response: cpuResp, vcpus: max(1, dropletDetails.droplet.vcpus ?? 1)) {
    cpuPercent = percent
  }
  
  var memoryPercent: Int? = nil
  if let total = latestValue(from: memTotalResp), let available = latestValue(from: memAvailResp), total > 0 {
    let used = max(0, total - max(0, available))
    let percent = max(0, min(100, (used / total) * 100))
    memoryPercent = Int(percent.rounded())
  }
  
  var diskPercent: Int? = nil
  if let size = latestSumAcrossSeries(from: fsSizeResp), let free = latestSumAcrossSeries(from: fsFreeResp), size > 0 {
    let used = max(0, size - max(0, free))
    let percent = max(0, min(100, (used / size) * 100))
    diskPercent = Int(percent.rounded())
  }
  
  return DropletNowStats(cpuPercent: cpuPercent, memoryPercent: memoryPercent, diskPercent: diskPercent)
}

private func computeCpuPercentFromResponse(response: PrometheusQueryResponse, vcpus: Int) -> Int? {
  guard let results = response.data?.result, !results.isEmpty else { return nil }
  // Build map of timestamps -> { total, idle }
  var timestamps: Set<Double> = []
  var valuesByMode: [String: [(ts: Double, value: Double)]] = [:]
  for ts in results {
    let mode = ts.metric?["mode"] ?? ""
    var seriesValues: [(ts: Double, value: Double)] = []
    for sample in ts.values {
      if let v = Double(sample.value) {
        seriesValues.append((ts: sample.timestamp, value: v))
        timestamps.insert(sample.timestamp)
      }
    }
    valuesByMode[mode] = seriesValues
  }
  // Determine the last two timestamps overall
  let sortedTs = Array(timestamps).sorted()
  guard sortedTs.count >= 2 else { return nil }
  let tPrev = sortedTs[sortedTs.count - 2]
  let tCurr = sortedTs[sortedTs.count - 1]
  // Sum across modes at the two timestamps
  func valueAt(_ series: [(ts: Double, value: Double)], ts: Double) -> Double? {
    // Find exact match; if missing, pick nearest previous
    var candidate: (ts: Double, value: Double)? = nil
    for point in series {
      if point.ts == ts { return point.value }
      if point.ts < ts { candidate = point }
    }
    return candidate?.value
  }
  var totalPrev: Double = 0
  var totalCurr: Double = 0
  var idlePrev: Double = 0
  var idleCurr: Double = 0
  var hasAny = false
  for (mode, series) in valuesByMode {
    guard !series.isEmpty else { continue }
    let vPrev = valueAt(series, ts: tPrev)
    let vCurr = valueAt(series, ts: tCurr)
    if let a = vPrev, let b = vCurr {
      totalPrev += a
      totalCurr += b
      if mode == "idle" {
        idlePrev += a
        idleCurr += b
      }
      hasAny = true
    }
  }
  guard hasAny else { return nil }
  let totalDiff = totalCurr - totalPrev
  let idleDiff = idleCurr - idlePrev
  guard totalDiff > 0 else { return nil }
  let used = max(0, totalDiff - max(0, idleDiff))
  let usedCores = used / max(1.0, Double(tCurr - tPrev))
  let percent = max(0, min(100, (usedCores / Double(max(1, vcpus))) * 100))
  return Int(percent.rounded())
}

func fetchDropletBandwidthTotals(connection: Connection, dropletId: String) async throws -> DropletBandwidthTotals {
  async let inPublic = fetchDropletBandwidthSeries(connection: connection, dropletId: dropletId, iface: "public", direction: "inbound", from: nil, to: nil)
  async let outPublic = fetchDropletBandwidthSeries(connection: connection, dropletId: dropletId, iface: "public", direction: "outbound", from: nil, to: nil)
  async let inPrivate = fetchDropletBandwidthSeries(connection: connection, dropletId: dropletId, iface: "private", direction: "inbound", from: nil, to: nil)
  async let outPrivate = fetchDropletBandwidthSeries(connection: connection, dropletId: dropletId, iface: "private", direction: "outbound", from: nil, to: nil)
  
  let (inPub, outPub, inPriv, outPriv) = try await (inPublic, outPublic, inPrivate, outPrivate)
  
  // Sum values across the first series (matching app) and convert MB -> bytes for display
  func toBytes(_ totalMb: Double?) -> Int? {
    guard let totalMb = totalMb else { return nil }
    return Int((totalMb * 1024.0 * 1024.0).rounded())
  }
  let inboundPublic = toBytes(sumFirstSeriesValues(from: inPub) ?? sumAllSeriesValues(from: inPub))
  let outboundPublic = toBytes(sumFirstSeriesValues(from: outPub) ?? sumAllSeriesValues(from: outPub))
  let inboundPrivate = toBytes(sumFirstSeriesValues(from: inPriv) ?? sumAllSeriesValues(from: inPriv))
  let outboundPrivate = toBytes(sumFirstSeriesValues(from: outPriv) ?? sumAllSeriesValues(from: outPriv))
  
  return DropletBandwidthTotals(
    inboundPublic: inboundPublic,
    outboundPublic: outboundPublic,
    inboundPrivate: inboundPrivate,
    outboundPrivate: outboundPrivate
  )
}



