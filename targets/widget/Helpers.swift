import Foundation
import OSLog

private let helpersLogger = Logger(subsystem: "ocean.widget", category: "Helpers")

enum Granularity {
  case fiveMinutes
  case oneHour
}

enum RoundMode {
  case up
  case down
}

func formatCompactCount(_ value: Int) -> String {
  let absValue = abs(value)
  let sign = value < 0 ? "-" : ""
  let formatter = NumberFormatter()
  formatter.numberStyle = .decimal
  formatter.usesGroupingSeparator = false
  formatter.minimumFractionDigits = 0
  formatter.maximumFractionDigits = 1
  
  var scaled: Double = Double(absValue)
  var suffix = ""
  if absValue >= 1_000_000_000 {
    scaled = Double(absValue) / 1_000_000_000.0
    suffix = "B"
  } else if absValue >= 1_000_000 {
    scaled = Double(absValue) / 1_000_000.0
    suffix = "M"
  } else if absValue >= 1_000 {
    scaled = Double(absValue) / 1_000.0
    suffix = "K"
  } else {
    return "\(value)"
  }
  let numberString = formatter.string(from: NSNumber(value: scaled)) ?? String(format: "%.1f", scaled)
  return "\(sign)\(numberString)\(suffix)"
}

func getAppDeepLink(connectionId: String?, path: String) -> String {
  guard let connectionId = connectionId else {
    return "ocean://"
  }
  
  if let sharedDefaults = UserDefaults(suiteName: appGroupName) {
    let isSubscribed = sharedDefaults.bool(forKey: isSubscribedKey)
    
    if isSubscribed {
      let separator = path.contains("?") ? "&" : "?"
      return "ocean://\(path)\(separator)_widgetConnectionId=\(connectionId)"
    }
  }

  return "ocean://?showPaywall=1"
}

// Format raw byte counts into human-readable strings (Bytes, KB, MB, GB, TB, PB)
func formatBytes(_ bytes: Int, decimals: Int = 1) -> String {
  if bytes == 0 { return "0 B" }
  let k = 1024.0
  let units = ["B", "KB", "MB", "GB", "TB", "PB"]
  let absBytes = Double(abs(bytes))
  let i = Int(floor(log(absBytes) / log(k)))
  let value = absBytes / pow(k, Double(i))
  let formatter = NumberFormatter()
  formatter.numberStyle = .decimal
  formatter.minimumFractionDigits = 0
  formatter.maximumFractionDigits = max(0, decimals)
  let numberString = formatter.string(from: NSNumber(value: value)) ?? String(format: "%0.*f", max(0, decimals), value)
  let sign = bytes < 0 ? "-" : ""
  return "\(sign)\(numberString)\(units[min(i, units.count - 1)])"
}

// MARK: - URN helpers

func getUrnParts(_ urn: String) -> [String] {
  return urn.split(separator: ":").map(String.init)
}

func getUrnType(_ urn: String) -> String? {
  let parts = getUrnParts(urn)
  guard parts.count >= 2 else { return nil }
  return parts[1]
}

func isDropletUrn(_ urn: String) -> Bool {
  return getUrnType(urn)?.lowercased() == "droplet"
}

func getDropletId(urn: String) -> String? {
  let parts = getUrnParts(urn)
  guard parts.count >= 3 else { return nil }
  let type = parts[1].lowercased()
  let idOrName = parts[2]
  guard type == "droplet" else { return nil }
  return idOrName
}
