import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

interface DecryptLoaderProps {
  text?: string;
  subtext?: string;
}

export default function DecryptLoader({ 
  text = "Decrypting Securely...", 
  subtext = "Unlocking with AES-256" 
}: DecryptLoaderProps) {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 0.85, duration: 800, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.5, duration: 800, useNativeDriver: true })
        ])
      ])
    ).start();
  }, [scaleAnim, opacityAnim]);

  return (
    <View style={[styles.center, { backgroundColor: palette.surface }]}>
      <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
        <View style={[styles.iconContainer, { backgroundColor: palette.card, borderColor: palette.primary }]}>
          <MaterialIcons name="security" size={48} color={palette.primary} />
        </View>
      </Animated.View>
      <ThemedText style={[styles.loadingText, { color: palette.text }]}>
        {text}
      </ThemedText>
      {subtext && (
        <ThemedText style={styles.subText}>
          {subtext}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  subText: {
    fontSize: 13,
    opacity: 0.5,
    marginTop: 8,
  },
});
