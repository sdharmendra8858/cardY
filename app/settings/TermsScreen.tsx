import Hero from "@/components/Hero";
import TermsContent from "@/components/TermsContent";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
      edges={["top", "bottom"]}
    >
      <Hero title="Terms & Conditions" subtitle="Please read carefully"  showBackButton={true} />
      <View style={[styles.container, { backgroundColor: palette.surface }]}>
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
