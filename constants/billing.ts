import { Platform } from "react-native";

export const BILLING_STORAGE_KEY = "@cardy_premium_status";

// Placeholder Product IDs. Replace these with your actual IDs from Google Play / App Store Connect
export const PRODUCT_IDS = {
  MONTHLY: Platform.select({
    ios: 'cardy_premium_monthly_ios',
    android: 'cardy_premium_monthly_android',
  })!,
  HALF_YEARLY: Platform.select({
    ios: 'cardy_premium_half_yearly_ios',
    android: 'cardy_premium_half_yearly_android',
  })!,
};

export const SUBSCRIPTION_SKUS = [PRODUCT_IDS.MONTHLY, PRODUCT_IDS.HALF_YEARLY];
