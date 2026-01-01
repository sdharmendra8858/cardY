/**
 * Screenshot Blocking
 * Implements screenshot detection and blocking per spec 13 security controls
 * 
 * Spec 13: Screenshot blocking during scan/share
 */

import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

/**
 * Screenshot detection callback
 */
export type ScreenshotDetectionCallback = () => void;

/**
 * Hook to detect and handle screenshots
 * Spec 13: Screenshot blocking during sensitive operations
 * 
 * @param onScreenshotDetected Callback when screenshot is detected
 * @returns Cleanup function
 */
export function useScreenshotDetection(
  onScreenshotDetected: ScreenshotDetectionCallback
): () => void {
  const callbackRef = useRef(onScreenshotDetected);

  useEffect(() => {
    callbackRef.current = onScreenshotDetected;
  }, [onScreenshotDetected]);

  useEffect(() => {
    // Note: React Native doesn't provide direct screenshot detection API
    // This is a placeholder for when such functionality becomes available
    // For now, we can detect when app goes to background (which may indicate screenshot)
    
    const subscription = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "background") {
        // App went to background - may indicate screenshot attempt
        // Call the callback to warn user
        callbackRef.current();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return () => {
    // Cleanup
  };
}

/**
 * Hook to prevent screenshots on a screen
 * Spec 13: Screenshot blocking during sensitive operations
 * 
 * Note: This is a placeholder. Actual implementation would require:
 * - expo-screen-capture for iOS
 * - FLAG_SECURE for Android
 * 
 * @returns Cleanup function
 */
export function useScreenshotPrevention(): () => void {
  useEffect(() => {
    // TODO: Implement actual screenshot prevention
    // For iOS: Use expo-screen-capture to disable screenshots
    // For Android: Set FLAG_SECURE on window
    
    console.log("📸 Screenshot prevention enabled (placeholder)");

    return () => {
      console.log("📸 Screenshot prevention disabled");
    };
  }, []);

  return () => {
    // Cleanup
  };
}

/**
 * Show warning when screenshot is detected
 * 
 * @param message Warning message to show
 * @param onDismiss Callback when warning is dismissed
 */
export function showScreenshotWarning(
  message: string = "Screenshots are not allowed during card sharing for security reasons.",
  onDismiss?: () => void
): void {
  console.warn("⚠️ Screenshot detected:", message);
  
  // In a real app, this would show an alert or toast
  // For now, just log the warning
  if (onDismiss) {
    onDismiss();
  }
}

/**
 * Check if screenshot prevention is supported on this platform
 * 
 * @returns true if screenshot prevention is supported
 */
export function isScreenshotPreventionSupported(): boolean {
  // This would check if the required native modules are available
  // For now, return false as a placeholder
  return false;
}
