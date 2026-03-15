import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IDDocument } from "@/types/id";
import { Image } from "expo-image";
import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface IDGridItemProps {
  item: IDDocument;
}

export default function IDGridItem({ item }: IDGridItemProps) {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  // Use the first asset's thumbnail if available
  const thumbnailUri = item.assets[0]?.thumbnailUri || null;

  return (
    <Link href={{ pathname: "/id-details/[id]", params: { id: item.id } }} asChild>
      <Pressable style={({ pressed }) => [
        styles.container,
        { backgroundColor: palette.card, borderColor: palette.border },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
      ]}>
        <View style={styles.imageContainer}>
          <View style={[styles.innerImageContainer, { backgroundColor: palette.card }]}>
            {thumbnailUri ? (
              <Image
                source={{ uri: thumbnailUri }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.placeholder, { backgroundColor: palette.surface }]}>
                <ThemedText style={{ color: palette.icon, fontSize: 32 }}>📄</ThemedText>
              </View>
            )}
            {/* Subtle overlay */}
            <View style={styles.overlay} />
          </View>
        </View>
        <View style={styles.footer}>
          <ThemedText type="defaultSemiBold" style={styles.label} numberOfLines={1}>
            {item.label || item.type}
          </ThemedText>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 0,
    width: "100%",
  },
  innerImageContainer: {
    aspectRatio: 1.5,
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  footer: {
    padding: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
});
