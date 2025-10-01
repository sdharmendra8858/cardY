// app/add-card/preview.tsx
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PreviewScreen() {
  const router = useRouter();

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Preview your Card" });
  }, [navigation]);

  const { uri } = useLocalSearchParams<{ uri: string }>();

  if (!uri) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No image to preview</Text>
      </View>
    );
  }

  const handleConfirm = () => {
    router.push(`/add-card?croppedUri=${encodeURIComponent(uri)}`);
  };

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />

      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.confirmText}>Save This Card</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  message: { color: "#fff", textAlign: "center", fontSize: 18 },
  image: { flex: 1, width: "100%", height: "100%" },
  confirmButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    padding: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  confirmText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});