import React from "react";
import { StyleSheet, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { ThemedText } from "./themed-text";

interface ProBadgeProps {
  showText?: boolean;
  size?: number;
}

export const ProBadge: React.FC<ProBadgeProps> = ({ showText = true, size = 12 }) => {
  return (
    <View style={[styles.proBadge, !showText && styles.miniBadge]}>
      <MaterialIcons name="workspace-premium" size={size} color="#FFB000" />
      {showText && (
        <ThemedText style={styles.proText}>PREMIUM</ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  proBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A1A", // Premium deep charcoal black
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FFB000", // Rich gold border
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  miniBadge: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRadius: 15,
  },
  proText: {
    color: "#FFB000", // Gold text matching the icon and border
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginLeft: 3,
  },
});

export default ProBadge;
