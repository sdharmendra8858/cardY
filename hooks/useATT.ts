import { useEffect } from "react";
import { Platform } from "react-native";
import { 
  requestTrackingPermissionsAsync, 
  getTrackingPermissionsAsync 
} from "expo-tracking-transparency";

/**
 * Hook to handle Apple's App Tracking Transparency (ATT) request.
 * Required for iOS apps using AdMob to deliver personalized ads.
 * Only runs on iOS.
 */
export const useATT = () => {
  useEffect(() => {
    if (Platform.OS !== "ios") return;

    (async () => {
      try {
        const { status } = await getTrackingPermissionsAsync();
        
        // Only request if not already determined (undetermined state)
        if (status === "undetermined") {
          // Small delay to ensure any other popups/splash screens are cleared
          setTimeout(async () => {
            const result = await requestTrackingPermissionsAsync();
            if (__DEV__) {
              console.log(`[ATT] Permission status: ${result.status}`);
            }
          }, 1500);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("[ATT] Permission request failed:", error);
        }
      }
    })();
  }, []);
};
