import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from "@react-navigation/native";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-get-random-values";
import "react-native-reanimated";
import Toast from "react-native-toast-message";
import { AppOpenAd, AdEventType, TestIds } from "react-native-google-mobile-ads";
import { ADMOB_CONFIG } from "@/constants/admob";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

import AuthRequired from "@/components/AuthRequired";
import CompromisedDeviceModal from "@/components/CompromisedDeviceModal";
import TermsPopup from "@/components/TermsPopup";
import { Colors } from "@/constants/theme";
import { AlertProvider } from "@/context/AlertContext";
import { TimerProvider } from "@/context/CardContext";
import { CardProviderWithMigration } from "@/context/CardContextWithMigration";
import { CardPinningProvider } from "@/context/CardPinningContext";
import { IDProvider } from "@/context/IDContext";
import { MigrationProvider, useMigration } from "@/context/MigrationContext";
import { SecurityProvider } from "@/context/SecurityContext";
import { ThemeOverrideProvider } from "@/context/ThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authenticateUser } from "@/utils/LockScreen";
import { SECURITY_SETTINGS_KEY } from "@/constants/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import MigrationScreen from "./migration-screen";
import { checkAndResetIgnoreAd, ignoreNextAppOpenAd } from "@/utils/adControl";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

const appOpenAdUnitId = __DEV__ ? TestIds.APP_OPEN : (ADMOB_CONFIG.appOpenAdUnitId || TestIds.APP_OPEN);

const appOpenAd = AppOpenAd.createForAdRequest(appOpenAdUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

function AppShell() {
  // ✅ ALL HOOKS MUST BE CALLED FIRST, BEFORE ANY CONDITIONAL RETURNS
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const adShownRef = useRef(false);
  const lastAdShowTimeRef = useRef(0);
  const tncShownInSessionRef = useRef(false);
  const coldStartAdTriggeredRef = useRef(false); // 🔥 Track if we've handled the cold start ad
  const recoveryProcessedRef = useRef(false); // 🔥 Ensure recovery only runs once per mount
  const [appIsActive, setAppIsActive] = useState(
    AppState.currentState === "active"
  );

  const barStyle = colorScheme === "dark" ? "light" : "dark";
  const barBg =
    colorScheme === "dark" ? Colors.dark.background : Colors.light.background;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setAppIsActive(state === "active");
    });
    setAppIsActive(AppState.currentState === "active");
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const cleanup = async () => {
      try {
        const dir = FileSystem.cacheDirectory;
        if (!dir) return;
        const names = await FileSystem.readDirectoryAsync(dir);
        const now = Date.now();
        const staleMs = 10 * 60 * 1000; // 10 minutes
        const interesting = [
          "ReactNative-snapshot-image",
          "ImageManipulator",
          "Camera"
        ];
        await Promise.all(
          names.map(async (name) => {
            if (!interesting.some((p) => name.includes(p))) return;
            const path = dir + name;
            const info = await FileSystem.getInfoAsync(path);
            if (!info.exists) return;
            const mtime = info.modificationTime ?? 0;
            if (!mtime || now - mtime > staleMs) {
              await FileSystem.deleteAsync(path, { idempotent: true });
            }
          })
        );
      } catch { }
    }
    cleanup();
  }, []);

  // Check Terms on mount
  useEffect(() => {
    AsyncStorage.getItem("terms_accepted").then((val) => {
      const accepted = val === "true";
      setTermsAccepted(accepted);
      if (!accepted) {
        tncShownInSessionRef.current = true;
      }
    });
  }, []);

  // Android Process Death recovery check
  useEffect(() => {
    const checkRecovery = async () => {
      // 1. Only run once per mount to prevent loops
      if (recoveryProcessedRef.current) return;
      recoveryProcessedRef.current = true;

      if (Platform.OS === 'android') {
        try {
          // 2. Check ImagePicker pending results
          const result = await ImagePicker.getPendingResultAsync();
          let shouldRedirect = false;

          if (result) {
            const results = Array.isArray(result) ? result : [result];
            if (results.length > 0 && !results[0].canceled) {
              shouldRedirect = true;
            }
          }

          // 3. Fallback: Check active_flow flag
          const activeFlow = await AsyncStorage.getItem("active_flow");
          if (activeFlow === "add-id") {
             shouldRedirect = true;
          }

          if (shouldRedirect) {
             // 4. CRITICAL: Clear flag IMMEDIATELY before pushing to prevent re-triggering
             await AsyncStorage.removeItem("active_flow").catch(() => {});
             
             // Only push if we are likely at the root/initial state to avoid interrupting other flows
             if (!router.canGoBack() || !router.canDismiss()) {
                router.push("/add-id?recovered=true");
             }
          }
        } catch (e) {
          // Silent fail to prevent crash
        }
      }
    };
    
    checkRecovery();
  }, [router]);

  // Centralized ad trigger to handle COLD START ONLY (per user request)
  useEffect(() => {
    if (authenticated && termsAccepted && !coldStartAdTriggeredRef.current) {
      coldStartAdTriggeredRef.current = true;
      triggerAdAfterUnlock();
    }
  }, [authenticated, termsAccepted]);

  // (Optional) If you want to keep background/foreground ads ONLY for long breaks, 
  // you would add a timestamp check here. But user said "do not load on brief moment".
  // Most intrusive is foregrounding, so we'll stick to cold start for now.

  const triggerAdAfterUnlock = useCallback(async () => {
    // 1. Skip if intentionally suppressed (e.g. coming back from image picker)
    if (await checkAndResetIgnoreAd()) {
      return;
    }

    // 2. Skip if ad already shown recently, terms not accepted, or TnC was shown this session
    if (tncShownInSessionRef.current || termsAccepted !== true) return;
    
    // Cooldown: 15 seconds to avoid spamming
    const now = Date.now();
    if (now - lastAdShowTimeRef.current < 15000) return;

    if (appOpenAd.loaded) {
      appOpenAd.show();
      lastAdShowTimeRef.current = Date.now();
      adShownRef.current = true;
    } else {
      const unsubscribeLoaded = appOpenAd.addAdEventListener(AdEventType.LOADED, () => {
        if (!adShownRef.current) {
          appOpenAd.show();
          adShownRef.current = true;
          lastAdShowTimeRef.current = Date.now();
        }
        cleanup();
      });

      const unsubscribeError = appOpenAd.addAdEventListener(AdEventType.ERROR, () => {
        cleanup();
      });

      const cleanup = () => {
        unsubscribeLoaded();
        unsubscribeError();
      };

      try {
        appOpenAd.load();
      } catch (e) {}
      
      setTimeout(cleanup, 10000);
    }
  }, [termsAccepted]);

  // 🔒 Biometric authentication
  useEffect(() => {
    if (checked) return; // already handled
    if (!appIsActive) return;

    (async () => {
      try {
        // 1. Preload ad in background if terms were previously accepted
        const termsVal = await AsyncStorage.getItem("terms_accepted");
        if (termsVal === "true") {
          appOpenAd.load();
        }

        // 2. Check if App Lock is enabled
        const settingsRaw = await AsyncStorage.getItem(SECURITY_SETTINGS_KEY);
        const settings = settingsRaw ? JSON.parse(settingsRaw) : {};
        const isAppLockEnabled = settings.appLock ?? false;

        if (isAppLockEnabled) {
          const ok = await authenticateUser();
          setAuthenticated(ok);
        } else {
          setAuthenticated(true);
        }
      } catch (err) {
        setAuthenticated(true);
      } finally {
        setChecked(true);
        await SplashScreen.hideAsync();
      }
    })();
  }, [appIsActive, checked]);

  // Trigger ad logic is now handled by the cold start effect above

  // 🔗 Deep linking setup
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const parsed = Linking.parse(url);
      if (parsed.path?.startsWith("card-details/")) {
        const id = parsed.path.split("/")[1];
        router.push({ pathname: "/card-details/[id]", params: { id } });
      }
    };

    const subscription = Linking.addEventListener("url", handleUrl);

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, [router]);

  const handleRetryAuth = async () => {
    try {
      const ok = await authenticateUser();
      setAuthenticated(ok);
      if (ok) {
        triggerAdAfterUnlock();
      } else {
        Toast.show({ type: "error", text1: "Authentication canceled" });
      }
    } catch {
      Toast.show({ type: "error", text1: "Authentication failed" });
    }
  }

  // ✅ NOW IT'S SAFE TO HAVE CONDITIONAL RETURNS - ALL HOOKS HAVE BEEN CALLED
  // 🕓 Show loading or lock screen
  if (!checked) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <StatusBar
          style={barStyle}
          backgroundColor={barBg}
          translucent={false}
          animated
        />
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Unlocking Cardy Wall...</Text>
      </View>
    );
  }

  if (!authenticated) {
    return (
      <>
        <StatusBar
          style={barStyle}
          backgroundColor={barBg}
          translucent={false}
          animated
        />
        <AuthRequired onRetry={handleRetryAuth} />
      </>
    );
  }

  return (
    <NavThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <AlertProvider>
          <SecurityProvider>
            <MigrationProvider>
              <MigrationAwareContent onTermsAccepted={() => setTermsAccepted(true)} />
            </MigrationProvider>
          </SecurityProvider>
        </AlertProvider>
      </SafeAreaProvider>
    </NavThemeProvider>
  );
}

