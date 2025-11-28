// TypeScript helper to call the native modules easily.
import { NativeModules, Platform } from "react-native";

const { RNPipModule, RNLockModule, RNCacheModule } = NativeModules as any;

export default {
  openURL: (url: string) => {
    if (Platform.OS === "ios" && RNPipModule && RNPipModule.openURL) {
      return RNPipModule.openURL(url);
    }
    return Promise.reject(new Error("Not available"));
  },

  presentNativeScreen: (title: string) => {
    if (
      Platform.OS === "ios" &&
      RNPipModule &&
      RNPipModule.presentNativeScreen
    ) {
      return RNPipModule.presentNativeScreen(title);
    }
    return Promise.reject(new Error("Not available"));
  },

  isDeviceSecure: () =>
    RNLockModule ? RNLockModule.isDeviceSecure() : Promise.resolve(false),
  authenticate: (reason: string) =>
    RNLockModule
      ? RNLockModule.authenticate(reason)
      : Promise.reject(new Error("Not available")),

  deleteFile: (path: string) =>
    RNCacheModule
      ? RNCacheModule.deleteFile(path)
      : Promise.reject(new Error("Not available")),
  getCacheSize: () =>
    RNCacheModule
      ? RNCacheModule.getCacheSize()
      : Promise.reject(new Error("Not available")),
};
