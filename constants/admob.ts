// AdMob Configuration

import { Platform } from "react-native";

export const ADMOB_CONFIG = {
  // App IDs
  androidAppId: "ca-app-pub-4699580064236799~8493755965",
  iosAppId: "ca-app-pub-4699580064236799~6045744843",

  // Banner Ad Unit IDs
  bannerAdUnitId: Platform.select({
    android: "ca-app-pub-4699580064236799/9812552975",
    ios: "ca-app-pub-4699580064236799/9798990316",
  }),

  // Interstitial Ad Unit IDs
  interstitialAdUnitId: Platform.select({
    android: "ca-app-pub-4699580064236799/5729304904",
    ios: "ca-app-pub-4699580064236799/5364921287",
  }),

  // Native Ad Unit IDs
  nativeAdUnitId: Platform.select({
    android: "ca-app-pub-4699580064236799/2204035009",
    ios: "ca-app-pub-4699580064236799/6752321859",
  }),

  // App Open Ad Unit IDs (Using test IDs for now)
  appOpenAdUnitId: Platform.select({
    android: "ca-app-pub-4699580064236799/6524123549",
    ios: "ca-app-pub-4699580064236799/2640718857",
  }),

  // Rewarded Ad Unit IDs (Using test IDs for now)
  rewardedAdUnitId: Platform.select({
    android: "ca-app-pub-4699580064236799/3355034726",
    ios: "ca-app-pub-4699580064236799/3897960205",
  }),
};
