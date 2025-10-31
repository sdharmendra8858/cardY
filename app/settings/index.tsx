import Hero from "@/components/Hero";
import { useAlert } from "@/context/AlertContext";
import { clearCards } from "@/utils/secureStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";

import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

export default function SettingsScreen() {
  const { showAlert } = useAlert();

  // persistent state
  const [appLock, setAppLock] = useState(true);
  const [hideInfo, setHideInfo] = useState(true);

  const STORAGE_KEY = "@cardy_settings";

  // Load saved settings on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.appLock === "boolean") setAppLock(parsed.appLock);
          if (typeof parsed.hideInfo === "boolean")
            setHideInfo(parsed.hideInfo);
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
    hideInfo?: boolean;
  }) => {
    try {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = current ? JSON.parse(current) : {};
      const merged = { ...parsed, ...updated };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  };

  // ---- Toggle handlers (with save calls) ----
  const handleAppLockToggle = (value: boolean) => {
    setAppLock(value);
    saveSettings({ appLock: value });
  };

  const handleHideInfoToggle = (value: boolean) => {
    setHideInfo(value);
    saveSettings({ hideInfo: value });
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

  const handleClearCache = () => {
    Toast.show({
      type: "info",
      text1: "Cache Cleared",
      text2: "Temporary data has been removed.",
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Hero
        title="Settings"
        subtitle="Manage privacy, security, and preferences"
        tone="dark"
        surfaceColor="#F2F2F2"
      />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header removed; handled by Hero */}

          {/* Section: Security */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Security</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Enable App Lock</Text>
              <Switch value={appLock} onValueChange={handleAppLockToggle} />
            </View>
          </View>

          {/* Section: Card Display */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Card Display</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Hide Sensitive Info by Default</Text>
              <Switch value={hideInfo} onValueChange={handleHideInfoToggle} />
            </View>
          </View>

          {/* Section: Data Management */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Data Management</Text>

            <TouchableOpacity
              onPress={handleClearCards}
              style={styles.touchRow}
            >
              <Text style={styles.label}>Clear All Saved Cards</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleClearCache}
              style={styles.touchRow}
            >
              <Text style={styles.label}>Clear Cache</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.version}>Version 1.0.3</Text>
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
  adContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
});
