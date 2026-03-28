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
  })!,

  // App Open Ad Unit IDs
  appOpenAdUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/2056345179',
    ios: 'ca-app-pub-4699580064236799/6829762118',
  })!,
  interstitialAdUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/4462102146',
    ios: 'ca-app-pub-4699580064236799/1941656209',
  })!,
  receiveCardInterstitialUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/3474942899',
    ios: 'ca-app-pub-4699580064236799/6841540511',
  })!,
  selectCardInterstitialUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/5729304904',
    ios: 'ca-app-pub-4699580064236799/5729304904', // Using same ID for now as per user request if both same
  })!,
  nativeAdUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/3685369677',
    ios: 'ca-app-pub-4699580064236799/8488836551',
  })!,
};
