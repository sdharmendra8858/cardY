import Hero from "@/components/Hero";
import TermsContent from "@/components/TermsContent";
import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <Hero
        title="Terms & Conditions"
        subtitle="Please read carefully"
        tone="dark"
        surfaceColor="#F2F2F2"
      />
      <View style={styles.container}>
        <TermsContent />
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
});