// ios/RNCacheModule.swift

import Foundation

@objc(CacheModule)
class RNCacheModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false // File operations can run on background thread
  }

  @objc
  func clearAppCache(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let fileManager = FileManager.default
    
    // Get the Caches directory
    guard let cacheURL = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first else {
      let error = NSError(domain: "com.cardywall.cache", code: 500, userInfo: [NSLocalizedDescriptionKey: "Could not find caches directory"])
      rejecter("CACHE_ERROR", "Could not find caches directory", error)
      return
    }

    print("🧹 [CacheModule] Clearing cache at: \(cacheURL.path)")

    DispatchQueue.global(qos: .utility).async {
      do {
        // Get all files in the cache directory
        let fileURLs = try fileManager.contentsOfDirectory(at: cacheURL, includingPropertiesForKeys: nil, options: [])
        
        for fileURL in fileURLs {
          try fileManager.removeItem(at: fileURL)
          print("   Deleted: \(fileURL.lastPathComponent)")
        }
        
        print("✅ [CacheModule] Cache cleared successfully")
        resolver(true)
      } catch {
        print("❌ [CacheModule] Error clearing cache: \(error.localizedDescription)")
        rejecter("CACHE_ERROR", "Failed to clear cache: \(error.localizedDescription)", error)
      }
    }
  }
}
