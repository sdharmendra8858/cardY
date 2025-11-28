// ios/YourApp/Modules/RNPipModule.swift
import Foundation
import UIKit

@objc(RNPipModule)
class RNPipModule: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    // This module triggers UI changes (presenting view controllers) so keep on main queue.
    return true
  }

  // Example: open a URL or launch a custom native flow.
  @objc
  func openURL(_ urlString: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let url = URL(string: urlString) else {
      rejecter("invalid_url", "URL is invalid", nil)
      return
    }

    DispatchQueue.main.async {
      if UIApplication.shared.canOpenURL(url) {
        UIApplication.shared.open(url, options: [:]) { success in
          resolver(["success": success])
        }
      } else {
        rejecter("cannot_open", "Cannot open URL", nil)
      }
    }
  }

  // Example: present a simple native view controller in picture-in-picture style or custom modal
  @objc
  func presentNativeScreen(_ title: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      guard let root = UIApplication.shared.keyWindow?.rootViewController else {
        rejecter("no_root", "No root view controller", nil)
        return
      }

      let vc = UIViewController()
      vc.view.backgroundColor = .systemBackground
      vc.title = title

      let nav = UINavigationController(rootViewController: vc)
      nav.modalPresentationStyle = .pageSheet

      root.present(nav, animated: true) {
        resolver(["presented": true])
      }
    }
  }
}