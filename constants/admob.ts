// AdMob Configuration

import { Platform } from "react-native";

export const ADMOB_CONFIG = {
  // App IDs
  androidAppId: "ca-app-pub-4699580064236799~8493755965",
  iosAppId: "ca-app-pub-4699580064236799~6045744843",

  // App Open Ad Unit IDs
  appOpenAdUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/6524123549',
    ios: 'ca-app-pub-4699580064236799/2640718857',
  })!,
  interstitialAdUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/3624585311',
    ios: 'ca-app-pub-4699580064236799/1438877856',
  })!,
  receiveCardInterstitialUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/6851414266',
    ios: 'ca-app-pub-4699580064236799/8164495930',
  })!,
  selectCardInterstitialUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/5538332598',
    ios: 'ca-app-pub-4699580064236799/1221853060',
  })!,
  nativeAdUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/2204035009',
    ios: 'ca-app-pub-4699580064236799/6752321859',
  })!,
  // Separate units for specific flows (Update these once new IDs are created in AdMob)
  addIdInterstitialUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/4120881510',
    ios: 'ca-app-pub-4699580064236799/9477577608', 
  })!,
  addCardInterstitialUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/9998421974',
    ios: 'ca-app-pub-4699580064236799/2311503644', 
  })!,
  downloadIdInterstitialUnitId: Platform.select({
    android: 'ca-app-pub-4699580064236799/8717199704',
    ios: 'ca-app-pub-4699580064236799/2720597561', 
  })!,
};
