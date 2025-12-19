// AdMob Configuration

import { Platform } from "react-native";

export const ADMOB_CONFIG = {
  // App IDs
  androidAppId: "ca-app-pub-4699580064236799~8493755965",
  iosAppId: "", // Not configured yet

  // Banner Ad Unit IDs
  bannerAdUnitId: Platform.select({
    android: "ca-app-pub-4699580064236799/9812552975",
    ios: "", // Not configured yet
  }),

  // Interstitial Ad Unit IDs
  interstitialAdUnitId: Platform.select({
    android: "ca-app-pub-4699580064236799/5729304904",
    ios: "", // Not configured yet
  }),

  // Native Ad Unit IDs
  nativeAdUnitId: Platform.select({
    android: "ca-app-pub-4699580064236799/2204035009",
    ios: "", // Not configured yet
  }),
};
