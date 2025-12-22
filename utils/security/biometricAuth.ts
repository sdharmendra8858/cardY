/**
 * Biometric Authentication
 * Implements biometric authentication per spec 13 security controls
 * 
 * Spec 13: Biometric auth before sharing
 * 
 * NOTE: expo-local-authentication is optional. If not installed,
 * biometric authentication will be skipped gracefully.
 */

let LocalAuthentication: any = null;

try {
  LocalAuthentication = require("expo-local-authentication");
} catch (e) {
  console.warn("⚠️ expo-local-authentication not installed. Biometric auth will be skipped.");
}

/**
 * Biometric authentication result
 */
export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometryType?: any;
}

/**
 * Check if device supports biometric authentication
 * 
 * @returns true if device supports biometric auth
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (!LocalAuthentication) {
      console.warn("⚠️ expo-local-authentication not available");
      return false;
    }
    const compatible = await LocalAuthentication.hasHardwareAsync();
    return compatible;
  } catch (error) {
    console.error("Error checking biometric availability:", error);
    return false;
  }
}

/**
 * Get available biometric types on device
 * 
 * @returns Array of available biometric types
 */
export async function getAvailableBiometrics(): Promise<any[]> {
  try {
    if (!LocalAuthentication) {
      return [];
    }
    const biometrics = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return biometrics;
  } catch (error) {
    console.error("Error getting available biometrics:", error);
    return [];
  }
}

/**
 * Authenticate user with biometric
 * Spec 13: Biometric auth before sharing
 * 
 * @param reason Reason for authentication (shown to user)
 * @returns BiometricAuthResult with success status
 */
export async function authenticateWithBiometric(
  reason: string = "Authenticate to share card"
): Promise<BiometricAuthResult> {
  try {
    // Check if biometric is available
    if (!LocalAuthentication) {
      console.warn("⚠️ expo-local-authentication not available - skipping biometric auth");
      return {
        success: true, // Allow to proceed without biometric
        error: undefined,
      };
    }

    const available = await isBiometricAvailable();
    if (!available) {
      return {
        success: false,
        error: "Biometric authentication is not available on this device",
      };
    }

    // Get available biometric types
    const biometrics = await getAvailableBiometrics();
    if (biometrics.length === 0) {
      return {
        success: false,
        error: "No biometric authentication methods are enrolled",
      };
    }

    // Attempt biometric authentication
    const result = await LocalAuthentication.authenticateAsync({
      reason: reason,
      fallbackLabel: "Use passcode",
      disableDeviceFallback: false, // Allow PIN/passcode fallback
      requireConfirmation: true, // Require explicit confirmation
    });

    if (result.success) {
      return {
        success: true,
        biometryType: biometrics[0],
      };
    } else {
      return {
        success: false,
        error: result.error || "Biometric authentication failed",
      };
    }
  } catch (error) {
    console.error("Biometric authentication error:", error);
    return {
      success: false,
      error: `Authentication error: ${error}`,
    };
  }
}

/**
 * Check if biometric is enrolled on device
 * 
 * @returns true if at least one biometric is enrolled
 */
export async function isBiometricEnrolled(): Promise<boolean> {
  try {
    if (!LocalAuthentication) {
      return false;
    }
    const biometrics = await getAvailableBiometrics();
    return biometrics.length > 0;
  } catch (error) {
    console.error("Error checking biometric enrollment:", error);
    return false;
  }
}

/**
 * Get biometric type name for display
 * 
 * @param type Biometric type
 * @returns Human-readable biometric type name
 */
export function getBiometricTypeName(type: any): string {
  if (!LocalAuthentication) {
    return "Biometric";
  }

  // Check against LocalAuthentication constants
  const AuthenticationType = LocalAuthentication.AuthenticationType;
  
  if (type === AuthenticationType?.FACIAL_RECOGNITION) {
    return "Face ID";
  }
  if (type === AuthenticationType?.FINGERPRINT) {
    return "Fingerprint";
  }
  if (type === AuthenticationType?.IRIS) {
    return "Iris";
  }
  return "Biometric";
}
