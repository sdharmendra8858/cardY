import { Platform } from "react-native";
import { getTrackingPermissionsAsync } from "expo-tracking-transparency";

/**
 * ATT is now requested at the NATIVE level in AppDelegate.swift using
 * ATTrackingManager.requestTrackingAuthorization. This fires before the
 * React Native JS bridge initialises, guaranteeing it is the very first
 * system popup on a fresh install — and before AdMob can touch the IDFA.
 *
 * This JS module now only exposes status helpers so the rest of the app
 * can react to the resolved permission.
 */

/**
 * Polls the ATT status every 300 ms until it is no longer "undetermined"
 * (i.e. the native dialog has been dismissed) or the timeout is reached.
 *
 * Use this to sequence permission dialogs — e.g. wait for ATT to resolve
 * before showing the notification permission prompt.
 *
 * @param timeoutMs  Maximum wait in milliseconds (default: 15 000)
 * @returns          The final resolved status string, or null on Android.
 */
export const waitForATTResolved = (timeoutMs = 15000): Promise<string | null> => {
  if (Platform.OS !== "ios") return Promise.resolve(null);

  return new Promise((resolve) => {
    const interval = 300; // poll every 300 ms
    let elapsed = 0;

    const poll = async () => {
      try {
        const { status } = await getTrackingPermissionsAsync();

        if (status !== "undetermined" || elapsed >= timeoutMs) {
          if (__DEV__) console.log(`[ATT] Resolved after ${elapsed}ms — status: ${status}`);
          resolve(status);
          return;
        }
      } catch {
        resolve(null);
        return;
      }

      elapsed += interval;
      setTimeout(poll, interval);
    };

    poll();
  });
};


/**
 * Returns the current ATT permission status without prompting.
 * Use this AFTER the app has launched to decide on ad personalisation.
 *
 * Possible values: "authorized" | "denied" | "restricted" | "undetermined"
 * Returns null on Android (ATT is iOS-only).
 */
export const getATTStatus = async (): Promise<string | null> => {
  if (Platform.OS !== "ios") return null;

  try {
    const { status } = await getTrackingPermissionsAsync();
    if (__DEV__) {
      console.log(`[ATT] Current status: ${status}`);
    }
    return status;
  } catch (error) {
    if (__DEV__) {
      console.warn("[ATT] Could not read status:", error);
    }
    return null;
  }
};

/**
 * @deprecated No-op. ATT is now requested natively in AppDelegate.swift.
 * Kept for import compatibility — safe to remove callers over time.
 */
export const requestATT = async (): Promise<string | null> => {
  // The native layer has already requested ATT before JS loaded.
  // Just return the current resolved status.
  return getATTStatus();
};

/**
 * @deprecated No-op hook. ATT is now requested natively in AppDelegate.swift.
 * Kept for import compatibility — safe to remove callers over time.
 */
export const useATT = () => {
  // Nothing to do here — the native AppDelegate handles the dialog.
};
