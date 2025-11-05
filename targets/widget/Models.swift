import Foundation

let appGroupName: String = "group.com.digitalocean.mobile"
let connectionsKey: String = "connections"
let isSubscribedKey: String = "isSubscribed"

struct Connection: Decodable, Encodable {
  let id: String
  let apiToken: String
}

enum WidgetIntentState: Int {
  case loading = 0
  case apiFailed = 1
  case hasContainers = 2
  case noContainers = 3
}






struct ConnectionAccountResponse: Decodable {
  let account: ConnectionAccount
}

struct ConnectionAccountTeam: Decodable {
  let uuid: String
}

struct ConnectionAccount: Decodable {
  let team: ConnectionAccountTeam
}



struct ConnectionProjectsResponse: Decodable {
  let projects: [ConnectionProject]
}

struct ConnectionProject: Decodable {
  let id: String
  let name: String
}


struct ConnectionResourcesResponse: Decodable {
  let resources: [ConnectionResource]
}

struct ConnectionResource: Decodable {
  let urn: String
}



struct ConnectionDropletRespone: Decodable {
  let droplet: ConnectionDroplet
}

struct ConnectionDroplet: Decodable {
  let id: String
  let name: String
  let vcpus: Int?

  private enum CodingKeys: String, CodingKey {
    case id
    case name
    case vcpus
  }

  init(from decoder: Decoder) throws {
    let container = try decoder.container(keyedBy: CodingKeys.self)

    // id can be a number or a string; normalize to String
    if let numericId = try? container.decode(Int.self, forKey: .id) {
      self.id = String(numericId)
    } else if let stringId = try? container.decode(String.self, forKey: .id) {
      self.id = stringId
    } else if let doubleId = try? container.decode(Double.self, forKey: .id) { // fallback in case API returns floating number (shouldn't)
      self.id = String(Int(doubleId))
    } else {
      // Let this throw with a clearer context
      self.id = try container.decode(String.self, forKey: .id)
    }

    self.name = try container.decode(String.self, forKey: .name)
    self.vcpus = try? container.decode(Int.self, forKey: .vcpus)
  }
}













// DigitalOcean Monitoring (Prometheus-like) response models
// Minimal structures to decode matrix responses with labeled series
struct PrometheusQueryResponse: Decodable {
  let data: PrometheusQueryData?
}

struct PrometheusQueryData: Decodable {
  let result: [PrometheusTimeSeries]
}

struct PrometheusTimeSeries: Decodable {
  let metric: [String: String]?
  let values: [PrometheusSample]
}

struct PrometheusSample: Decodable {
  let timestamp: Double
  let value: String
  
  init(from decoder: Decoder) throws {
    var container = try decoder.unkeyedContainer()
    let ts = try container.decode(Double.self)
    let val = try container.decode(String.self)
    self.timestamp = ts
    self.value = val
  }
}

// Aggregated widget data models
struct DropletNowStats {
  let cpuPercent: Int?
  let memoryPercent: Int?
  let diskPercent: Int?
}

struct DropletBandwidthTotals {
  let inboundPublic: Int?
  let outboundPublic: Int?
  let inboundPrivate: Int?
  let outboundPrivate: Int?
}
