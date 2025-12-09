import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavThemeProvider,
} from "@react-navigation/native";
import * as Linking from "expo-linking";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, Text, View } from "react-native";
import "react-native-reanimated";
import Toast from "react-native-toast-message";

import TermsPopup from "@/components/TermsPopup";
import { AlertProvider } from "@/context/AlertContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SafeAreaProvider } from "react-native-safe-area-context";

// 👇 import your Android native lock module wrapper
import AuthRequired from "@/components/AuthRequired";
import { Colors } from "@/constants/theme";
import { ThemeOverrideProvider } from "@/context/ThemeContext";
import { authenticateUser } from "@/utils/LockScreen"; // ← Create this file (shown below)
import * as FileSystem from "expo-file-system/legacy";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

function AppShell() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);
  const barStyle = colorScheme === "dark" ? "light" : "dark";
  const barBg =
    colorScheme === "dark" ? Colors.dark.background : Colors.light.background;
  const [appIsActive, setAppIsActive] = useState(
    AppState.currentState === "active"
  );

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
  }, []);

  // 🔒 Biometric authentication for both Android and iOS
  useEffect(() => {
    if (checked) return; // already handled
    if (!appIsActive) return;

    (async () => {
      try {
        const ok = await authenticateUser();
        setAuthenticated(ok);
      } finally {
        setChecked(true);
        await SplashScreen.hideAsync();
      }
    })();
  }, [appIsActive, checked]);


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
      if (!ok) {
        Toast.show({ type: "error", text1: "Authentication canceled" });
      }
    } catch {
      Toast.show({ type: "error", text1: "Authentication failed" });
    }
  }

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
          <Stack screenOptions={{ headerShown: false }} />
          <TermsPopup />
          <StatusBar
            style={barStyle}
            backgroundColor={barBg}
            translucent={false}
            animated
          />
          <Toast position="bottom" visibilityTime={3000} />
        </AlertProvider>
      </SafeAreaProvider>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeOverrideProvider>
      <AppShell />
    </ThemeOverrideProvider>
  );
}
