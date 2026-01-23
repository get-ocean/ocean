import WidgetKit
import SwiftUI
import AppIntents

struct LargeProjectDropletsAppIntentConfiguration: WidgetConfigurationIntent {
  static var title: LocalizedStringResource { "Project Droplets" }
  static var description: IntentDescription { "Select your project." }
  
  @Parameter(title: "Project")
  var project: ProjectListItem?
}

struct LargeProjectDropletsProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> LargeProjectDropletsEntry {
    LargeProjectDropletsEntry(date: Date(), configuration: LargeProjectDropletsAppIntentConfiguration(), isSubscribed: true, droplets: [])
  }
  
  func snapshot(for configuration: LargeProjectDropletsAppIntentConfiguration, in context: Context) async -> LargeProjectDropletsEntry {
    LargeProjectDropletsEntry(date: Date(), configuration: configuration, isSubscribed: true, droplets: [])
  }
  
  func timeline(for configuration: LargeProjectDropletsAppIntentConfiguration, in context: Context) async -> Timeline<LargeProjectDropletsEntry> {
    var isSubscribed: Bool = false
    var dropletRows: [DropletRow] = []

    if let sharedDefaults = UserDefaults(suiteName: appGroupName) {
       isSubscribed = sharedDefaults.bool(forKey: isSubscribedKey)
    }
    
    if let project = configuration.project {
      do {
        let resourcesResp = try await fetchProjectResources(connection: project.connection, projectId: project.id)
        let resources = resourcesResp.resources
        let dropletUrns = resources.filter { isDropletUrn($0.urn) }
        
        for res in dropletUrns.prefix(6) { // limit to fit large widget
          guard let dropletId = getDropletId(urn: res.urn) else { continue }
          do {
            async let nowStats = fetchDropletNowStats(connection: project.connection, dropletId: dropletId)
            async let dropletResp = fetchDroplet(connection: project.connection, dropletId: dropletId)
            let (stats, d) = try await (nowStats, dropletResp)
            let row = DropletRow(id: d.droplet.id, name: d.droplet.name, connectionId: project.connection.id, cpu: stats.cpuPercent, memory: stats.memoryPercent, disk: stats.diskPercent)
            dropletRows.append(row)
          } catch {
            continue
          }
        }
      } catch {
        // ignore errors; leave empty state
      }
    }
    
    let entry = LargeProjectDropletsEntry(date: Date(), configuration: configuration, isSubscribed: isSubscribed, droplets: dropletRows)
    let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
    return Timeline(entries: [entry], policy: .after(nextUpdate))
  }
}

struct DropletRow {
  let id: String
  let name: String
  let connectionId: String
  let cpu: Int?
  let memory: Int?
  let disk: Int?
}

struct LargeProjectDropletsEntry: TimelineEntry {
  let date: Date
  let configuration: LargeProjectDropletsAppIntentConfiguration
  let isSubscribed: Bool
  let droplets: [DropletRow]
}

struct DropletRowView: View {
  var row: DropletRow
  
  var body: some View {
    HStack(spacing: 8) {
      VStack(alignment: .leading, spacing: 4) {
        Text(row.name)
          .font(.system(size: 14, weight: .semibold))
          .foregroundStyle(Color("neutral000"))
          .lineLimit(1)
          .truncationMode(.tail)
        HStack(spacing: 10) {
          Text("CPU: \(row.cpu.map(String.init) ?? "—")%")
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(Color("blue500"))
          Text("Mem: \(row.memory.map(String.init) ?? "—")%")
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(Color("teal500"))
          Text("Disk: \(row.disk.map(String.init) ?? "—")%")
            .font(.system(size: 11, weight: .bold))
            .foregroundStyle(Color("purple500"))
        }
      }
      Spacer()
      Link(destination: URL(string: getAppDeepLink(connectionId: row.connectionId, path: "droplets/\(row.id)/home"))!) {
        Text("OPEN")
          .font(.system(size: 12, weight: .bold))
          .foregroundStyle(Color("neutral000"))
          .padding(.horizontal, 12)
          .padding(.vertical, 6)
          .background(Color("primary"))
          .clipShape(Capsule())
      }
    }
    .padding(.vertical, 6)
  }
}

struct LargeProjectDropletsEntryView: View {
  var entry: LargeProjectDropletsProvider.Entry
  
  var body: some View {
    if (!entry.isSubscribed) {
      SubscriptionRequiredView()
        .widgetURL(URL(string: getAppDeepLink(connectionId: entry.configuration.project?.connection.id, path: "")))
    } else {
      VStack(alignment: .leading, spacing: 12) {
        HStack(spacing: 8) {
          Image("AppIconImage")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: 28.0, height: 28.0)
            .clipShape(Circle())
          Text(entry.configuration.project?.name ?? "Droplets")
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(Color("neutral000"))
          Spacer()
        }
        
        VStack(spacing: 0) {
          ForEach(Array(entry.droplets.enumerated()), id: \.offset) { _, row in
            DropletRowView(row: row)
            if row.id != entry.droplets.last?.id {
              Divider().background(Color("hr"))
            }
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .padding(12)
      .containerBackground(for: .widget) {
        Color("bgApp")
      }
    }
  }
}

struct LargeProjectDropletsWidget: Widget {
  let kind: String = "LargeProjectDropletsWidget"
  
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: LargeProjectDropletsAppIntentConfiguration.self, provider: LargeProjectDropletsProvider()) { entry in
      LargeProjectDropletsEntryView(entry: entry)
    }
    .configurationDisplayName("Project Droplets")
    .description("List droplets in a project with current stats.")
    .supportedFamilies([.systemLarge])
  }
}

#Preview(as: .systemLarge) {
  LargeProjectDropletsWidget()
} timeline: {
  LargeProjectDropletsEntry(date: .now, configuration: LargeProjectDropletsAppIntentConfiguration(), isSubscribed: true, droplets: [
    .init(id: "1", name: "Ocean Droplet", connectionId: "1", cpu: 12, memory: 34, disk: 56)
  ])
}


