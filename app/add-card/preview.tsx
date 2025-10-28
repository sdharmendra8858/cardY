import Hero from "@/components/Hero";
import { useAlert } from "@/context/AlertContext";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PreviewScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { showAlert } = useAlert();

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

  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Update images only when params change
  useEffect(() => {
    if (side === "front" && uri) setFrontImage(uri);
    if (side === "back" && uri) setBackImage(uri);
  }, [uri, side]);

  // ---------- helpers ----------
  const luhnValidate = (numStr: string) => {
    if (!/^\d{13,19}$/.test(numStr)) return false;
    let sum = 0;
    let alt = false;
    for (let i = numStr.length - 1; i >= 0; i--) {
      let d = parseInt(numStr[i], 10);
      if (alt) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
      alt = !alt;
    }
    return sum % 10 === 0;
  };

  const cleanupLineText = (raw: string) => {
    let s = String(raw || "").toUpperCase();
    s = s.replace(/[\u0000-\u001F\u007F]/g, " "); // remove control chars
    s = s.replace(/[^A-Z0-9\s\/:]/g, " "); // keep only A-Z, 0-9, space, /, :
    s = s.replace(/\s+/g, " ").trim();
    return s;
  };

  // Conservative digit normalization applied only if token looks digit-like
  const digitNormalizeToken = (token: string) => {
    const digits = (token.match(/\d/g) || []).length;
    const letters = (token.match(/[A-Z]/g) || []).length;
    const apply = digits >= 3 || (digits > 0 && digits >= letters);
    if (!apply) return token;
    return token
      .replace(/O/g, "0")
      .replace(/D/g, "0")
      .replace(/I/g, "1")
      .replace(/L/g, "1")
      .replace(/S/g, "5")
      .replace(/B/g, "8")
      .replace(/Z/g, "2")
      .replace(/Q/g, "0");
  };

  const prettyBBox = (bbox: any) => {
    if (!bbox) return null;
    // ML Kit may give frame: {left, top, width, height} OR boundingBox/cornerPoints
    if (bbox.left !== undefined && bbox.top !== undefined) {
      return `L:${Math.round(bbox.left)} T:${Math.round(
        bbox.top
      )} W:${Math.round(bbox.width || 0)} H:${Math.round(bbox.height || 0)}`;
    }
    if (Array.isArray(bbox) && bbox.length) {
      // cornerPoints: [{x,y},...] => return min/max
      const xs = bbox.map((p: any) => p.x || p[0]);
      const ys = bbox.map((p: any) => p.y || p[1]);
      return `L:${Math.round(Math.min(...xs))} T:${Math.round(
        Math.min(...ys)
      )} W:${Math.round(Math.max(...xs) - Math.min(...xs))} H:${Math.round(
        Math.max(...ys) - Math.min(...ys)
      )}`;
    }
    return JSON.stringify(bbox);
  };

  // ---------- processOcrResult ----------
  /**
   * Returns { rawText, lines } where lines = [{ text, bbox, blockIndex, lineIndex }]
   */
  const processOcrResult = (ocrResult: any) => {
    if (!ocrResult || !ocrResult.blocks) return { rawText: "", lines: [] };

    const corrections: { [k: string]: string } = {
      BAMK: "BANK",
      GHDFC: "HDFC",
      DNTERNATIONAE: "INTERNATIONAL",
      PRIVILGE: "PRIVILEGE",
      DISCOVFR: "DISCOVER",
      DISCEVER: "DISCOVER",
      VAD: "VALID", // common short OCR error
    };

    const lines: {
      text: string;
      bbox: any;
      blockIndex: number;
      lineIndex: number;
    }[] = [];

    (ocrResult.blocks || []).forEach((block: any, bIdx: number) => {
      (block.lines || []).forEach((ln: any, lIdx: number) => {
        // ML Kit line text + frame possibilities
        let raw = String(ln.text || ln.text);
        let cleaned = cleanupLineText(raw);

        // Word-level corrections
        Object.keys(corrections).forEach((wrong) => {
          const re = new RegExp(`\\b${wrong}\\b`, "g");
          cleaned = cleaned.replace(re, corrections[wrong]);
        });

        // Apply digit normalization token-wise (conservative)
        const tokens = cleaned.split(" ").map((t) => {
          if (/^[0-9\/:]+$/.test(t)) return t; // pure digits/slashes
          return digitNormalizeToken(t);
        });
        cleaned = tokens.join(" ").replace(/\s+/g, " ").trim();

        if (cleaned.length) {
          // Try to get bbox info: different libs use frame/boundingBox/cornerPoints
          const bbox = ln.frame || ln.boundingBox || ln.cornerPoints || null;
          const item = {
            text: cleaned,
            bbox,
            blockIndex: bIdx,
            lineIndex: lIdx,
          };
          console.log(
            "Cleaned Line:",
            cleaned,
            "| bbox:",
            prettyBBox(bbox),
            "| block:",
            bIdx,
            "line:",
            lIdx
          );
          lines.push(item);
        }
      });
    });

    return { rawText: lines.map((l) => l.text).join("\n"), lines };
  };

  // ---------- parseOcrResult ----------
  /**
   * Accepts the lines returned from processOcrResult (array of objects).
   * Returns { cardDetails, matchedLines } where matchedLines maps field -> { index, text, bbox } (useful for debugging/overlay)
   */
  const parseOcrResult = (
    lineObjs: {
      text: string;
      bbox: any;
      blockIndex: number;
      lineIndex: number;
    }[]
  ) => {
    const cardDetails: { [k: string]: string } = {};
    const matchedLines: {
      [k: string]: { idx: number; text: string; bbox: any };
    } = {};

    const knownBanks = [
      "HDFC BANK",
      "ICICI BANK",
      "SBI",
      "STATE BANK",
      "AXIS BANK",
      "CITI",
      "CITIBANK",
      "CHASE",
      "BANK OF AMERICA",
      "WELLS FARGO",
      "HSBC",
      "DISCOVER",
      "DINERS CLUB",
      "AMEX",
      "RUPAY",
      "VISA",
      "MASTERCARD",
    ];

    const isDisclaimerOrPhone = (line: string) => {
      if (
        /\d{5,}/.test(line) &&
        /PHONE|TOLL|CALL|CUSTOMER|TRAVEL|TRAVELLING|FOREIGN|NEPAL|BHUTAN/.test(
          line
        )
      )
        return true;
      if (/^(?:\+?\d[\d\s\-\/]{6,})$/.test(line)) return true;
      return false;
    };

    let cardNumberIndex = -1;

    // 1) Find card number (prefer Luhn valid)
    for (let i = 0; i < lineObjs.length; i++) {
      const item = lineObjs[i];
      const raw = item.text;
      const collapsed = raw.replace(/\s+/g, ""); // remove spaces
      const digitsOnly = collapsed.replace(/[^0-9]/g, ""); // leave digits only

      const match = digitsOnly.match(/\d{13,19}/);
      if (match) {
        const candidate = match[0];
        if (luhnValidate(candidate)) {
          cardDetails.cardNumber = candidate;
          cardNumberIndex = i;
          matchedLines.cardNumber = {
            idx: i,
            text: item.text,
            bbox: item.bbox,
          };
          console.log(
            "Matched cardNumber (Luhn) at line",
            i,
            item.text,
            prettyBBox(item.bbox)
          );
          break;
        } else if (!cardDetails.cardNumber) {
          cardDetails.cardNumber = candidate; // fallback
          cardNumberIndex = i;
          matchedLines.cardNumber = {
            idx: i,
            text: item.text,
            bbox: item.bbox,
          };
          console.log(
            "Matched cardNumber (no Luhn) at line",
            i,
            item.text,
            prettyBBox(item.bbox)
          );
          // keep searching for Luhn-valid later lines
        }
      }
    }

    // 2) Expiry detection (prefer THRU if present)
    const expiryRegex = /\b(0[1-9]|1[0-2])\/(\d{2}|\d{4})\b/;
    const expiryCandidates: { i: number; val: string; tag?: string }[] = [];
    for (let i = 0; i < lineObjs.length; i++) {
      const item = lineObjs[i];
      const m = item.text.match(expiryRegex);
      if (m)
        expiryCandidates.push({
          i,
          val: m[0],
          tag: item.text.includes("THRU")
            ? "THRU"
            : item.text.includes("FROM")
            ? "FROM"
            : undefined,
        });
      else {
        const all = item.text.match(/\b(0[1-9]|1[0-2])\/(?:\d{2}|\d{4})\b/g);
        if (all && all.length)
          all.forEach((v) => expiryCandidates.push({ i, val: v }));
      }
    }
    if (expiryCandidates.length) {
      const thru = expiryCandidates.find((c) => c.tag === "THRU");
      const chosen = thru || expiryCandidates[expiryCandidates.length - 1];
      cardDetails.expiryDate = chosen.val;
      matchedLines.expiryDate = {
        idx: chosen.i,
        text: lineObjs[chosen.i].text,
        bbox: lineObjs[chosen.i].bbox,
      };
      console.log(
        "Matched expiryDate at line",
        chosen.i,
        lineObjs[chosen.i].text,
        prettyBBox(lineObjs[chosen.i].bbox)
      );
    }

    // 3) CVV - look for "CVV" label then next numeric line, else fallback to standalone 3-4 digits near end
    for (let i = 0; i < lineObjs.length; i++) {
      const item = lineObjs[i];
      if (item.text.includes("CVV")) {
        const next = (lineObjs[i + 1] || {}).text || "";
        if (/^\d{3,4}$/.test(next.replace(/\s+/g, ""))) {
          cardDetails.cvv = next.replace(/\s+/g, "");
          matchedLines.cvv = {
            idx: i + 1,
            text: next,
            bbox: (lineObjs[i + 1] || {}).bbox,
          };
          console.log(
            "Matched CVV from next line at",
            i + 1,
            next,
            prettyBBox((lineObjs[i + 1] || {}).bbox)
          );
          break;
        }
      }
    }
    if (!cardDetails.cvv) {
      for (
        let i = lineObjs.length - 1;
        i >= Math.max(0, lineObjs.length - 6);
        i--
      ) {
        const token = lineObjs[i].text.replace(/\s+/g, "");
        if (/^\d{3,4}$/.test(token)) {
          cardDetails.cvv = token;
          matchedLines.cvv = {
            idx: i,
            text: lineObjs[i].text,
            bbox: lineObjs[i].bbox,
          };
          console.log(
            "Matched CVV fallback at",
            i,
            lineObjs[i].text,
            prettyBBox(lineObjs[i].bbox)
          );
          break;
        }
      }
    }

    // 4) Issuer bank: prefer whitelist entries, avoid disclaimers/phone lines
    for (let i = 0; i < lineObjs.length; i++) {
      const item = lineObjs[i];
      if (isDisclaimerOrPhone(item.text)) continue;
      for (const bank of knownBanks) {
        if (item.text.includes(bank) && !cardDetails.issuerBank) {
          cardDetails.issuerBank = bank;
          matchedLines.issuerBank = {
            idx: i,
            text: item.text,
            bbox: item.bbox,
          };
          console.log(
            "Matched issuerBank by whitelist at",
            i,
            item.text,
            prettyBBox(item.bbox)
          );
        }
      }
    }
    // fallback: any "BANK" token in a short non-numeric line
    if (!cardDetails.issuerBank) {
      for (let i = 0; i < lineObjs.length; i++) {
        const item = lineObjs[i];
        if (
          item.text.includes("BANK") &&
          !/\d/.test(item.text) &&
          !isDisclaimerOrPhone(item.text)
        ) {
          cardDetails.issuerBank = item.text;
          matchedLines.issuerBank = {
            idx: i,
            text: item.text,
            bbox: item.bbox,
          };
          console.log(
            "Matched issuerBank by BANK keyword at",
            i,
            item.text,
            prettyBBox(item.bbox)
          );
          break;
        }
      }
    }

    // 5) Cardholder name: pick nearest good-looking name above the card number index (or fallback top candidate)
    const nameBlacklist = [
      "VALID",
      "NOT",
      "PAYMENT",
      "EXCHANGE",
      "CUSTOMER",
      "PHONEBANKING",
      "AUTHORIZED",
      "SIGNATURE",
      "NOT TRANSFERABLE",
      "SCAN",
      "OPEN",
      "WWW",
      "CARD",
      "TOLL",
      "FREE",
    ];
    const looksLikeName = (txt: string) => {
      if (!/^[A-Z\s]+$/.test(txt)) return false;
      const words = txt.trim().split(" ").filter(Boolean);
      if (words.length < 2 || words.length > 4) return false;
      if (words.some((w) => w.length < 3)) return false;
      if (nameBlacklist.some((kw) => txt.includes(kw))) return false;
      return true;
    };

    if (cardNumberIndex >= 0) {
      for (
        let i = cardNumberIndex - 1;
        i >= Math.max(0, cardNumberIndex - 8);
        i--
      ) {
        if (looksLikeName(lineObjs[i].text)) {
          cardDetails.cardHolderName = lineObjs[i].text;
          matchedLines.cardHolderName = {
            idx: i,
            text: lineObjs[i].text,
            bbox: lineObjs[i].bbox,
          };
          console.log(
            "Matched name (near card number) at",
            i,
            lineObjs[i].text,
            prettyBBox(lineObjs[i].bbox)
          );
          break;
        }
      }
    }

    if (!cardDetails.cardHolderName) {
      for (let i = 0; i < lineObjs.length; i++) {
        if (looksLikeName(lineObjs[i].text)) {
          cardDetails.cardHolderName = lineObjs[i].text;
          matchedLines.cardHolderName = {
            idx: i,
            text: lineObjs[i].text,
            bbox: lineObjs[i].bbox,
          };
          console.log(
            "Matched name (fallback) at",
            i,
            lineObjs[i].text,
            prettyBBox(lineObjs[i].bbox)
          );
          break;
        }
      }
    }

    return { cardDetails, matchedLines };
  };

  // Extract card details from both images
  const extractCardDetails = async () => {
    if (!frontImage && !backImage) {
      await showAlert({
        title: "Missing Images",
        message: "Please capture at least one side of the card.",
      });
      return;
    }

    try {
      setIsProcessing(true);

      const results = await Promise.all([
        frontImage
          ? TextRecognition.recognize(frontImage)
          : Promise.resolve(null),
        backImage
          ? TextRecognition.recognize(backImage)
          : Promise.resolve(null),
      ]);

      const [frontResult, backResult] = results; // these are the OCR outputs

      const frontProcessed = frontResult
        ? processOcrResult(frontResult)
        : { lines: [] };
      const backProcessed = backResult
        ? processOcrResult(backResult)
        : { lines: [] };

      const frontParsed = parseOcrResult(frontProcessed.lines);
      const backParsed = parseOcrResult(backProcessed.lines);

      const combined: any = {
        ...frontParsed.cardDetails,
        ...backParsed.cardDetails,
      };

      // if both sides have different cardNumber, pick Luhn-valid
      if (
        frontParsed.cardDetails.cardNumber &&
        backParsed.cardDetails.cardNumber &&
        frontParsed.cardDetails.cardNumber !== backParsed.cardDetails.cardNumber
      ) {
        if (luhnValidate(backParsed.cardDetails.cardNumber))
          combined.cardNumber = backParsed.cardDetails.cardNumber;
        else if (luhnValidate(frontParsed.cardDetails.cardNumber))
          combined.cardNumber = frontParsed.cardDetails.cardNumber;
      }

      // Log matched lines for debugging
      console.log("Front matched lines:", frontParsed.matchedLines);
      console.log("Back matched lines:", backParsed.matchedLines);
      console.log("Combined extracted details:", combined);

      await showAlert({
        title: "Card Details Extracted",
        message: "Review the extracted details in next screen.",
      });

      // After successful OCR extraction
      const navigateBackWithDetails = () => {
        router.push({
          pathname: "/add-card",
          params: {
            defaultCardNumber: combined.cardNumber,
            defaultCardHolder: combined.cardHolderName,
            defaultExpiry: combined.expiryDate,
            defaultCvv: combined.cvv, // you extracted this too
            fromExtract: "true",
          },
        });
      };

      navigateBackWithDetails();
    } catch (error) {
      console.error("OCR Error:", error);
      await showAlert({
        title: "Error",
        message: "Failed to process the images. Please try again.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // const saveCard = () => {
  //   Alert.alert("Card Saved", "Your card has been saved successfully!", [
  //     { text: "OK", onPress: () => router.push("/") },
  //   ]);
  // };

  const captureBack = () => {
    router.push({
      pathname: "/add-card/scan",
      params: { frontUri: frontImage },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={{ alignSelf: "stretch", marginBottom: 20 }}>
          <Hero
            title="Preview & Extract"
            subtitle="Confirm images, then Extract"
            tone="dark"
            surfaceColor="#000"
          />
        </View>
        {/* FRONT SECTION */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Front of Card</Text>
          {frontImage ? (
            <Image
              source={{ uri: frontImage }}
              style={styles.cardImage}
              resizeMode="contain"
            />
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
            <Image
              source={{ uri: backImage }}
              style={styles.cardImage}
              resizeMode="contain"
            />
          ) : (
            <TouchableOpacity
              style={styles.captureBackButtonContainer}
              onPress={captureBack}
            >
              <Text style={styles.captureBackButtonText}>Capture Back</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {frontImage && backImage && (
            <TouchableOpacity
              style={[styles.button, styles.ocrButton]}
              onPress={extractCardDetails}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Extract Text</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  cardSection: { marginVertical: 12, paddingHorizontal: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 6,
  },
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
  placeholder: {
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
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
  textTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  textScrollView: { maxHeight: 150 },
  extractedText: { fontSize: 14, lineHeight: 20, color: "#333" },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 20,
  },
  button: { padding: 12, borderRadius: 8, minWidth: 120, alignItems: "center" },
  ocrButton: { backgroundColor: "#007AFF" },
  saveButton: { backgroundColor: "#34C759" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
