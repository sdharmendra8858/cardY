// utils/LockScreen.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

const { LockModule } = NativeModules;
const STORAGE_KEY = "@cardy_wall_settings";

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
    if (!shouldLock) return true;

    // Default titles
    const defaultTitle =
      context === "app" ? "Unlock Cardy Wall" : "Card Access Verification";
    const defaultSubtitle =
      context === "app"
        ? "Authenticate to continue"
        : "Authenticate to view sensitive card details";

    const title = options?.title ?? defaultTitle;
    const subtitle = options?.subtitle ?? defaultSubtitle;

    if (Platform.OS === "android" && LockModule) {
      const result =
        typeof LockModule.authenticateUserWithMessage === "function"
          ? await LockModule.authenticateUserWithMessage(title, subtitle)
          : await LockModule.authenticateUser();
      return result;
    }

    // fallback (e.g., iOS)
    return true;
  } catch (err) {
    console.warn("LockScreen error:", err);
    return false;
  }
}
