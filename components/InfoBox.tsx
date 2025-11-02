import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

type InfoBoxProps = {
  message: string;
  type?: "info" | "warning" | "success" | "error";
  style?: ViewStyle; // Allow custom style overrides
};

const InfoBox: React.FC<InfoBoxProps> = ({ message, type = "info", style }) => {
  const scheme = useColorScheme() ?? "light";

  const palettes = {
    light: {
      info: { bg: "#d1ecf1", border: "#bee5eb", text: "#0c5460" },
      warning: { bg: "#fff3cd", border: "#ffeeba", text: "#856404" },
      success: { bg: "#d4edda", border: "#c3e6cb", text: "#155724" },
      error: { bg: "#f8d7da", border: "#f5c6cb", text: "#721c24" },
    },
    dark: {
      info: { bg: "#12323a", border: "#1d4b56", text: "#9fd3df" },
      warning: { bg: "#3a2f12", border: "#5a4a1b", text: "#ffe08a" },
      success: { bg: "#133223", border: "#1f4b35", text: "#8ee1b5" },
      error: { bg: "#3a1618", border: "#5a2225", text: "#f2a7ae" },
    },
  } as const;

  const palette = palettes[scheme][type];

  const getStyles = () => {
    return {
      container: [
        styles.container,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ],
      text: [styles.text, { color: palette.text }],
    };
  };

  const currentStyle = getStyles();

  return (
    <View style={[currentStyle.container, style]}>
      <Text style={currentStyle.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default InfoBox;
