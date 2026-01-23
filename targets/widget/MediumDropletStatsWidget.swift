import WidgetKit
import SwiftUI
import AppIntents


fileprivate struct StatsNowWidgetData {
  let cpuPercent: Int?
  let memoryPercent: Int?
  let diskPercent: Int?
}

fileprivate enum RangeOption: String, AppEnum {
  case day = "24H"
  case week = "7D"
  
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Range"
  static var caseDisplayRepresentations: [RangeOption: DisplayRepresentation] = [
    .day: "24H",
    .week: "7D"
  ]
}

struct MediumDropletStatsAppIntentConfiguration: WidgetConfigurationIntent {
  static var title: LocalizedStringResource { "Droplet" }
  static var description: IntentDescription { "Select your droplet." }
  
  @Parameter(title: "Droplet")
  var droplet: DropletListItem?
}

struct MediumDropletStatsProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> MediumDropletStatsEntry {
    MediumDropletStatsEntry(date: Date(), configuration: MediumDropletStatsAppIntentConfiguration(), isSubscribed: true, metrics: .init(cpuPercent: nil, memoryPercent: nil, diskPercent: nil))
  }
  
  func snapshot(for configuration: MediumDropletStatsAppIntentConfiguration, in context: Context) async -> MediumDropletStatsEntry {
    MediumDropletStatsEntry(date: Date(), configuration: configuration, isSubscribed: true, metrics: .init(cpuPercent: 37, memoryPercent: 62, diskPercent: 41))
  }
  
  func timeline(for configuration: MediumDropletStatsAppIntentConfiguration, in context: Context) async -> Timeline<MediumDropletStatsEntry> {
    var entries: [MediumDropletStatsEntry] = []
    var isSubscribed: Bool = false
    var metricsData: StatsNowWidgetData = .init(cpuPercent: nil, memoryPercent: nil, diskPercent: nil)
    
    if let sharedDefaults = UserDefaults(suiteName: appGroupName) {
       isSubscribed = sharedDefaults.bool(forKey: isSubscribedKey)
    }
    
    if let droplet = configuration.droplet {
      if let nowStats = try? await fetchDropletNowStats(connection: droplet.connection, dropletId: droplet.id) {
        metricsData = .init(
          cpuPercent: nowStats.cpuPercent,
          memoryPercent: nowStats.memoryPercent,
          diskPercent: nowStats.diskPercent
        )
      }
    }
    
    // Generate a timeline consisting of five entries an hour apart, starting from the current date.
    let currentDate = Date()
    for hourOffset in 0 ..< 5 {
      let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
      let entry = MediumDropletStatsEntry(date: entryDate, configuration: configuration, isSubscribed: isSubscribed, metrics: metricsData)
      entries.append(entry)
    }
    
    return Timeline(entries: entries, policy: .atEnd)
  }
}

struct MediumDropletStatsEntry: TimelineEntry {
  let date: Date
  let configuration: MediumDropletStatsAppIntentConfiguration
  let isSubscribed: Bool
  fileprivate let metrics: StatsNowWidgetData
}

struct MediumDropletStatsInfoItemView: View {
  var color: String
  var label: String
  var value: Int?
  var icon: String
  var isPercent: Bool = true
  
  var body: some View {
    VStack(alignment: .center, spacing: 8.0) {
      Image(systemName: icon)
        .font(.system(size: 16, weight: .semibold))
        .foregroundStyle(Color(color))
      Text(value.map { isPercent ? "\($0)%" : formatCompactCount($0) } ?? "—")
        .font(.system(size: 28, weight: .bold))
        .foregroundStyle(Color("neutral000"))
      Text(label)
        .font(.system(size: 14, weight: .bold))
        .foregroundStyle(Color(color))
    }
  }
}

struct MediumDropletStatsEntryView: View {
  var entry: MediumDropletStatsProvider.Entry
  
  var body: some View {
    if (!entry.isSubscribed) {
      SubscriptionRequiredView()
        .widgetURL(URL(string: getAppDeepLink(connectionId: entry.configuration.droplet?.connection.id, path: "droplets/\(entry.configuration.droplet?.id ?? "")/home")))
    } else {
      let config = entry.configuration
      
      VStack(alignment: .leading, spacing: 20.0) {
        HStack(alignment: .center, spacing: 10.0) {
          Image("AppIconImage")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: 30.0, height: 30.0)
            .clipShape(Circle())
          
          if let droplet = config.droplet {
            HStack(spacing: 0) {
              Text("\(droplet.name)")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(Color("neutral000"))
                .multilineTextAlignment(.center)
                .lineLimit(1)
                .truncationMode(.tail)
              
              Spacer()
              
              // Show selected range
              // (not used)
            }
          } else {
            VStack {
              RoundedRectangle(cornerRadius: 8.0)
                .fill(Color("bgSecondary"))
                .frame(height: 10.0)
            }
          }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        
        HStack(alignment: .center, spacing: 0) {
          // Conditionally show metrics based on configuration
          Spacer()
          MediumDropletStatsInfoItemView(color: "green500", label: "CPU", value: entry.metrics.cpuPercent, icon: "gauge")
          Spacer()
          MediumDropletStatsInfoItemView(color: "purple500", label: "Memory", value: entry.metrics.memoryPercent, icon: "memorychip")
          Spacer()
          MediumDropletStatsInfoItemView(color: "blue500", label: "Disk", value: entry.metrics.diskPercent, icon: "externaldrive")
          Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .center)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .widgetURL(URL(string: getAppDeepLink(connectionId: entry.configuration.droplet?.connection.id, path: "droplets/\(entry.configuration.droplet?.id ?? "")/home")))
    }
  }
}

struct MediumDropletStatsWidget: Widget {
  let kind: String = "MediumDropletStatsWidget"
  
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: MediumDropletStatsAppIntentConfiguration.self, provider: MediumDropletStatsProvider()) { entry in
      MediumDropletStatsEntryView(entry: entry)
        .containerBackground(for: .widget) {
          Color("bgApp")
        }
    }
    .configurationDisplayName("Droplet Stats").description("CPU / Memory / Disk of your droplet. Requires the DO Agent to be installed on the droplet.")
    .supportedFamilies([.systemMedium])
  }
}

extension MediumDropletStatsAppIntentConfiguration {
  fileprivate static var project: MediumDropletStatsAppIntentConfiguration {
    let intent = MediumDropletStatsAppIntentConfiguration()
    intent.droplet = .init(id: "1", name: "Ocean Droplet", connection: .init(id: "1", apiToken: "2"))
    return intent
  }
}

#Preview(as: .systemSmall) {
  MediumDropletStatsWidget()
} timeline: {
  MediumDropletStatsEntry(date: .now, configuration: .project, isSubscribed: true, metrics: .init(cpuPercent: 40, memoryPercent: 55, diskPercent: 70))
}
