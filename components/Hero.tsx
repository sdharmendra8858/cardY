import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

type HeroProps = {
  title: string;
  subtitle?: string;
  imageSource?: any;
  tone?: "light" | "dark";
  surfaceColor?: string;
};

export default function Hero({
  title,
  subtitle,
  imageSource,
  tone,
  surfaceColor,
}: HeroProps) {
  const systemScheme = useColorScheme();
  const isDark = tone ? tone === "dark" : systemScheme === "dark";
  const titleColor = useThemeColor({}, "text");
  const subtitleColor = isDark ? Colors.dark.icon : Colors.light.icon;
  const containerBg = isDark ? "#0a2540" : "#eaf6ff";
  const overlapBg =
    surfaceColor ?? (isDark ? Colors.dark.surface : Colors.light.surface);

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: subtitleColor }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {imageSource ? (
        <Image source={imageSource} style={styles.image} resizeMode="contain" />
      ) : null}
      <View style={[styles.bottomOverlap, { backgroundColor: overlapBg }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },
  light: { backgroundColor: "#eaf6ff" },
  dark: { backgroundColor: "#0a2540" },
  textContainer: { flex: 1, paddingRight: 12 },
  title: { fontSize: 22, fontWeight: "800" },
  titleLight: { color: "#0a2540" },
  titleDark: { color: "#fff" },
  subtitle: { marginTop: 6, fontSize: 14 },
  subtitleLight: { color: "#34495e" },
  subtitleDark: { color: "#c9d6e8" },
  image: { width: 64, height: 64 },
  bottomOverlap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -16,
    height: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});
