import WidgetKit
import SwiftUI
import AppIntents

struct SmallShortcutAppIntentConfiguration: WidgetConfigurationIntent {
  static var title: LocalizedStringResource { "Droplet" }
  static var description: IntentDescription { "Select your droplet." }
  
  @Parameter(title: "Droplet")
  var droplet: DropletListItem?
}

struct SmallShortcutProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> SmallShortcutEntry {
    SmallShortcutEntry(date: Date(), configuration: SmallShortcutAppIntentConfiguration(), isSubscribed: true)
  }
  
  func snapshot(for configuration: SmallShortcutAppIntentConfiguration, in context: Context) async -> SmallShortcutEntry {
    SmallShortcutEntry(date: Date(), configuration: configuration, isSubscribed: true)
  }
  
  func timeline(for configuration: SmallShortcutAppIntentConfiguration, in context: Context) async -> Timeline<SmallShortcutEntry> {
    var isSubscribed: Bool = false
    
    if let sharedDefaults = UserDefaults(suiteName: appGroupName) {
       isSubscribed = sharedDefaults.bool(forKey: isSubscribedKey)
    }
    
    let entry = SmallShortcutEntry(date: Date(), configuration: configuration, isSubscribed: isSubscribed)
    return Timeline(entries: [entry], policy: .never)
  }
}

struct SmallShortcutEntry: TimelineEntry {
  let date: Date
  let configuration: SmallShortcutAppIntentConfiguration
  let isSubscribed: Bool
}

struct SmallShortcutEntryView: View {
  var entry: SmallShortcutProvider.Entry
  
  var body: some View {
    if (!entry.isSubscribed) {
      SubscriptionRequiredView()
        .widgetURL(URL(string: getAppDeepLink(connectionId: entry.configuration.droplet?.connection.id, path: "droplets/\(entry.configuration.droplet?.id ?? "")/home")))
    } else {
      VStack(alignment: .center, spacing: 10.0) {
        Image("AppIconImage")
          .resizable()
          .aspectRatio(contentMode: .fit)
          .frame(width: 75.0, height: 75.0)
          .clipShape(Circle())
        
        if let droplet = entry.configuration.droplet {
          Text("\(droplet.name)")
            .font(.system(size: 16, weight: .bold))
            .foregroundStyle(Color("neutral000"))
            .multilineTextAlignment(.center)
            .lineLimit(2)
            .truncationMode(.tail)
        } else {
          VStack() {
            RoundedRectangle(cornerRadius: 8.0)
              .fill(Color("bgSecondary"))
              .frame(height: 10.0)
            RoundedRectangle(cornerRadius: 8.0)
              .fill(Color("bgSecondary"))
              .frame(width: 50.0, height: 10.0)
          }
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
      .widgetURL(URL(string: getAppDeepLink(connectionId: entry.configuration.droplet?.connection.id, path: "droplets/\(entry.configuration.droplet?.id ?? "")/home")))
    }
  }
}

struct SmallShortcutWidget: Widget {
  let kind: String = "SmallShortcutWidget"
  
  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SmallShortcutAppIntentConfiguration.self, provider: SmallShortcutProvider()) { entry in
      SmallShortcutEntryView(entry: entry)
        .containerBackground(for: .widget) {
          Color("bgApp")
        }
    }
    .configurationDisplayName("Droplet Shortcut").description("Quickly open your droplet.")
    .supportedFamilies([.systemSmall])
  }
}

extension SmallShortcutAppIntentConfiguration {
  fileprivate static var project: SmallShortcutAppIntentConfiguration {
    let intent = SmallShortcutAppIntentConfiguration()
    intent.droplet = .init(id: "1", name: "Ocean", connection: .init(id: "1", apiToken: "2"))
    return intent
  }
}

#Preview(as: .systemSmall) {
  SmallShortcutWidget()
} timeline: {
  SmallShortcutEntry(date: .now, configuration: .project, isSubscribed: true)
}
