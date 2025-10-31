import Hero from "@/components/Hero";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "expo-router";
import React, { useLayoutEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WebsiteComingSoonScreen() {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Website" });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Hero
        title="Website"
        subtitle="Coming soon"
        tone="dark"
        surfaceColor="#F2F2F2"
      />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerBox}>
            <View style={styles.iconCircle}>
              <MaterialIcons name="public" size={36} color="#3b82f6" />
            </View>
            <Text style={styles.title}>Coming Soon</Text>
            <Text style={styles.subtitle}>
              We’re building our website experience. Stay tuned!
            </Text>
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
  subtitle: { fontSize: 14, color: "#555", textAlign: "center" },
});
