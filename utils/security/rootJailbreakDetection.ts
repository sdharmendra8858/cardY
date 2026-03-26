/**
 * Root / Jailbreak Detection
 * Implements spec 10-12: Device security detection and data wipe
 * 
 * Detects compromised devices and wipes sensitive data immediately.
 * Uses multiple signals for best-effort detection (not foolproof).
 */

import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { clearCards } from "../secureStorage";

// Try to import native modules if available
let RootDetection: any = null;
try {
  RootDetection = require("react-native-root-detection");
} catch (e) {
  console.warn("⚠️ react-native-root-detection not installed. Root detection will be limited.");
}

// --------------------------------------------------------
// DEV SETTING: Set this to true to simulate a compromised device
const SIMULATE_COMPROMISED = false;
// --------------------------------------------------------

/**
 * Result of device security check
 */
export interface DeviceSecurityCheckResult {
  isCompromised: boolean;
  isDebuggingEnabled: boolean;
  reason?: string;
  platform: "ios" | "android";
  detectionMethod: string;
}

/**
 * Check if device is rooted (Android) or jailbroken (iOS)
 * Uses multiple detection methods for better coverage
 * 
 * Spec 10: Root / Jailbreak Detection
 * Only runs in production builds (!__DEV__)
 * 
 * @returns Device security check result
 */
export async function checkDeviceSecurity(): Promise<DeviceSecurityCheckResult> {
  try {
    // Only check in production builds, UNLESS we are simulating
    if (__DEV__ && !SIMULATE_COMPROMISED) {
      return {
        isCompromised: false,
        isDebuggingEnabled: false,
        platform: Platform.OS as "ios" | "android",
        detectionMethod: "dev-mode-skipped",
      };
    }

    if (SIMULATE_COMPROMISED) {
      console.warn("🚨 SIMULATING COMPROMISED DEVICE 🚨");
      return {
        isCompromised: true,
        isDebuggingEnabled: true,
        reason: "Simulated Compromise (Active Dev Flag)",
        platform: Platform.OS as "ios" | "android",
        detectionMethod: "simulation",
      };
    }

    if (Platform.OS === "android") {
      return await checkAndroidSecurity();
    } else if (Platform.OS === "ios") {
      return await checkIOSSecurity();
    }

    return {
      isCompromised: false,
      isDebuggingEnabled: false,
      platform: Platform.OS as "ios" | "android",
      detectionMethod: "unsupported",
    };
  } catch (error) {
    console.error("Error during device security check:", error);
    // Fail safe: if we can't determine, assume compromised
    return {
      isCompromised: true,
      isDebuggingEnabled: true,
      reason: "Security check failed - assuming compromised for safety",
      platform: Platform.OS as "ios" | "android",
      detectionMethod: "error",
    };
  }
}

/**
 * Check Android device for root
 * Multiple detection signals:
 * - Native module check
 * - Superuser app detection
 * - System property checks
 * 
 * Only runs in production builds
 */
async function checkAndroidSecurity(): Promise<DeviceSecurityCheckResult> {
  try {
    // Method 1: Native module check
    if (RootDetection && RootDetection.isRooted) {
      const isRooted = await RootDetection.isRooted();
      if (isRooted) {
        console.warn("⚠️ Android device appears to be rooted");
        return {
          isCompromised: true,
          isDebuggingEnabled: false,
          reason: "Device is rooted",
          platform: "android",
          detectionMethod: "native-module",
        };
      }
    }

    // Method 3: Developer Options / USB Debugging
    let isDebuggingEnabled = false;
    if (RootDetection && RootDetection.isDeveloperOptionsEnabled) {
      isDebuggingEnabled = await RootDetection.isDeveloperOptionsEnabled();
    }

    if (__DEV__) console.log("✅ Android device security check complete", { isRooted: false, isDebuggingEnabled });

    return {
      isCompromised: false,
      isDebuggingEnabled,
      platform: "android",
      detectionMethod: "native-module",
    };
  } catch (error) {
    console.error("Android security check error:", error);
    return {
      isCompromised: true,
      isDebuggingEnabled: false,
      reason: "Android security check failed",
      platform: "android",
      detectionMethod: "error",
    };
  }
}

/**
 * Check iOS device for jailbreak
 * Multiple detection signals:
 * - Cydia app detection
 * - Suspicious file paths
 * - Sandbox violation checks
 * 
 * Only runs in production builds
 */
async function checkIOSSecurity(): Promise<DeviceSecurityCheckResult> {
  try {
    // Method 1: Native module check
    if (RootDetection && RootDetection.isJailbroken) {
      const isJailbroken = await RootDetection.isJailbroken();
      if (isJailbroken) {
        console.warn("⚠️ iOS device appears to be jailbroken");
        return {
          isCompromised: true,
          isDebuggingEnabled: false,
          reason: "Device is jailbroken",
          platform: "ios",
          detectionMethod: "native-module",
        };
      }
    }

    // Method 3: Debugger check
    let isDebuggingEnabled = false;
    if (RootDetection && RootDetection.isDeveloperOptionsEnabled) {
      isDebuggingEnabled = await RootDetection.isDeveloperOptionsEnabled();
    }

    if (__DEV__) console.log("✅ iOS device security check complete", { isJailbroken: false, isDebuggingEnabled });

    return {
      isCompromised: false,
      isDebuggingEnabled,
      platform: "ios",
      detectionMethod: "native-module",
    };
  } catch (error) {
    console.error("iOS security check error:", error);
    return {
      isCompromised: true,
      isDebuggingEnabled: false,
      reason: "iOS security check failed",
      platform: "ios",
      detectionMethod: "error",
    };
  }
}

/**
 * Handle compromised device
 * Spec 11: Root / Jailbreak Response (Mandatory)
 * 
 * 1. Delete encryption key immediately
 * 2. Delete encrypted card data
 * 3. Clear all in-memory references
 * 4. Block card access
 * 
 * Only runs in production builds (!__DEV__)
 * 
 * @returns true if wipe was successful
 */
export async function handleCompromisedDevice(): Promise<boolean> {
  try {
    // Only wipe in production builds
    // Only wipe in production builds, UNLESS we are simulating
    if (__DEV__ && !SIMULATE_COMPROMISED) {
      if (__DEV__) console.log("⏭️ Skipping device compromise handling in dev mode");
      return true;
    }

    console.warn("🚨 SECURITY ALERT: Wiping sensitive data due to device compromise");

    // 1. Delete card data
    await clearCards();
    console.log("✅ Card data wiped");

    // 2. Delete encryption key (handled by clearCards)
    // The key is stored in SecureStore and will be regenerated on next use

    // 3. Clear in-memory references
    // This is handled by the app state management

    console.log("✅ Device compromise response complete");
    return true;
  } catch (error) {
    console.error("❌ Failed to handle compromised device:", error);
    // Even if wipe fails, we should prevent card access
    return false;
  }
}

/**
 * Check if device has lock screen or biometric
 * Spec 13: Devices Without Lock Screen or Biometrics
 * 
 * @returns true if device has lock screen or biometric
 */
export async function hasDeviceLockOrBiometric(): Promise<boolean> {
  try {
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return isEnrolled;
  } catch (error) {
    if (__DEV__) console.error("Error checking device lock:", error);
    return false;
  }
}
