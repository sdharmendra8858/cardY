import AppTrackingTransparency
import Expo
import React
import ReactAppDependencyProvider

/// Key used to record that the native ATT request has already been presented.
/// This prevents re-asking on every cold launch after the user has decided.
private let kATTRequestedKey = "com.cardywall.att_requested"

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  // Tracks whether we triggered ATT this session to avoid duplicate requests
  // when the app enters the foreground multiple times.
  private var attRequested = false

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // MARK: - ATT — App Tracking Transparency
  //
  // We request ATT here, at the earliest possible native lifecycle point,
  // so that the system dialog appears BEFORE the JS bridge and AdMob SDK
  // initialise. Apple's policy silently defers the dialog if any ad SDK
  // touches the advertising identifier first — triggering it natively here
  // guarantees it is the very first system popup on a fresh install.

  public override func applicationDidBecomeActive(_ application: UIApplication) {
    super.applicationDidBecomeActive(application)
    requestATTIfNeeded()
  }

  private func requestATTIfNeeded() {
    // Only iOS 14+ has ATT; skip on older versions.
    guard #available(iOS 14, *) else { return }

    // Skip if we've already asked during this process lifetime.
    guard !attRequested else { return }

    // Skip if the user has already made a choice in a previous session.
    let alreadyRequested = UserDefaults.standard.bool(forKey: kATTRequestedKey)
    guard !alreadyRequested else { return }

    // Mark as requested for this session immediately to prevent duplicate calls.
    attRequested = true

    // Small delay (0.5 s) so the splash screen is fully visible before the
    // system dialog slides in — keeps the UX clean without blocking anything.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
      ATTrackingManager.requestTrackingAuthorization { status in
        // Persist that we have asked so we never prompt again.
        UserDefaults.standard.set(true, forKey: kATTRequestedKey)

        #if DEBUG
        let statusStr: String
        switch status {
        case .authorized:   statusStr = "authorized"
        case .denied:       statusStr = "denied"
        case .restricted:   statusStr = "restricted"
        case .notDetermined: statusStr = "notDetermined"
        @unknown default:   statusStr = "unknown"
        }
        print("[ATT Native] Tracking authorization status: \(statusStr)")
        #endif
      }
    }
  }

  // MARK: - Linking

  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

