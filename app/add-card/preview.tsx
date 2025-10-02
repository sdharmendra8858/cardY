import TextRecognition from "@react-native-ml-kit/text-recognition";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PreviewScreen() {
  const router = useRouter();

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Preview Card" });
  }, [navigation]);

  const { uri, side, frontUri, backUri } = useLocalSearchParams<{
    uri?: string;
    side?: "front" | "back";
    frontUri?: string;
    backUri?: string;
  }>();

  const [frontImage, setFrontImage] = useState(frontUri || (side === "front" ? uri : undefined));
  const [backImage, setBackImage] = useState(backUri || (side === "back" ? uri : undefined));

  const [extractedText, setExtractedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showText, setShowText] = useState(false);

  // Update images if a new URI is received
  if (side === "front" && uri && !frontImage) setFrontImage(uri);
  if (side === "back" && uri && !backImage) setBackImage(uri);

  const performOCR = async (imageUri: string) => {
    try {
      setIsProcessing(true);
      const result = await TextRecognition.recognize(imageUri);
      if (result?.text) {
        setExtractedText(result.text);
        setShowText(true);
      } else {
        Alert.alert("No Text Found", "No text could be detected in this image.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("OCR Error", "Failed to extract text from the image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveCard = () => {
    Alert.alert("Card Saved", "Your card has been saved successfully!", [
      { text: "OK", onPress: () => router.push("/") }
    ]);
  };

  const captureBack = () => {
    router.push({
      pathname: "/add-card/scan",
      params: { frontUri: frontImage },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* FRONT SECTION */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Front of Card</Text>
        {frontImage ? (
          <Image source={{ uri: frontImage }} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <View style={[styles.cardImage, styles.placeholder]}>
            <Text style={styles.message}>No front image captured yet</Text>
          </View>
        )}
      </View>

      {/* BACK SECTION */}
      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Back of Card</Text>
        <View style={styles.cardImage}>
          {backImage ? (
            <Image source={{ uri: backImage }} style={styles.cardImage} resizeMode="contain" />
          ) : (
            <TouchableOpacity style={styles.captureBackButtonContainer} onPress={captureBack}>
              <Text style={styles.captureBackButtonText}>Capture Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* OCR results */}
      {showText && extractedText && (
        <View style={styles.textContainer}>
          <Text style={styles.textTitle}>Extracted Text:</Text>
          <ScrollView style={styles.textScrollView}>
            <Text style={styles.extractedText}>{extractedText}</Text>
          </ScrollView>
        </View>
      )}

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        {(frontImage || backImage) && (
          <TouchableOpacity
            style={[styles.button, styles.ocrButton]}
            onPress={() => performOCR(frontImage || backImage!)}
            disabled={isProcessing}
          >
            {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Extract Text</Text>}
          </TouchableOpacity>
        )}

        {extractedText && (
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={saveCard}>
            <Text style={styles.buttonText}>Save Card</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  cardSection: { marginVertical: 12, paddingHorizontal: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginBottom: 6 },
  cardImage: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: { backgroundColor: "#111", justifyContent: "center", alignItems: "center" },
  message: { color: "#fff", fontSize: 14, textAlign: "center" },
  captureBackButtonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
    width: "100%",
  },
  captureBackButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  textContainer: { backgroundColor: "rgba(255, 255, 255, 0.9)", margin: 10, padding: 15, borderRadius: 8, maxHeight: 200 },
  textTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8, color: "#333" },
  textScrollView: { maxHeight: 150 },
  extractedText: { fontSize: 14, lineHeight: 20, color: "#333" },
  buttonContainer: { flexDirection: "row", justifyContent: "space-around", paddingTop: 20 },
  button: { padding: 12, borderRadius: 8, minWidth: 120, alignItems: "center" },
  ocrButton: { backgroundColor: "#007AFF" },
  saveButton: { backgroundColor: "#34C759" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});