import NativeAd from "@/components/AdNative";
import Hero from "@/components/Hero";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WebsiteComingSoonScreen() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Website" });
  }, [navigation]);

  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  const handleOpenWebsite = async () => {
    const url = "https://redonelabs.in";
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      alert("Unable to open website. Please visit redonelabs.in manually.");
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <Hero title="Website" subtitle="Visit our site" showBackButton={true} />
      <View style={[styles.container, { backgroundColor: palette.surface }]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerBox}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: scheme === "dark" ? "#0a2540" : "#eaf6ff" },
              ]}
            >
              <MaterialIcons name="public" size={36} color={palette.tint} />
            </View>

            <ThemedText type="title" style={styles.title}>
              Visit Our Website
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Tap below to open our official website for more information.
            </ThemedText>

            <TouchableOpacity
              onPress={handleOpenWebsite}
              style={[styles.button, { backgroundColor: palette.tint }]}
            >
              <ThemedText style={[styles.buttonText, { color: palette.onPrimary }]}>Open Website</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Native Ad Section */}
          <View style={styles.adSection}>
            <NativeAd />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  centerBox: { alignItems: "center", marginTop: 32 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 16 },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    marginTop: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  adSection: {
    marginTop: 32,
    marginBottom: 16,
    alignItems: 'center',
  },
});