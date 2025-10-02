// app/add-card/extract.tsx
import { useLocalSearchParams } from "expo-router";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity } from "react-native";

export default function ExtractScreen() {
  const { frontUri, backUri } = useLocalSearchParams<{
    frontUri: string;
    backUri: string;
  }>();

  // Dummy extraction function (replace with actual OCR/API)
  const extractCardDetails = () => {
    // For demo, just show URIs in alert
    Alert.alert(
      "Card Details Extracted",
      `Front Image: ${frontUri}\nBack Image: ${backUri}`,
      [{ text: "OK" }]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Front of Card</Text>
      <Image source={{ uri: frontUri }} style={styles.cardImage} />

      <Text style={styles.title}>Back of Card</Text>
      <Image source={{ uri: backUri }} style={styles.cardImage} />

      <TouchableOpacity onPress={extractCardDetails} style={styles.button}>
        <Text style={styles.buttonText}>Extract Card Details</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 12,
  },
  cardImage: {
    width: "90%",
    height: 200,
    resizeMode: "contain",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  button: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});