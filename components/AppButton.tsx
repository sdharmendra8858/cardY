import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import {
  GestureResponderEvent,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  ViewStyle,
} from "react-native";

type ButtonVariant = "primary" | "danger" | "secondary";

type AppButtonProp = {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export default function AppButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
}: AppButtonProp) {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const backgroundColor =
    variant === "danger"
      ? palette.danger
      : variant === "secondary"
      ? palette.secondary
      : palette.primary;
  const textColor =
    variant === "danger"
      ? palette.onDanger
      : variant === "secondary"
      ? palette.onSecondary
      : palette.onPrimary;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[
        styles.button,
        {
          backgroundColor,
          opacity: disabled ? 0.6 : 1,
          alignSelf: fullWidth ? "stretch" : "auto",
        },
        style,
      ]}
      onPress={onPress || (() => {})}
      disabled={disabled}
    >
      <Text style={[styles.text, { color: textColor }, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
