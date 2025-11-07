// utils/LockScreen.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

const { LockModule } = NativeModules;
const STORAGE_KEY = "@cardy_wall_settings";

export async function authenticateUser(
  context: "app" | "card" = "app"
): Promise<boolean> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    const appLock = parsed.appLock ?? false;
    const cardLock = parsed.cardLock ?? false;

    const shouldLock = context === "app" ? appLock : cardLock;
    if (!shouldLock) return true;

    // 🧠 Custom message depending on context
    const title =
      context === "app" ? "Unlock Cardy Wall" : "Card Access Verification";
    const subtitle =
      context === "app"
        ? "Authenticate to continue"
        : "Authenticate to view sensitive card details";

    if (Platform.OS === "android" && LockModule) {
      if (typeof LockModule.authenticateUserWithMessage === "function") {
        return await LockModule.authenticateUserWithMessage(title, subtitle);
      } else {
        return await LockModule.authenticateUser();
      }
    }

    // iOS fallback (you can add expo-local-authentication later)
    return true;
  } catch (err) {
    console.warn("LockScreen error:", err);
    return false;
  }
}
