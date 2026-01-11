/**
 * Security Utilities Module - Central export point
 * Aggregates all security-related utilities
 * 
 * Spec 13: Mandatory Security Controls
 */

export {
    authenticateWithBiometric,
    getAvailableBiometrics,
    getBiometricTypeName,
    isBiometricAvailable,
    isBiometricEnrolled,
    type BiometricAuthResult
} from "./biometricAuth";

export {
    isScreenshotPreventionSupported,
    showScreenshotWarning,
    useScreenshotDetection,
    useScreenshotPrevention,
    type ScreenshotDetectionCallback
} from "./screenshotBlocking";

export {
    SecureDataContainer,
    withMemoryZeroing,
    withMemoryZeroingSync,
    zeroObjectProperties,
    zeroString,
    zeroUint8Array
} from "./memoryZeroing";

export {
    checkDeviceSecurity,
    handleCompromisedDevice,
    hasDeviceLockOrBiometric,
    type DeviceSecurityCheckResult
} from "./rootJailbreakDetection";
