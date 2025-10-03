import TextRecognition from "@react-native-ml-kit/text-recognition";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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

  const [frontImage, setFrontImage] = useState<string | undefined>(
    frontUri || (side === "front" ? uri : undefined)
  );
  const [backImage, setBackImage] = useState<string | undefined>(
    backUri || (side === "back" ? uri : undefined)
  );

  const [extractedText, setExtractedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Update images only when params change
  useEffect(() => {
    if (side === "front" && uri) setFrontImage(uri);
    if (side === "back" && uri) setBackImage(uri);
  }, [uri, side]);


  const isValidBankLine = (line: string) => {
    const knownBanks = [
      "HDFC BANK",
      "CITI",
      "CHASE",
      "BANK OF AMERICA",
      "WELLS FARGO",
      "HSBC",
    ];
    return (
      knownBanks.some((b) => line.includes(b)) &&
      !/\d/.test(line) // ignore lines with numbers
    );
  };

  const isValidNameLine = (line: string) => {
    if (!/^[A-Z\s]+$/.test(line)) return false;
    const words = line.trim().split(" ");
    if (words.length < 2 || words.length > 4) return false;
    if (words.some((w) => w.length < 3)) return false;
  
    const blacklist = [
      "VALID",
      "PAYMENT",
      "EXCHANGE",
      "BANK",
      "CUSTOMER",
      "PHONEBANKING",
      "DISCOVER",
      "DINERS",
      "AMEX",
      "VISA",
      "MASTERCARD",
    ];
    return !blacklist.some((kw) => line.includes(kw));
  };

  const parseOcrResult = (lines: string[]) => {
    const cardDetails: { [key: string]: string } = {};
  
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
    
      // Card Number
      const digitsOnly = line.replace(/\s+/g, "");
      const cardNumberMatch = digitsOnly.match(/\b\d{13,16}\b/);
      if (cardNumberMatch) cardDetails.cardNumber = cardNumberMatch[0];
    
      // Expiry
      const expiryRegex = /\b(0[1-9]|1[0-2])\/(\d{2}|\d{4})\b/;
      const expiryMatch = line.match(expiryRegex);
      if (expiryMatch) cardDetails.expiryDate = expiryMatch[0];
    
      // CVV
      if (line.includes("CVV")) {
        const nextLine = lines[i + 1]?.trim();
        if (nextLine && /^\d{3,4}$/.test(nextLine)) {
          cardDetails.cvv = nextLine;
        }
      }
    
      // Cardholder Name
      if (!cardDetails.cardHolderName && isValidNameLine(line)) {
        cardDetails.cardHolderName = line.trim();
      }
    
      // Issuer Bank
      if (!cardDetails.issuerBank && isValidBankLine(line)) {
        cardDetails.issuerBank = line.trim();
      }
    }

    return cardDetails;
  }

  const processOcrResult = (ocrResult: any) => {
    if (!ocrResult || !ocrResult.blocks) {
      return { rawText: "", lines: [] };
    }
  
    const corrections: { [key: string]: string } = {
      BAMK: "BANK",
      GHDFC: "HDFC",
      DNTERNATIONAE: "INTERNATIONAL",
      PRIVILGE: "PRIVILEGE",
      DISCOVFR: "DISCOVER",
    };
  
    const lines: string[] = [];
  
    ocrResult.blocks.forEach((block: any) => {
      block.lines.forEach((line: any) => {
        let cleaned = line.text
          .toUpperCase()
          .replace(/[^A-Z0-9\s\/:]/gi, "") // keep only A-Z, numbers, spaces, /, :
          .replace(/\s+/g, " ") // normalize spaces
          .trim();
  
        // Apply corrections
        Object.keys(corrections).forEach((wrong) => {
          const regex = new RegExp(`\\b${wrong}\\b`, "g");
          cleaned = cleaned.replace(regex, corrections[wrong]);
        });
  
        if (cleaned.length > 0) {
          console.log("Cleaned Line:", cleaned);
          lines.push(cleaned);
        }
      });
    });
  
    return {
      rawText: lines.join("\n"),
      lines,
    };
  };

  const extractCardDetails = async () => {
    if (!frontImage || !backImage) {
      Alert.alert("Missing Images", "Please capture both sides of the card.");
      return;
    }
  
    try {
      setIsProcessing(true);
  
      const [frontResult, backResult] = await Promise.all([
        TextRecognition.recognize(frontImage),
        TextRecognition.recognize(backImage),
      ]);
  
      // Process OCR into clean lines
      const frontProcessed = processOcrResult(frontResult);
      const backProcessed = processOcrResult(backResult);
  
      // Parse card details from lines
      const frontDetails = parseOcrResult(frontProcessed.lines);
      const backDetails = parseOcrResult(backProcessed.lines);
  
      // Merge both
      const combinedDetails = { ...frontDetails, ...backDetails };

      console.log("Extracted Card Details:", combinedDetails);
  
      setExtractedText(JSON.stringify(combinedDetails, null, 2));
  
      Alert.alert("Card Details Extracted", "Review the extracted details below.");
    } catch (error) {
      console.error("OCR Error:", error);
      Alert.alert("Error", "Failed to process the images. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveCard = () => {
    Alert.alert("Card Saved", "Your card has been saved successfully!", [
      { text: "OK", onPress: () => router.push("/") },
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
        {backImage ? (
          <Image source={{ uri: backImage }} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <TouchableOpacity style={styles.captureBackButtonContainer} onPress={captureBack}>
            <Text style={styles.captureBackButtonText}>Capture Back</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* OCR results */}
      {extractedText ? (
        <View style={styles.textContainer}>
          <Text style={styles.textTitle}>Extracted Details:</Text>
          <ScrollView style={styles.textScrollView}>
            <Text style={styles.extractedText}>{extractedText}</Text>
          </ScrollView>
        </View>
      ) : null}

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        {frontImage && backImage && (
          <TouchableOpacity
            style={[styles.button, styles.ocrButton]}
            onPress={extractCardDetails}
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
    height: 250,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
    borderRadius: 8,
  },
  captureBackButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  textContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    margin: 10,
    padding: 15,
    borderRadius: 8,
    maxHeight: 200,
  },
  textTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8, color: "#333" },
  textScrollView: { maxHeight: 150 },
  extractedText: { fontSize: 14, lineHeight: 20, color: "#333" },
  buttonContainer: { flexDirection: "row", justifyContent: "space-around", paddingTop: 20 },
  button: { padding: 12, borderRadius: 8, minWidth: 120, alignItems: "center" },
  ocrButton: { backgroundColor: "#007AFF" },
  saveButton: { backgroundColor: "#34C759" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});