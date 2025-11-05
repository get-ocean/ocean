import WidgetKit
import SwiftUI
import AppIntents

fileprivate enum RangeOption: String, AppEnum {
  case day = "24H"
  case week = "7D"
  
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Range"
  static var caseDisplayRepresentations: [RangeOption: DisplayRepresentation] = [
    .day: "24H",
    .week: "7D"
  ]
}

struct MediumDropletBandwidthAppIntentConfiguration: WidgetConfigurationIntent {
  static var title: LocalizedStringResource { "Droplet" }
  static var description: IntentDescription { "Select your droplet." }
  
  @Parameter(title: "Droplet")
  var droplet: DropletListItem?
}

struct MediumDropletBandwidthProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> MediumDropletBandwidthEntry {
    MediumDropletBandwidthEntry(date: Date(), configuration: MediumDropletBandwidthAppIntentConfiguration(), isSubscribed: true,  bandwidth: .init(inboundPublic: nil, outboundPublic: nil, inboundPrivate: nil, outboundPrivate: nil))
  }
  
  func snapshot(for configuration: MediumDropletBandwidthAppIntentConfiguration, in context: Context) async -> MediumDropletBandwidthEntry {
    MediumDropletBandwidthEntry(date: Date(), configuration: configuration, isSubscribed: true, bandwidth: .init(inboundPublic: 1234, outboundPublic: 4567, inboundPrivate: 222, outboundPrivate: 111))
  }
  
  func timeline(for configuration: MediumDropletBandwidthAppIntentConfiguration, in context: Context) async -> Timeline<MediumDropletBandwidthEntry> {
    var entries: [MediumDropletBandwidthEntry] = []
    var isSubscribed: Bool = false
    var bandwidthData: DropletBandwidthTotals = .init(inboundPublic: nil, outboundPublic: nil, inboundPrivate: nil, outboundPrivate: nil)
    
    if let sharedDefaults = UserDefaults(suiteName: appGroupName) {
       isSubscribed = sharedDefaults.bool(forKey: isSubscribedKey)
    }
    
    if let droplet = configuration.droplet {
      if let bw = try? await fetchDropletBandwidthTotals(connection: droplet.connection, dropletId: droplet.id) {
        bandwidthData = bw
      }
    }
    
    // Generate a timeline consisting of five entries an hour apart, starting from the current date.
    let currentDate = Date()
    for hourOffset in 0 ..< 5 {
      let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
      let entry = MediumDropletBandwidthEntry(date: entryDate, configuration: configuration, isSubscribed: isSubscribed, bandwidth: bandwidthData)
      entries.append(entry)
    }
    
    return Timeline(entries: entries, policy: .atEnd)
  }
}

struct MediumDropletBandwidthEntry: TimelineEntry {
  let date: Date
  let configuration: MediumDropletBandwidthAppIntentConfiguration
  let isSubscribed: Bool
  let bandwidth: DropletBandwidthTotals
}

struct MediumDropletBandwidthInfoItemView: View {
  var color: String
  var label: String
  var value: Int?
  var icon: String
  
  var body: some View {
    VStack(alignment: .center, spacing: 8.0) {
      Image(systemName: icon)
        .font(.system(size: 16, weight: .semibold))
        .foregroundStyle(Color(color))
      Text(value.map { formatBytes($0) } ?? "—")
        .font(.system(size: 22, weight: .bold))
        .foregroundStyle(Color("neutral000"))
      Text(label)
        .font(.system(size: 12, weight: .bold))
        .foregroundStyle(Color(color))
    }
  }
}

struct MediumDropletBandwidthEntryView: View {
  var entry: MediumDropletBandwidthProvider.Entry
  
  var body: some View {
    if (!entry.isSubscribed) {
      SubscriptionRequiredView()
        .widgetURL(URL(string: getAppDeepLink(dropletId: entry.configuration.droplet?.id)))
    } else {
      let config = entry.configuration
      
      VStack(alignment: .leading, spacing: 36.0) {
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
                .lineLimit(1)
                .truncationMode(.tail)
              
              Spacer()
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
          Spacer()
          MediumDropletBandwidthInfoItemView(color: "blue500", label: "In", value: entry.bandwidth.inboundPublic, icon: "arrow.down.circle")
          Spacer()
          MediumDropletBandwidthInfoItemView(color: "blue500", label: "Out", value: entry.bandwidth.outboundPublic, icon: "arrow.up.circle")
          Spacer()
          MediumDropletBandwidthInfoItemView(color: "teal500", label: "In", value: entry.bandwidth.inboundPrivate, icon: "arrow.down.circle")
          Spacer()
          MediumDropletBandwidthInfoItemView(color: "teal500", label: "Out", value: entry.bandwidth.outboundPrivate, icon: "arrow.up.circle")
          Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .center)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
      .widgetURL(URL(string: getAppDeepLink(dropletId: entry.configuration.droplet?.id)))
    }
  }
}

struct MediumDropletBandwidthWidget: Widget {
  let kind: String = "MediumDropletBandwidthWidget"
  
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: MediumDropletBandwidthAppIntentConfiguration.self, provider: MediumDropletBandwidthProvider()) { entry in
      MediumDropletBandwidthEntryView(entry: entry)
        .containerBackground(for: .widget) {
          Color("bgApp")
        }
    }
    .configurationDisplayName("Droplet Bandwidth").description("Inbound/Outbound metrics for your droplet.")
    .supportedFamilies([.systemMedium])
  }
}

extension MediumDropletBandwidthAppIntentConfiguration {
  fileprivate static var project: MediumDropletBandwidthAppIntentConfiguration {
    let intent = MediumDropletBandwidthAppIntentConfiguration()
    intent.droplet = .init(id: "1", name: "Ocean Droplet", connection: .init(id: "1", apiToken: "2"))
    return intent
  }
}

#Preview(as: .systemSmall) {
  MediumDropletBandwidthWidget()
} timeline: {
  MediumDropletBandwidthEntry(date: .now, configuration: .project, isSubscribed: true, bandwidth: .init(inboundPublic: 111, outboundPublic: 222, inboundPrivate: 333, outboundPrivate: 444))
}
