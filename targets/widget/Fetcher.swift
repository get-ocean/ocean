import Foundation
import OSLog

struct NoBody: Encodable {}

enum HTTPMethod: String {
  case GET = "GET"
  case POST = "POST"
  case PUT = "PUT"
  case PATCH = "PATCH"
  case DELETE = "DELETE"
}

struct FetchParams<T: Encodable> {
  let method: HTTPMethod
  let url: String
  let baseUrl: String?
  let connection: Connection
  let body: T?
  
  // if body is needed to be sent, overload init
//  init(method: HTTPMethod, url: String, connection: Connection, body: T, baseUrl: String? = nil) {
//    self.method = method
//    self.url = url
//    self.connection = connection
//    self.body = body
//    self.baseUrl = baseUrl
//    self.apiToken = apiToken
//  }
  
  init(method: HTTPMethod, url: String, connection: Connection, baseUrl: String? = nil) {
    self.method = method
    self.url = url
    self.connection = connection
    self.body = nil
    self.baseUrl = baseUrl
  }
}

private let fetcherLogger = Logger(subsystem: "ocean.widget", category: "Fetcher")

private func fetch<T: Encodable>(params: FetchParams<T>, completion: @escaping (Result<Data, Error>) -> Void) {
  if (!params.url.starts(with: "/")) {
    fetcherLogger.error("InvalidUrl: URL should start with / — provided=\(params.url)")
    print("[Fetcher][Error] InvalidUrl: URL should start with / — provided=\(params.url)")
    return completion(.failure(NSError(domain: "InvalidUrl", code: 0, userInfo: [NSLocalizedDescriptionKey: "URL should start with /"])))
  }
  
  let fullUrlString = params.baseUrl != nil ? "\(params.baseUrl ?? "")\(params.url)" : "https://api.digitalocean.com\(params.url)"
  fetcherLogger.debug("Constructed full URL: \(fullUrlString)")
  print("[Fetcher] Constructed full URL: \(fullUrlString)")
  
  guard let fullUrl = URL(string: fullUrlString) else {
    fetcherLogger.error("InvalidURL: Could not create URL from string: \(fullUrlString)")
    print("[Fetcher][Error] InvalidURL: Could not create URL from string: \(fullUrlString)")
    return completion(.failure(NSError(domain: "InvalidURL", code: 0, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])))
  }
  
  var request = URLRequest(url: fullUrl)
  
  request.httpMethod = params.method.rawValue
  request.addValue("application/json", forHTTPHeaderField: "Accept")
  request.addValue("Bearer \(params.connection.apiToken)", forHTTPHeaderField: "Authorization")
  
  if let data = params.body {
    let jsondata = try? JSONEncoder().encode(data)
    request.httpBody = jsondata
    fetcherLogger.debug("Attached HTTP body bytes=\(jsondata?.count ?? 0)")
    print("[Fetcher] Attached HTTP body bytes=\(jsondata?.count ?? 0)")
  }
  
  let session = URLSession(configuration: .default)
  fetcherLogger.debug("URLSession created with default configuration")
  print("[Fetcher] URLSession created with default configuration")
  
  let task = session.dataTask(with: request) { data, response, error in
    fetcherLogger.debug("dataTask completed error=\(String(describing: error))")
    print("[Fetcher] dataTask completed error=\(String(describing: error))")
    if let error = error {
      fetcherLogger.error("Request failed with error: \(String(describing: error))")
      print("[Fetcher][Error] Request failed with error: \(String(describing: error))")
      completion(.failure(error))
      return
    }
    
    guard let httpResponse = response as? HTTPURLResponse else {
      fetcherLogger.error("InvalidResponse: Response was not HTTPURLResponse")
      print("[Fetcher][Error] InvalidResponse: Response was not HTTPURLResponse")
      return completion(.failure(NSError(domain: "InvalidResponse", code: 0, userInfo: [NSLocalizedDescriptionKey: "Invalid response"])))
    }
    
    fetcherLogger.debug("HTTP status=\(httpResponse.statusCode) headers=\(String(describing: httpResponse.allHeaderFields))")
    print("[Fetcher] HTTP status=\(httpResponse.statusCode) headers=\(String(describing: httpResponse.allHeaderFields))")
    if !(200...299).contains(httpResponse.statusCode) {
      let error = NSError(domain: "HTTPError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP Error: \(httpResponse.statusCode)"])
      
      if let data = data, let errorString = String(data: data, encoding: .utf8) {
        print("Error Response Body: \(errorString)")
        fetcherLogger.error("HTTP error body: \(errorString)")
        print("[Fetcher][Error] HTTP error body: \(errorString)")
      }
      
      fetcherLogger.error("Request failed with HTTP status \(httpResponse.statusCode)")
      print("[Fetcher][Error] Request failed with HTTP status \(httpResponse.statusCode)")
      return completion(.failure(error))
    }
    
    guard let data = data else {
      fetcherLogger.error("NoData: HTTP 2xx but data was nil")
      print("[Fetcher][Error] NoData: HTTP 2xx but data was nil")
      return completion(.failure(NSError(domain: "NoData", code: 0, userInfo: [NSLocalizedDescriptionKey: "No data received"])))
    }
    
    fetcherLogger.debug("Success response bytes=\(data.count)")
    print("[Fetcher] Success response bytes=\(data.count)")
    completion(.success(data))
  }
  
  fetcherLogger.debug("Starting dataTask for \(fullUrlString)")
  print("[Fetcher] Starting dataTask for \(fullUrlString)")
  task.resume()
}

func httpRequest<T: Decodable, K: Encodable>(params: FetchParams<K>) async throws -> T {
  try await withCheckedThrowingContinuation { continuation in
    fetch(params: params) { result in
      switch result {
      case .success(let data):
        do {
          let decoder = JSONDecoder()
          fetcherLogger.debug("Decoding response into \(String(describing: T.self))")
          print("[Fetcher] Decoding response into \(String(describing: T.self))")
          let decodedResult = try decoder.decode(T.self, from: data)
          
          fetcherLogger.debug("Decoded successfully into \(String(describing: T.self))")
          print("[Fetcher] Decoded successfully into \(String(describing: T.self))")
          continuation.resume(returning: decodedResult)
        } catch {
          let preview = String(data: data, encoding: .utf8) ?? "<non-utf8>"
          fetcherLogger.error("Decoding failed for \(String(describing: T.self)) error=\(String(describing: error)) preview=\(preview)")
          print("[Fetcher][Error] Decoding failed for \(String(describing: T.self)) error=\(String(describing: error)) preview=\(preview)")
          continuation.resume(throwing: error)
        }
      case .failure(let error):
        fetcherLogger.error("fetch failed error=\(String(describing: error))")
        print("[Fetcher][Error] fetch failed error=\(String(describing: error))")
        continuation.resume(throwing: error)
      }
    }
  }
}

