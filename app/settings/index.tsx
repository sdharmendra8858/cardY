import NativeAd from "@/components/AdNative";
import Hero from "@/components/Hero";
import { useAlert } from "@/context/AlertContext";
import { useCardsWithMigration as useCards } from "@/context/CardContextWithMigration";
import { clearAllIDs } from "@/utils/idStorage";
import { clearCards } from "@/utils/secureStorage";
import { ignoreNextAppOpenAd } from "@/utils/adControl";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/themed-text";
import { SECURITY_SETTINGS_KEY } from "@/constants/storage";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { authenticateUser } from "@/utils/LockScreen";
import Slider from "@react-native-community/slider";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
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
  const router = useRouter();
  const { showAlert } = useAlert();
  const { refreshCards } = useCards();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];


  // persistent state
  const [appLock, setAppLock] = useState(false);
  const [cardLock, setCardLock] = useState(false);
  const [idLock, setIdLock] = useState(false);
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
          setIdLock(parsed.idLock ?? false);
          setCooldown(parsed.cooldown ?? 3);
        } else {
          // Initialize storage with defaults
          const defaults = { appLock: false, cardLock: false, idLock: false, cooldown: 3 };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
          // Ensure state matches defaults
          setAppLock(false);
          setCardLock(false);
          setIdLock(false);
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
    idLock?: boolean;
    cooldown?: number;
  }) => {
    try {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = current ? JSON.parse(current) : {};
      const merged = { appLock: false, cardLock: false, idLock: false, cooldown: 3, ...parsed, ...updated }; // default true baseline
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
        title: "Disable Card View Lock",
        subtitle: "Authenticate to disable card view",
      });
      if (!verified) {
        Toast.show({
          type: "error",
          text1: "Authentication Failed",
          text2: "Card View Lock remains active.",
        });
        return;
      }
    }

    setCardLock(value);
    saveSettings({ cardLock: value });
    Toast.show({
      type: "success",
      text1: value ? "Card View Lock Enabled" : "Card View Lock Disabled",
    });
  };

  const handleIdLockToggle = async (value: boolean) => {
    if (!value) {
      const verified = await authenticateUser("id", {
        title: "Disable ID View Lock",
        subtitle: "Authenticate to disable ID document view",
      });
      if (!verified) {
        Toast.show({
          type: "error",
          text1: "Authentication Failed",
          text2: "ID View Lock remains active.",
        });
        return;
      }
    }

    setIdLock(value);
    saveSettings({ idLock: value });
    Toast.show({
      type: "success",
      text1: value ? "ID View Lock Enabled" : "ID View Lock Disabled",
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
              // Refresh the CardContext to update the UI
              await refreshCards();
              Toast.show({
                type: "success",
                text1: "All cards cleared securely",
              });
              // Navigate back to home screen
              router.push("/");
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

  const handleClearIDs = () => {
    showAlert({
      title: "Clear All Saved Documents",
      message:
        "This will permanently delete all saved ID documents from your device. Are you sure?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllIDs();
              Toast.show({
                type: "success",
                text1: "All documents cleared securely",
              });
              // Navigate back to home screen
              router.push({ pathname: "/", params: { viewMode: "ids" } as any });
            } catch (error) {
              console.error("Error clearing IDs:", error);
              Toast.show({
                type: "error",
                text1: "Something went wrong while clearing documents.",
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

            <View style={styles.row}>
              <ThemedText style={styles.label}>
                Require Auth to View Documents
              </ThemedText>
              <Switch value={idLock} onValueChange={handleIdLockToggle} />
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

          {/* Native Ad Section - Moved to more prominent position */}
          <View style={styles.adSection}>
            <NativeAd />
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
              onPress={handleClearIDs}
              style={styles.touchRow}
            >
              <ThemedText style={styles.label}>
                Clear All Saved Documents
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
                  ignoreNextAppOpenAd();
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

          {/* Future Ad Section */}
          {/* 
          <View style={styles.adContainer}>
            <AdMobBanner
              adUnitID="ca-app-pub-xxxxxxxxxxxxxxxx/yyyyyyyyyy"
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
