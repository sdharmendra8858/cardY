import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import {
  GestureResponderEvent,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type ButtonVariant = "primary" | "danger" | "secondary";
type IconLibrary = "ionicons" | "material";

type AppButtonProp = {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: keyof typeof Ionicons.glyphMap | keyof typeof MaterialIcons.glyphMap;
  iconLibrary?: IconLibrary;
  iconSize?: number;
};

export default function AppButton({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  icon,
  iconLibrary = "ionicons",
  iconSize = 20,
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

  const IconComponent = iconLibrary === "material" ? MaterialIcons : Ionicons;

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
      onPress={onPress || (() => { })}
      disabled={disabled}
    >
      <View style={styles.content}>
        {icon && (
          <IconComponent
            name={icon as any}
            size={iconSize}
            color={textColor}
            style={styles.icon}
          />
        )}
        <Text style={[styles.text, { color: textColor }, textStyle]}>
          {title}
        </Text>
      </View>
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
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 8,
  },
  text: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
