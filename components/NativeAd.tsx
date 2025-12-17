import { ADMOB_CONFIG } from "@/constants/admob";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import { ThemedText } from "./themed-text";

interface NativeAdProps {
  style?: any;
}

export default function NativeAd({ style }: NativeAdProps) {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  // Use test ID for development, production ID for production
  // For now, use the banner ad unit since native advanced is complex to implement
  const adUnitId = __DEV__
    ? TestIds.BANNER
    : ADMOB_CONFIG.nativeAdUnitId || ADMOB_CONFIG.bannerAdUnitId;

  console.log("NativeAd: Platform:", Platform.OS, "AdUnitId:", adUnitId, "IsDev:", __DEV__);

  // Only show on Android for now until iOS is configured
  if (Platform.OS === "ios" || !adUnitId) {
    console.log("NativeAd: Hidden - iOS or no ad unit ID");
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Custom styled banner ad as native-like experience */}
      <View style={[styles.nativeContainer, { backgroundColor: palette.card }]}>
        <View style={styles.header}>
          <ThemedText style={[styles.sponsoredText, { color: palette.icon }]}>
            Sponsored
          </ThemedText>
        </View>

        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.MEDIUM_RECTANGLE}
          onAdLoaded={() => console.log("Native-style ad loaded successfully")}
          onAdFailedToLoad={(error: any) => console.warn("Native-style ad failed to load:", error)}
        />

        <View style={styles.footer}>
          <ThemedText style={[styles.disclaimerText, { color: palette.icon }]}>
            Ad content provided by advertisers
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
  nativeContainer: {
    borderRadius: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
  },
  header: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  sponsoredText: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: '500',
  },
  footer: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 10,
    opacity: 0.5,
    textAlign: 'center',
  },
});
