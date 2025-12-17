import Hero from "@/components/Hero";
import NativeAd from "@/components/NativeAd";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Constants from "expo-constants";
import { useNavigation, useRouter } from "expo-router";
import React, { useLayoutEffect } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";

export default function SupportScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Support" });
  }, [navigation]);

  const openEmail = () => {
    const email = "support@redonelabs.in";
    const subject = encodeURIComponent("Support request for Cardy Wall");
    const body = encodeURIComponent("Hello Cardy Wall team,\n\n");
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const openWebsite = () => {
    router.push("/website");
  };

  const openFeedback = () => {
    const email = "support@redonelabs.in";
    const subject = encodeURIComponent("Feedback for Cardy Wall");
    Linking.openURL(`mailto:${email}?subject=${subject}`);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <Hero title="Support" subtitle="We’re here to help" showBackButton={true} />
      <View style={[styles.container, { backgroundColor: palette.surface }]}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: palette.card }]}>
            <TouchableOpacity style={styles.row} onPress={openEmail}>
              <View style={styles.left}>
                <MaterialIcons name="email" size={22} color={palette.tint} />
                <ThemedText style={styles.label}>
                  Email: support@redonelabs.in
                </ThemedText>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={scheme === "dark" ? "#666" : "#bbb"}
              />
            </TouchableOpacity>

            <View
              style={[styles.divider, { backgroundColor: palette.border }]}
            />

            <TouchableOpacity style={styles.row} onPress={openFeedback}>
              <View style={styles.left}>
                <MaterialIcons
                  name="rate-review"
                  size={22}
                  color={palette.tint}
                />
                <ThemedText style={styles.label}>Send Feedback</ThemedText>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={scheme === "dark" ? "#666" : "#bbb"}
              />
            </TouchableOpacity>

            <View
              style={[styles.divider, { backgroundColor: palette.border }]}
            />

            <TouchableOpacity style={styles.row} onPress={openWebsite}>
              <View style={styles.left}>
                <MaterialIcons name="public" size={22} color={palette.tint} />
                <ThemedText style={styles.label}>Visit Website</ThemedText>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={22}
                color={scheme === "dark" ? "#666" : "#bbb"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <ThemedText style={styles.version}>
              Version {Constants.expoConfig?.version ?? "1.0.0"}
            </ThemedText>
          </View>

          {/* Native Ad Section - Below Version Info */}
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
    backgroundColor: "#f2f2f2",
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 14, opacity: 0.7, marginBottom: 16 },
  card: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#e5e5e5" },
  footer: { alignItems: "center", marginTop: 10 },
  version: { fontSize: 12, opacity: 0.6 },
  adSection: {
    marginTop: 16,
    marginBottom: 8,
  },
});
