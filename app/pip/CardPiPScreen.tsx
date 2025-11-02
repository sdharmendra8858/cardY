import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { StyleSheet, View } from "react-native";

export default function CardPiPScreen({}) {
  // You can read the cardId from props if passed
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  return (
    <View style={[styles.container, { backgroundColor: palette.surface }]}>
      <ThemedText type="title" style={styles.text}>
        PiP Card Screen
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  text: { fontSize: 20, fontWeight: "bold" },
});
