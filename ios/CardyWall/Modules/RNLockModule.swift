// ios/YourApp/Modules/RNLockModule.swift

import Foundation
import LocalAuthentication

@objc(RNLockModule)
class RNLockModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool { return false }

  // Check if device supports biometric / device owner authentication
  @objc
  func isDeviceSecure(_ resolver: RCTPromiseResolveBlock, rejecter: RCTPromiseRejectBlock) {
    let context = LAContext()
    var error: NSError?
    let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
    if canEvaluate {
      resolver(true)
    } else {
      resolver(false)
    }
  }

  // Perform authentication prompt (Face ID / Touch ID / passcode)
  @objc
  func authenticate(_ reason: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    let context = LAContext()
    context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, authError in
      if success {
        resolver(["authenticated": true])
      } else {
        let code = (authError as NSError?)?.code ?? -1
        rejecter("auth_failed", "Authentication failed (code: \(code))", authError)
      }
    }
  }
}