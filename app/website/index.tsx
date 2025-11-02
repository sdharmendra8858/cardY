import Hero from "@/components/Hero";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WebsiteComingSoonScreen() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Website" });
  }, [navigation]);
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <Hero title="Website" subtitle="Coming soon" />
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
              Coming Soon
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              We’re building our website experience. Stay tuned!
            </ThemedText>
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
    backgroundColor: "#f2f2f2",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  centerBox: { alignItems: "center", marginTop: 32 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eaf6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center" },
});
