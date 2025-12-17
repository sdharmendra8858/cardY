import { ADMOB_CONFIG } from "@/constants/admob";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
    BannerAd,
    BannerAdSize,
    TestIds,
    useForeground
} from "react-native-google-mobile-ads";

interface AdBannerProps {
    style?: any;
}

const adUnitId = __DEV__
        ? TestIds.BANNER
        : ADMOB_CONFIG.bannerAdUnitId;

export default function AdBanner({ style }: AdBannerProps) {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];
    const bannerRef = useRef<BannerAd>(null);

    // (iOS) WKWebView can terminate if app is in a "suspended state", resulting in an empty banner when app returns to foreground.
    // Therefore it's advised to "manually" request a new ad when the app is foregrounded.
    useForeground(() => {
        Platform.OS === "ios" && bannerRef.current?.load();
    });

    // Only show banner if we have a valid ad unit ID
    if (!adUnitId) {
        console.warn('AdBanner: No ad unit ID available for platform:', Platform.OS);
        return null;
    }

    return (
        <View
            style={[
                styles.container,
                { backgroundColor: palette.surface, borderTopColor: palette.border },
                style,
            ]}
        >
            <BannerAd
                ref={bannerRef}
                unitId={adUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                onAdLoaded={() => console.log('Banner ad loaded successfully')}
                onAdFailedToLoad={(error) => console.warn('Banner ad failed to load:', error)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
        borderTopWidth: 1,
    },
});
