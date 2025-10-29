import { NativeModules, Platform } from "react-native";
const { LockModule } = NativeModules;

export async function authenticateUser(): Promise<boolean> {
  if (Platform.OS !== "android" || !LockModule) return true; // iOS fallback
  try {
    const result = await LockModule.authenticateUser();
    return result;
  } catch (error) {
    console.warn("Lock failed:", error);
    return false;
  }
}
