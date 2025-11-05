import Foundation
import AppIntents
import OSLog

struct DropletListItem: AppEntity, Decodable {
  static var defaultQuery = DropletQuery()
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Select Droplet"
  
  var displayRepresentation: DisplayRepresentation {
    DisplayRepresentation(title: "\(name)") // same "name" from below
  }
  
  let id: String
  let name: String
  let connection: Connection
}

private let intentLogger = Logger(subsystem: "ocean.widget", category: "IntentSettings")

struct DropletQuery: EntityQuery {
  func getSharedOptions() async throws -> [DropletListItem] {
    var options: [DropletListItem] = []
    
    intentLogger.debug("getSharedOptions invoked")
    print("[Intent] getSharedOptions invoked")
    
     guard let sharedDefaults = UserDefaults(suiteName: appGroupName),
          let rawConnections = sharedDefaults.data(forKey: connectionsKey) else {
      intentLogger.error("Missing shared defaults or connections data appGroup=\(appGroupName) key=\(connectionsKey)")
      print("[Intent][Error] Missing shared defaults or connections data appGroup=\(appGroupName) key=\(connectionsKey)")
      
      return options
    }
    
    let connections = (try? JSONDecoder().decode([Connection].self, from: rawConnections)) ?? []
    intentLogger.debug("Decoded connections count=\(connections.count)")
    print("[Intent] Decoded connections count=\(connections.count)")
    
    for connection in connections {
      intentLogger.debug("Fetching accounts for connection id=\(connection.id)")
      print("[Intent] Fetching accounts for connection id=\(connection.id)")
      do {
        let connectionProjects = try await fetchConnectionProjects(connection: connection)
        let projects = connectionProjects.projects
        intentLogger.debug("Fetched connectionProjects count=\(projects.count) for connection id=\(connection.id)")
        print("[Intent] Fetched connectionProjects count=\(projects.count) for connection id=\(connection.id)")
        
        for project in projects {
          intentLogger.debug("Fetching resources for project id=\(project.id)")
          print("[Intent] Fetching resources for project id=\(project.id)")
          
          let projectResources = try await fetchProjectResources(connection: connection, projectId: project.id)
          let resources = projectResources.resources
          
          intentLogger.debug("Fetched resources count=\(resources.count) for project id=\(project.id)")
          print("[Intent] Fetched resources count=\(resources.count) for project id=\(project.id)")
		  
          let dropletResources = resources.filter { resource in
            return isDropletUrn(resource.urn)
          }
          intentLogger.debug("Filtered droplet URNs count=\(dropletResources.count) for project id=\(project.id)")
          print("[Intent] Filtered droplet URNs count=\(dropletResources.count) for project id=\(project.id)")

          let dropletIds: [String] = dropletResources.compactMap { res in
            getDropletId(urn: res.urn)
          }
          let droplets = await fetchDropletsSkipFailures(connection: connection, dropletIds: dropletIds)
          for droplet in droplets {
            options.append(
              DropletListItem(
                id: droplet.id,
                name: droplet.name,
                connection: connection
              )
            )
            intentLogger.debug("Appended droplet option id=\(droplet.id) name=\(droplet.name)")
            print("[Intent] Appended droplet option id=\(droplet.id) name=\(droplet.name)")
          }
          intentLogger.debug("Aggregated options so far count=\(options.count)")
          print("[Intent] Aggregated options so far count=\(options.count)")
        }
      } catch {
        intentLogger.error("Error during fetching accounts/sites for connection id=\(connection.id) error=\(String(describing: error))")
        print("[Intent][Error] Error during fetching accounts/sites for connection id=\(connection.id) error=\(String(describing: error))")
        
        return options
      }
    }
    
    return options
  }
  
  func entities(for identifiers: [DropletListItem.ID]) async throws -> [DropletListItem] {
    intentLogger.debug("entities(for:) called identifiers count=\(identifiers.count)")
    print("[Intent] entities(for:) called identifiers count=\(identifiers.count)")
    return try await getSharedOptions().filter { identifiers.contains($0.id) }
  }
  
  func suggestedEntities() async throws -> [DropletListItem] {
    intentLogger.debug("suggestedEntities requested")
    print("[Intent] suggestedEntities requested")
    return try await getSharedOptions()
  }
  
  func defaultResult() async -> DropletListItem? {
    intentLogger.debug("defaultResult requested")
    print("[Intent] defaultResult requested")
    return try? await suggestedEntities().first
  }
}
