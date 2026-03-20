import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { IDDocument } from "@/types/id";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import React, { memo, useState, useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";

interface IDGridItemProps {
  item: IDDocument;
  onPress?: (id: string) => void;
}

/**
 * IDGridItem component displays a single ID document in a grid layout.
 * It handles thumbnail loading and provides a fallback icon if the image fails.
 */
function IDGridItem({ item, onPress }: IDGridItemProps) {
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const router = useRouter();

  // Use the first asset's thumbnail if available
  const thumbnailUri = item.assets[0]?.thumbnailUri || null;

  // Reset failure state when URI changes or item changes
  React.useEffect(() => {
    setImageLoadFailed(false);
  }, [thumbnailUri, item]);

  // Memoize the thumbnail display to avoid issues with complex JSX structures
  const renderThumbnail = () => {
    if (thumbnailUri && !imageLoadFailed) {
      return (
        <Image
          key={`${thumbnailUri}-${item.id}`}
          source={{ uri: `${thumbnailUri}${thumbnailUri.includes('?') ? '&' : '?'}t=${Date.now()}` }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="none"
          transition={200}
          onError={() => {
            setImageLoadFailed(true);
          }}
        />
      );
    }
    return (
      <View style={[styles.placeholder, { backgroundColor: palette.surface }]}>
        <ThemedText style={{ color: palette.icon, fontSize: 32 }}>📄</ThemedText>
      </View>
    );
  };

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(item.id);
    } else {
      router.push({ pathname: "/id-details/[id]", params: { id: item.id } });
    }
  }, [item.id, onPress, router]);

  return (
    <Pressable 
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: palette.card, borderColor: palette.border },
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
      ]}
      onPress={handlePress}
    >
      <View style={styles.imageContainer}>
        <View style={[styles.innerImageContainer, { backgroundColor: palette.card }]}>
          {renderThumbnail()}
        </View>
      </View>
      <View style={styles.footer}>
        <ThemedText type="defaultSemiBold" style={styles.label} numberOfLines={1}>
          {item.label || item.type}
        </ThemedText>
      </View>
    </Pressable>
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
  footer: {
    padding: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
});

export default memo(IDGridItem);
