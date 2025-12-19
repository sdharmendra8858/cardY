// utils/LockScreen.tsx
import { SECURITY_SETTINGS_KEY } from "@/constants/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules } from "react-native";

const { LockModule } = NativeModules;
const STORAGE_KEY = SECURITY_SETTINGS_KEY;

export async function authenticateUser(
  context: "app" | "card" = "app",
  options?: { title?: string; subtitle?: string }
): Promise<boolean> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};

    const appLock = parsed.appLock ?? false;
    const cardLock = parsed.cardLock ?? false;
    const shouldLock = context === "app" ? appLock : cardLock;
    
    if (!shouldLock) {
      return true;
    }

    // Check if module is available
    if (!LockModule) {
      console.error("   ❌ LockModule not found! Available modules:", Object.keys(NativeModules));
      return true; // Fallback to allow access
    }

    // Default titles
    const defaultTitle =
      context === "app" ? "Unlock Cardy Wall" : "Card Access Verification";
    const defaultSubtitle =
      context === "app"
        ? "Authenticate to continue"
        : "Authenticate to view sensitive card details";

    const title = options?.title ?? defaultTitle;
    const subtitle = options?.subtitle ?? defaultSubtitle;

    try {
      const result = typeof LockModule.authenticateUserWithMessage === "function"
        ? await LockModule.authenticateUserWithMessage(title, subtitle)
        : await LockModule.authenticateUser();
      
      return result;
    } catch (error) {
      console.error("   ❌ Authentication error:", error);
      return false;
    }
  } catch (err) {
    console.error("❌ [LockScreen] Unexpected error:", err);
    return false;
  }
}
