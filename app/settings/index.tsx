import NativeAd from "@/components/AdNative";
import Hero from "@/components/Hero";
import { useAlert } from "@/context/AlertContext";
import { clearCards } from "@/utils/secureStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/themed-text";
import { SECURITY_SETTINGS_KEY } from "@/constants/storage";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authenticateUser } from "@/utils/LockScreen";
import Slider from "@react-native-community/slider";
import Constants from "expo-constants";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  NativeModules,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const { CacheModule } = NativeModules;

export default function SettingsScreen() {
  const { showAlert } = useAlert();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];


  // persistent state
  const [appLock, setAppLock] = useState(false);
  const [cardLock, setCardLock] = useState(false);
  const [cooldown, setCooldown] = useState(3);

  const fadeAnim = useRef(new Animated.Value(cardLock ? 1 : 0)).current;

  const STORAGE_KEY = SECURITY_SETTINGS_KEY;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: cardLock ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [cardLock, fadeAnim]);

  // Load saved settings on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);

          // Apply stored values (fallback to false)
          setAppLock(parsed.appLock ?? false);
          setCardLock(parsed.cardLock ?? false);
          setCooldown(parsed.cooldown ?? 3);
        } else {
          // Initialize storage with defaults
          const defaults = { appLock: false, cardLock: false, cooldown: 3 };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
          // Ensure state matches defaults
          setAppLock(false);
          setCardLock(false);
          setCooldown(3);
        }
      } catch (e) {
        console.error("Error loading settings:", e);
      }
    };
    loadSettings();
  }, []);

  // Save settings whenever changed
  const saveSettings = async (updated: {
    appLock?: boolean;
    cardLock?: boolean;
    cooldown?: number;
  }) => {
    try {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = current ? JSON.parse(current) : {};
      const merged = { appLock: false, cardLock: false, cooldown: 3, ...parsed, ...updated }; // default true baseline
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  };

  const handleAppLockToggle = async (value: boolean) => {
    if (!value) {
      const verified = await authenticateUser("app", {
        title: "Confirm App Lock Change",
        subtitle: "Authenticate to disable App Lock for Cardy Wall",
      });
      if (!verified) {
        Toast.show({
          type: "error",
          text1: "Authentication Failed",
          text2: "App Lock remains enabled for your safety.",
        });
        return;
      }
    }

    setAppLock(value);
    saveSettings({ appLock: value });
    Toast.show({
      type: "success",
      text1: value ? "App Lock Enabled" : "App Lock Disabled",
    });
  };

  const handleCardLockToggle = async (value: boolean) => {
    if (!value) {
      const verified = await authenticateUser("card", {
        title: "Disable Card Lock",
        subtitle: "Authenticate to disable card verification",
      });
      if (!verified) {
        Toast.show({
          type: "error",
          text1: "Authentication Failed",
          text2: "Card Lock remains active.",
        });
        return;
      }
    }

    setCardLock(value);
    saveSettings({ cardLock: value });
    Toast.show({
      type: "success",
      text1: value ? "Card Lock Enabled" : "Card Lock Disabled",
    });
  };

  // ---- Clear data handlers ----
  const handleClearCards = () => {
    showAlert({
      title: "Clear All Cards",
      message:
        "This will permanently delete all saved cards from your device. Are you sure?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await clearCards();
              Toast.show({
                type: "success",
                text1: "All cards cleared securely",
              });
            } catch (error) {
              console.error("Error clearing cards:", error);
              Toast.show({
                type: "error",
                text1: "Something went wrong while clearing cards.",
              });
            }
          },
        },
      ],
    });
  };

  const handleClearCache = async () => {
    try {
      console.log("🧹 Clearing system cache via CacheModule...");
      await CacheModule.clearAppCache();
      Toast.show({
        type: "success",
        text1: "Cache Cleared",
        text2: "System cache successfully removed.",
      });
    } catch (err) {
      console.error("❌ Failed to clear cache:", err);
      Toast.show({
        type: "error",
        text1: "Failed to Clear Cache",
        text2: "An error occurred while clearing system cache.",
      });
    }
  };

  // const handleClearCache = () => {
  //   Toast.show({
  //     type: "info",
  //     text1: "Cache Cleared",
  //     text2: "Temporary data has been removed.",
  //   });
  // };



  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: cardLock ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [cardLock, fadeAnim]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Hero
        title="Settings"
        subtitle="Manage privacy, security, and preferences"
        showBackButton={true}
      />
      <View style={[styles.container, { backgroundColor: palette.surface }]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header removed; handled by Hero */}

          {/* Section: Security */}
          <View style={[styles.card, { backgroundColor: palette.card }]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Security
            </ThemedText>
            <View style={styles.row}>
              <ThemedText style={styles.label}>Enable App Lock</ThemedText>
              <Switch value={appLock} onValueChange={handleAppLockToggle} />
            </View>
            {/* 🆕 New: Card Lock */}
            <View style={styles.row}>
              <ThemedText style={styles.label}>
                Require Auth to View Cards
              </ThemedText>
              <Switch value={cardLock} onValueChange={handleCardLockToggle} />
            </View>

            <Animated.View style={{ opacity: fadeAnim }}>
              {cardLock && (
                <View
                  style={{
                    marginTop: 14,
                    paddingHorizontal: 4,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: scheme === "dark" ? "#333" : "#ddd",
                    paddingTop: 10,
                  }}
                >
                  <ThemedText
                    type="defaultSemiBold"
                    style={[
                      styles.sectionTitle,
                      { marginBottom: 6, paddingLeft: 2, opacity: 0.9 },
                    ]}
                  >
                    Card View Cooldown ({cooldown}s)
                  </ThemedText>

                  <View
                    style={{
                      paddingHorizontal: 6,
                      justifyContent: "center",
                      alignItems: "stretch",
                    }}
                  >
                    <Slider
                      style={{
                        width: "100%",
                        height: 40,
                        alignSelf: "center",
                      }}
                      value={cooldown}
                      minimumValue={0}
                      maximumValue={10}
                      step={1}
                      minimumTrackTintColor={palette.tint}
                      maximumTrackTintColor={
                        scheme === "dark" ? "rgba(255,255,255,0.2)" : "#ccc"
                      }
                      thumbTintColor={palette.tint}
                      onValueChange={(val: number) => {
                        setCooldown(val);
                        saveSettings({ cooldown: val });
                      }}
                    />

                    {/* Labels */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginTop: -2,
                        paddingHorizontal: 2,
                      }}
                    >
                      <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>0s</ThemedText>
                      <ThemedText
                        type="defaultSemiBold"
                        style={{
                          fontSize: 13,
                          color: palette.tint,
                          fontWeight: "600",
                        }}
                      >
                        {cooldown}s
                      </ThemedText>
                      <ThemedText style={{ fontSize: 12, opacity: 0.6 }}>10s</ThemedText>
                    </View>

                    <ThemedText
                      style={{
                        fontSize: 12,
                        marginTop: 6,
                        opacity: 0.6,
                        textAlign: "center",
                        lineHeight: 16,
                      }}
                    >
                      Adjust how long authentication stays valid after viewing a card
                    </ThemedText>
                  </View>
                </View>
              )}
            </Animated.View>
          </View>

          {/* Section: Data Management */}
          <View style={[styles.card, { backgroundColor: palette.card }]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Data Management
            </ThemedText>

            <TouchableOpacity
              onPress={handleClearCards}
              style={styles.touchRow}
            >
              <ThemedText style={styles.label}>
                Clear All Saved Cards
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClearCache}
              style={styles.touchRow}
            >
              <ThemedText style={styles.label}>Clear Cache</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Section: General */}
          <View style={[styles.card, { backgroundColor: palette.card }]}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              General
            </ThemedText>

            <TouchableOpacity
              onPress={async () => {
                try {
                  await Share.share({
                    message:
                      "Check out Cardy Wall! Securely manage your cards and view them in PiP. Download now: https://play.google.com/store/apps/details?id=com.redonelabs.cardywall",
                  });
                } catch (error) {
                  console.error("Error sharing app:", error);
                }
              }}
              style={styles.touchRow}
            >
              <ThemedText style={styles.label}>Share App</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <ThemedText style={styles.version}>
              Version {Constants.expoConfig?.version ?? "1.0.0"}
            </ThemedText>
          </View>

          {/* Native Ad Section - Below Version Info */}
          <View style={styles.adSection}>
            <NativeAd />
          </View>

          {/* Future Ad Section */}
          {/* 
          <View style={styles.adContainer}>
            <AdMobBanner
              adUnitID="ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy"
              servePersonalizedAds={false}
            />
          </View>
          */}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 20,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
    opacity: 0.9,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  touchRow: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
  },
  link: {
    fontSize: 14,
    color: "#3b82f6",
  },
  footer: {
    alignItems: "center",
    marginTop: 10,
  },
  version: {
    fontSize: 12,
    opacity: 0.6,
  },
  adSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  adContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
});
