import { ADMOB_CONFIG } from "@/constants/admob";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";
import { ThemedText } from "./themed-text";

interface NativeAdProps {
  style?: any;
}

export default function NativeAd({ style }: NativeAdProps) {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  /**
   * IMPORTANT:
   * - Use Banner / MREC ad unit ONLY
   * - DO NOT use Native Advanced ad unit here
   */
  const adUnitId = __DEV__
    ? TestIds.BANNER
    : ADMOB_CONFIG.bannerAdUnitId; // <-- MUST be Banner/MREC unit

  // Only show ads on Android for now
  if (Platform.OS !== "android" || !adUnitId) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {/* Native-like wrapper */}
      <View
        style={[
          styles.nativeContainer,
          { backgroundColor: palette.card },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText
            style={[
              styles.sponsoredText,
              { color: palette.icon },
            ]}
          >
            Sponsored
          </ThemedText>
        </View>

        {/* Ad */}
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.MEDIUM_RECTANGLE}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdLoaded={() =>
            console.log("MREC ad loaded successfully")
          }
          onAdFailedToLoad={(error) =>
            console.warn("MREC ad failed to load:", error)
          }
        />

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText
            style={[
              styles.disclaimerText,
              { color: palette.icon },
            ]}
          >
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
    alignItems: "center",
  },
  header: {
    alignSelf: "stretch",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  sponsoredText: {
    fontSize: 12,
    opacity: 0.7,
    fontWeight: "500",
  },
  footer: {
    alignSelf: "stretch",
    alignItems: "center",
    marginTop: 8,
  },
  disclaimerText: {
    fontSize: 10,
    opacity: 0.5,
    textAlign: "center",
  },
});