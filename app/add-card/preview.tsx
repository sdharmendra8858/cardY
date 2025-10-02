// app/add-card/preview.tsx
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function PreviewScreen() {
  const [extractedText, setExtractedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showText, setShowText] = useState(false);

  const navigation = useNavigation();
  const router = useRouter();

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

  const performOCR = async (imageUri: string) => {
    try {
      setIsProcessing(true);
      console.log("Starting OCR for image:", imageUri);
      
      const result = await TextRecognition.recognize(imageUri);
      
      if (result && result.text) {
        setExtractedText(result.text);
        setShowText(true);
        console.log("OCR Result:", result.text);
      } else {
        Alert.alert("No Text Found", "No text could be detected in this image.");
      }
    } catch (error) {
      console.error("OCR Error:", error);
      Alert.alert("OCR Error", "Failed to extract text from the image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveCard = () => {
    // Here you would typically save the card with the extracted text
    // For now, we'll just navigate back with the data
    console.log("Saving card with text:", extractedText);
    Alert.alert("Card Saved", "Your card has been saved successfully!", [
      { text: "OK", onPress: () => router.push("/") }
    ]);
  }; 

  return (
    <View style={styles.container}>
      <Image source={{ uri }} style={styles.image} resizeMode="contain" />
      
      {showText && extractedText && (
        <View style={styles.textContainer}>
          <Text style={styles.textTitle}>Extracted Text:</Text>
          <ScrollView style={styles.textScrollView}>
            <Text style={styles.extractedText}>{extractedText}</Text>
          </ScrollView>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.ocrButton]} 
          onPress={() => performOCR(uri)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Extract Text</Text>
          )}
        </TouchableOpacity>

        {extractedText && (
          <TouchableOpacity 
            style={[styles.button, styles.saveButton]} 
            onPress={saveCard}
          >
            <Text style={styles.buttonText}>Save Card</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#000" 
  },
  message: { 
    color: "#fff", 
    textAlign: "center", 
    fontSize: 18,
    margin: 20 
  },
  image: { 
    flex: 1, 
    width: "100%", 
    maxHeight: "60%" 
  },
  textContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    margin: 10,
    padding: 15,
    borderRadius: 8,
    maxHeight: 200,
  },
  textTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  textScrollView: {
    maxHeight: 150,
  },
  extractedText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
    paddingBottom: 40,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  ocrButton: {
    backgroundColor: "#007AFF",
  },
  saveButton: {
    backgroundColor: "#34C759",
  },
  buttonText: { 
    color: "#fff", 
    fontWeight: "bold", 
    fontSize: 16 
  },
});