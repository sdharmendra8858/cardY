import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Platform } from "react-native";
import * as RNIap from "react-native-iap";
import Toast from "react-native-toast-message";
import { BILLING_STORAGE_KEY, SUBSCRIPTION_SKUS } from "../constants/billing";

interface BillingContextProps {
  isPremium: boolean;
  subscriptions: RNIap.ProductSubscription[];
  loading: boolean;
  requestPurchase: (sku: string) => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const BillingContext = createContext<BillingContextProps | null>(null);

export const BillingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [subscriptions, setSubscriptions] = useState<RNIap.ProductSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync isPremium to AsyncStorage so it can be read instantly on cold start
  const syncPremiumState = async (status: boolean) => {
    setIsPremium(status);
    try {
      await AsyncStorage.setItem(BILLING_STORAGE_KEY, status ? "true" : "false");
    } catch (e) {
      console.error("Error saving premium status to cache:", e);
    }
  };

  const checkCurrentPurchases = async () => {
    try {
      const purchases = await RNIap.getAvailablePurchases();
      if (__DEV__) console.log("Available purchases:", purchases);

      let hasActivePremium = false;

      purchases.forEach(purchase => {
        if (SUBSCRIPTION_SKUS.includes(purchase.productId)) {
          hasActivePremium = true;
        }
      });

      await syncPremiumState(hasActivePremium);
    } catch (err) {
      console.warn("Failed to check available purchases. Offline? Using cached state.", err);
      // On network failure, we deliberately DO NOT overwrite the state to false.
      // We trust the initial cache from AsyncStorage.
    }
  };

  const initializeIAP = async () => {
    try {
      await RNIap.initConnection();
      if (Platform.OS === "android") {
        try {
          // Attempt to flush pending Android purchases
          if ('flushFailedPurchasesCachedAsPendingAndroid' in RNIap) {
            await (RNIap as any).flushFailedPurchasesCachedAsPendingAndroid();
          }
        } catch (e) { }
      }

      await checkCurrentPurchases();

      const products = await RNIap.fetchProducts({ skus: SUBSCRIPTION_SKUS, type: "subs" });
      setSubscriptions(products as RNIap.ProductSubscription[]);
    } catch (err) {
      console.warn("IAP Initialization error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1. Instantly load cached status on mount
    const loadCache = async () => {
      try {
        const cached = await AsyncStorage.getItem(BILLING_STORAGE_KEY);
        if (cached === "true") {
          setIsPremium(true);
        }
      } catch (e) {}
    };
    loadCache();

    // 2. Initialize connection and check real status
    initializeIAP();

    // 3. Setup purchase listeners
    const purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(
      async (purchase: RNIap.Purchase) => {
        try {
          const receipt = (purchase as any).transactionReceipt || purchase.transactionId;
          if (receipt) {
            // In a real app, you'd validate the receipt on a server here.
            // Since this is a local-only app, we just finish the transaction.
            await RNIap.finishTransaction({ purchase, isConsumable: false });
            if (SUBSCRIPTION_SKUS.includes(purchase.productId)) {
              await syncPremiumState(true);
              Toast.show({ type: "success", text1: "Premium Activated!" });
            }
          }
        } catch (error) {
          console.error("Purchase failed to process", error);
        }
      }
    );

    const purchaseErrorSubscription = RNIap.purchaseErrorListener(
      (error: RNIap.PurchaseError) => {
        console.warn("Purchase error", error);
        if (String(error.code) !== "E_USER_CANCELLED") {
          Toast.show({ type: "error", text1: "Purchase Failed", text2: error.message });
        }
      }
    );

    return () => {
      purchaseUpdateSubscription.remove();
      purchaseErrorSubscription.remove();
      RNIap.endConnection();
    };
  }, []);

  const prevPremiumRef = useRef(isPremium);

  useEffect(() => {
    if (prevPremiumRef.current === true && isPremium === false) {
      // Switched from Premium to Free!
      // Reset card and id view quotas in AsyncStorage to 0.
      const resetAllQuotas = async () => {
        try {
          const today = new Date().toISOString().split("T")[0];
          const freshQuota = JSON.stringify({ count: 0, lastDate: today });
          await AsyncStorage.multiSet([
            ["@cardy_view_quota_card", freshQuota],
            ["@cardy_view_quota_id", freshQuota]
          ]);
          if (__DEV__) console.log("🔄 Global Quotas reset to 0 because Premium expired!");
        } catch (e) {
          console.error("Failed to globally reset quotas on premium expiration:", e);
        }
      };
      resetAllQuotas();
    }
    prevPremiumRef.current = isPremium;
  }, [isPremium]);

  const requestPurchase = async (sku: string) => {
    try {
      if (Platform.OS === "ios") {
        await RNIap.requestPurchase({
          request: {
            apple: { sku }
          },
          type: "subs"
        });
      } else {
        const sub = subscriptions.find(s => s.id === sku);
        const offerToken = (sub as any)?.subscriptionOffers?.[0]?.offerTokenAndroid;
        if (!offerToken) {
          throw new Error("Subscription plan or offer token is currently unavailable on Google Play.");
        }
        await RNIap.requestPurchase({
          request: {
            google: {
              skus: [sku],
              subscriptionOffers: [{ sku, offerToken }]
            }
          },
          type: "subs"
        });
      }
    } catch (err: any) {
      console.warn(err.code, err.message);
      if (String(err.code) !== "E_USER_CANCELLED" && String(err.code) !== "E_USER_CANCEL") {
        Toast.show({ type: "error", text1: "Failed to initiate purchase", text2: err.message });
      }
    }
  };

  const restorePurchases = async () => {
    setLoading(true);
    try {
      await RNIap.initConnection();
      await checkCurrentPurchases();
      Toast.show({ type: "success", text1: "Purchases Restored" });
    } catch (err: any) {
      console.warn(err);
      Toast.show({ type: "error", text1: "Failed to restore purchases", text2: "Check your internet connection." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <BillingContext.Provider value={{ isPremium, subscriptions, loading, requestPurchase, restorePurchases }}>
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) throw new Error("useBilling must be used within a BillingProvider");
  return context;
};
