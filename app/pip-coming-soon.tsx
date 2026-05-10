import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import AppButton from "@/components/AppButton";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors } from "@/constants/theme";
import Hero from "@/components/Hero";

export default function PipComingSoonScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.surface }]}>
      <Hero
        title="Picture-in-Picture"
        subtitle="Feature Status"
        showBackButton={true}
        onBack={() => router.back()}
      />
      <View style={styles.container}>
        <View style={[styles.iconContainer, { backgroundColor: palette.primary + '15' }]}>
          <Ionicons name="construct-outline" size={80} color={palette.primary} />
        </View>
        <ThemedText type="title" style={styles.title}>
          Coming Soon
        </ThemedText>
        <ThemedText style={[styles.description, { color: palette.text }]}>
          Picture-in-Picture (PiP) functionality is currently being developed for iOS. 
          We are working hard to bring you the best and most secure PiP experience possible.
        </ThemedText>
        
        <View style={[styles.infoBox, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Ionicons name="information-circle-outline" size={24} color={palette.primary} style={{ marginRight: 12 }} />
          <ThemedText style={styles.infoText}>
            Stay tuned for upcoming updates! PiP is fully available on Android devices.
          </ThemedText>
        </View>

        <AppButton 
          title="Go Back"
          onPress={() => router.back()}
          style={styles.backButton}
        />
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.8,
    marginBottom: 40,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 40,
    width: "100%",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  backButton: {
    width: "100%",
  },
});