// Separate component to access migration context
function MigrationAwareContent({ onTermsAccepted }: { onTermsAccepted: () => void }) {
  const { needsMigration, cardCount, isReady, handleMigrate, handleFreshSetup, handleComplete } = useMigration();
  const colorScheme = useColorScheme();
  const barStyle = colorScheme === "dark" ? "light" : "dark";
  const barBg =
    colorScheme === "dark" ? Colors.dark.background : Colors.light.background;

  // Show migration screen if needed
  if (needsMigration) {
    return (
      <>
        <StatusBar
          style={barStyle}
          backgroundColor={barBg}
          translucent={false}
          animated
        />
        <MigrationScreen
          cardCount={cardCount}
          onMigrate={handleMigrate}
          onFreshSetup={handleFreshSetup}
          onComplete={handleComplete}
        />
      </>
    );
  }

  // Block rendering until migration check is complete
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <StatusBar
          style={barStyle}
          backgroundColor={barBg}
          translucent={false}
          animated
        />
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Checking card storage...</Text>
      </View>
    );
  }

  return (
    <CardProviderWithMigration>
      <IDProvider>
        <CardPinningProvider>
          <TimerProvider>
            <CompromisedDeviceModal />
            <Stack screenOptions={{ headerShown: false }} />
            <TermsPopup onAccept={onTermsAccepted} />
            <StatusBar
              style={barStyle}
              backgroundColor={barBg}
              translucent={false}
              animated
            />
            <Toast position="bottom" visibilityTime={3000} />
          </TimerProvider>
        </CardPinningProvider>
      </IDProvider>
    </CardProviderWithMigration>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeOverrideProvider>
        <AppShell />
      </ThemeOverrideProvider>
    </GestureHandlerRootView>
  );
}
