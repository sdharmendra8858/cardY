// ios/YourApp/Modules/RNCacheModule.swift

import Foundation

@objc(RNCacheModule)
class RNCacheModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { return false }

  // Delete file at given path (relative to app's sandbox) - resolve with true/false
  @objc
  func deleteFile(_ path: String, resolver: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
    let fm = FileManager.default
    // Allow both absolute and relative paths; if relative, assume caches directory
    var fileURL: URL
    if path.hasPrefix("/") {
      fileURL = URL(fileURLWithPath: path)
    } else {
      let caches = fm.urls(for: .cachesDirectory, in: .userDomainMask).first!
      fileURL = caches.appendingPathComponent(path)
    }

    do {
      try fm.removeItem(at: fileURL)
      resolver(true)
    } catch {
      rejecter("delete_failed", "Failed to delete file: \(error.localizedDescription)", error)
    }
  }

  // Get size of caches folder (bytes)
  @objc
  func getCacheSize(_ resolver: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
    DispatchQueue.global(qos: .background).async {
      let fm = FileManager.default
      let caches = fm.urls(for: .cachesDirectory, in: .userDomainMask).first!
      var total: Int64 = 0
      if let enumerator = fm.enumerator(at: caches, includingPropertiesForKeys: [.fileSizeKey], options: [], errorHandler: nil) {
        for case let fileURL as URL in enumerator {
          if let attr = try? fileURL.resourceValues(forKeys:[.fileSizeKey]), let size = attr.fileSize {
            total += Int64(size)
          }
        }
      }
      resolver(["size": total])
    }
  }
}