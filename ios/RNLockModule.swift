// ios/RNLockModule.swift

import Foundation
import LocalAuthentication

@objc(LockModule)
class RNLockModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true  // Run on main queue for UI operations
  }

  // Check if device supports biometric / device owner authentication
  @objc
  func isDeviceSecure(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      let context = LAContext()
      var error: NSError?
      let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)

      if canEvaluate {
        print("✅ [LockModule] Device is secure (biometric/passcode available)")
        resolver(true)
      } else {
        print("⚠️ [LockModule] Device is NOT secure: \(error?.localizedDescription ?? "unknown")")
        resolver(false)
      }
    }
  }

  // Default authentication (for backward compatibility)
  @objc
  func authenticateUser(_ resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    print("🔒 [LockModule] authenticateUser() called")
    authenticateUserWithMessage("Unlock Cardy Wall", subtitle: "Authenticate to continue", resolver: resolver, rejecter: rejecter)
  }

  // Customizable authentication prompt (matching Android)
  @objc
  func authenticateUserWithMessage(_ title: String, subtitle: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    print("🔒 [LockModule] authenticateUserWithMessage() called")
    print("   Title: \(title)")
    print("   Subtitle: \(subtitle)")

    DispatchQueue.main.async {
      let context = LAContext()
      context.localizedCancelTitle = "Cancel"

      // Check if device has authentication available
      var error: NSError?
      guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
        print("⚠️ [LockModule] Device authentication not available: \(error?.localizedDescription ?? "unknown")")
        // If no device lock is set, allow access (matching Android behavior)
        resolver(true)
        return
      }

      let reason = "\(title)\n\(subtitle)"
      print("🔐 [LockModule] Showing authentication prompt...")

      context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, authError in
        DispatchQueue.main.async {
          if success {
            print("✅ [LockModule] Authentication successful")
            resolver(true)  // Return boolean true, not dictionary
          } else {
            let code = (authError as NSError?)?.code ?? -1
            let errorMessage = authError?.localizedDescription ?? "Unknown error"
            print("❌ [LockModule] Authentication failed: \(errorMessage) (code: \(code))")

            // User cancelled or failed authentication
            if code == LAError.userCancel.rawValue || code == LAError.userFallback.rawValue {
              print("   User cancelled authentication")
              resolver(false)  // Return false for cancellation
            } else {
              resolver(false)  // Return false for any failure
            }
          }
        }
      }
    }
  }

  // Legacy authenticate method (for backward compatibility)
  @objc
  func authenticate(_ reason: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    print("🔒 [LockModule] authenticate() called with reason: \(reason)")

    DispatchQueue.main.async {
      let context = LAContext()

      var error: NSError?
      guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
        print("⚠️ [LockModule] Device authentication not available")
        resolver(true)  // No device lock set
        return
      }

      print("🔐 [LockModule] Showing authentication prompt...")
      context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, authError in
        DispatchQueue.main.async {
          if success {
            print("✅ [LockModule] Authentication successful")
            resolver(true)
          } else {
            let code = (authError as NSError?)?.code ?? -1
            print("❌ [LockModule] Authentication failed (code: \(code))")
            resolver(false)
          }
        }
      }
    }
  }
}
