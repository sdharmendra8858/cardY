import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import 'react-native-reanimated';
import Toast from "react-native-toast-message";

import TermsPopup from "@/components/TermsPopup";
import { AlertProvider } from '@/context/AlertContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 👇 import your Android native lock module wrapper
import { authenticateUser } from '@/utils/LockScreen'; // ← Create this file (shown below)
import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(Platform.OS !== 'android'); // bypass on iOS for now
  const [checked, setChecked] = useState(Platform.OS !== 'android');


  // 🔒 Android system lock authentication
  useEffect(() => {
    if (Platform.OS === 'android') {
      (async () => {
        try {
          const ok = await authenticateUser();
          setAuthenticated(ok);
          setChecked(true);
  
          // hide splash once auth is done (success or fail)
          await SplashScreen.hideAsync();
        } catch (err) {
          await SplashScreen.hideAsync();
        }
      })();
    } else {
      SplashScreen.hideAsync();
    }
  }, []);

  // 🔗 Deep linking setup
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const parsed = Linking.parse(url);
      if (parsed.path?.startsWith('card-details/')) {
        const id = parsed.path.split('/')[1];
        router.push({ pathname: '/card-details/[id]', params: { id } });
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl({ url });
    });

    return () => subscription.remove();
  }, [router]);

  
  // 🕓 Show loading or lock screen
  if (!checked) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Unlocking Cardy...</Text>
      </View>
    );
  }

  if (!authenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Authentication required to continue.</Text>
      </View>
    );
  } 

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <AlertProvider>
          <Stack screenOptions={{headerShown: false}} />
          <TermsPopup />
          {/* <StatusBar style="auto" /> */}
          <Toast position="bottom" visibilityTime={3000} />
        </AlertProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}