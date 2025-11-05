import Foundation
import AppIntents
import OSLog

struct ProjectListItem: AppEntity, Decodable {
  static var defaultQuery = ProjectQuery()
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Select Project"
  
  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)")
  }
  
  let id: String
  let name: String
  let connection: Connection
}

private let projectIntentLogger = Logger(subsystem: "ocean.widget", category: "ProjectIntent")

struct ProjectQuery: EntityQuery {
  func getSharedOptions() async throws -> [ProjectListItem] {
    var options: [ProjectListItem] = []
    
    projectIntentLogger.debug("getSharedOptions invoked for ProjectQuery")
    print("[ProjectIntent] getSharedOptions invoked")
    
    guard let sharedDefaults = UserDefaults(suiteName: appGroupName),
          let rawConnections = sharedDefaults.data(forKey: connectionsKey) else {
      projectIntentLogger.error("Missing shared defaults or connections data appGroup=\(appGroupName) key=\(connectionsKey)")
      print("[Intent][Error] Missing shared defaults or connections data appGroup=\(appGroupName) key=\(connectionsKey)")
      
      return options
    }
    
    let connections = (try? JSONDecoder().decode([Connection].self, from: rawConnections)) ?? []
    projectIntentLogger.debug("Decoded connections count=\(connections.count)")
    print("[ProjectIntent] Decoded connections count=\(connections.count)")
    
    for connection in connections {
      do {
        let projectsResponse = try await fetchConnectionProjects(connection: connection)
        let projects = projectsResponse.projects
        projectIntentLogger.debug("Fetched projects count=\(projects.count) for connection id=\(connection.id)")
        print("[ProjectIntent] Fetched projects count=\(projects.count) for connection id=\(connection.id)")
        for project in projects {
          options.append(ProjectListItem(id: project.id, name: project.name, connection: connection))
        }
      } catch {
        projectIntentLogger.error("Error fetching projects for connection id=\(connection.id) error=\(String(describing: error))")
        print("[ProjectIntent][Error] Error fetching projects for connection id=\(connection.id) error=\(String(describing: error))")
        continue
      }
    }
    
    return options
  }
  
  func entities(for identifiers: [ProjectListItem.ID]) async throws -> [ProjectListItem] {
    projectIntentLogger.debug("entities(for:) called identifiers count=\(identifiers.count)")
    print("[ProjectIntent] entities(for:) called identifiers count=\(identifiers.count)")
    return try await getSharedOptions().filter { identifiers.contains($0.id) }
  }
  
  func suggestedEntities() async throws -> [ProjectListItem] {
    projectIntentLogger.debug("suggestedEntities requested")
    print("[ProjectIntent] suggestedEntities requested")
    return try await getSharedOptions()
  }
  
  func defaultResult() async -> ProjectListItem? {
    projectIntentLogger.debug("defaultResult requested")
    print("[ProjectIntent] defaultResult requested")
    return try? await suggestedEntities().first
  }
}


