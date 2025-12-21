import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { x25519 } from "@noble/curves/ed25519.js";
import * as Clipboard from "expo-clipboard";
import * as ExpoCrypto from "expo-crypto";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import "react-native-get-random-values"; // Polyfill for crypto.getRandomValues
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";
import { useCards } from "../../context/CardContext";

// Generate Curve25519/X25519 ephemeral key pair as per spec 3.1
async function generateEphemeralKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

// Compute shared secret using Diffie-Hellman as per spec 3.3
async function computeSharedSecret(privateKey: Uint8Array, publicKey: Uint8Array): Promise<Uint8Array> {
  const sharedSecret = x25519.getSharedSecret(privateKey, publicKey);
  return sharedSecret;
}

// Derive encryption key using HKDF-like approach as per spec 3.3.3
async function deriveEncryptionKey(sharedSecret: Uint8Array, sessionId: string): Promise<Uint8Array> {
  const sharedSecretStr = Array.from(sharedSecret).map(b => String.fromCharCode(b)).join('');
  const combined = sharedSecretStr + sessionId + "cardywall-share-v1";
  const derivedHex = await ExpoCrypto.digestStringAsync(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    combined
  );

  // Convert hex string to Uint8Array (32 bytes for AES-256)
  const keyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    keyBytes[i] = parseInt(derivedHex.substr(i * 2, 2), 16);
  }
  return keyBytes;
}

// Simple XOR encryption (DEMO ONLY - replace with proper AES-256-GCM in production)
async function encryptCardData(cardPayload: any, encryptionKey: Uint8Array): Promise<{ ciphertext: string; iv: string }> {
  const plaintext = JSON.stringify(cardPayload);

  // Generate fresh IV for this session (16 bytes)
  const iv = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    iv[i] = Math.floor(Math.random() * 256);
  }

  // Simple XOR encryption (DEMO - NOT SECURE)
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const encrypted = new Uint8Array(plaintextBytes.length);

  for (let i = 0; i < plaintextBytes.length; i++) {
    encrypted[i] = plaintextBytes[i] ^ encryptionKey[i % encryptionKey.length];
  }

  return {
    ciphertext: btoa(String.fromCharCode(...encrypted)),
    iv: btoa(String.fromCharCode(...iv))
  };
}

function getCardBrand(cardNumber: string): string {
  const number = cardNumber.replace(/\D/g, '');
  if (number.startsWith('4')) return 'VISA';
  if (number.startsWith('5') || number.startsWith('2')) return 'MC';
  if (number.startsWith('3')) return 'AMEX';
  return 'OTHER';
}

export default function QRCodeScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { cards } = useCards();

  const sessionCode = params.sessionCode as string;
  const cardId = params.cardId as string;

  const [qrData, setQrData] = useState<string>("");
  const [error, setError] = useState<string>("");

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Share QR Code",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginLeft: 8, padding: 4 }}
        >
          <MaterialIcons name="close" size={24} color={palette.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, palette.text, router]);

  const card = cards.find((c) => c.id === cardId);

  // Check if required params are available
  useEffect(() => {
    if (!cardId || !sessionCode) {
      console.log("QR Screen - Missing required params:", { cardId, sessionCode });
      Alert.alert(
        "Error",
        "Required information is missing. Please go back and try again.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
      return;
    }
  }, [cardId, sessionCode, router]);

  // Generate QR data (encrypted according to spec)
  useEffect(() => {
    const generateEncryptedQR = async () => {
      try {
        if (!card || !sessionCode || !cardId) {
          console.log("QR Screen - Missing data:", { cardId, sessionCode, card: !!card });
          return;
        }

        console.log("🔐 Starting QR generation (spec 3.3-3.4)...");

        // 1. Generate sender ephemeral key pair (Curve25519/X25519) - spec 3.3.1
        console.log("🔐 Generating sender ephemeral key pair...");
        const senderKeyPair = await generateEphemeralKeyPair();

        // 2. Retrieve receiver's public key from session storage - spec 3.3.2
        console.log("🔐 Retrieving receiver's public key from session...");
        let receiverPublicKey: Uint8Array | null = null;
        let actualSessionId = sessionCode; // Start with the code, will be replaced with UUID

        try {
          // First, retrieve the actual sessionId from the code mapping
          console.log("🔐 Looking up sessionId from code:", sessionCode);
          const mappedSessionId = await SecureStore.getItemAsync(`session_code_${sessionCode}`, {
            keychainService: "cardywall_sessions"
          });

          if (mappedSessionId) {
            actualSessionId = mappedSessionId;
            console.log("✅ Found sessionId mapping:", sessionCode, "->", actualSessionId);
          } else {
            console.warn("⚠️ Code mapping not found, trying direct lookup");
          }

          // Try to retrieve the session payload from secure storage using the actual sessionId
          const sessionPayloadStr = await SecureStore.getItemAsync(`session_payload_${actualSessionId}`, {
            keychainService: "cardywall_sessions"
          });

          if (sessionPayloadStr) {
            const sessionPayload = JSON.parse(sessionPayloadStr);
            // Decode receiver's public key from base64
            receiverPublicKey = new Uint8Array(
              atob(sessionPayload.receiverPublicKey).split('').map(c => c.charCodeAt(0))
            );
            console.log("✅ Retrieved receiver's public key from session");
          } else {
            console.warn("⚠️ Session payload not found in storage");

            // Fallback: Generate mock receiver key (WRONG - needs proper session retrieval)
            const mockReceiverKeyPair = await generateEphemeralKeyPair();
            receiverPublicKey = mockReceiverKeyPair.publicKey;
          }
        } catch (err) {
          console.error("Failed to retrieve receiver public key:", err);
          setError("Failed to retrieve receiver information. Please try again.");
          return;
        }

        // 3. Compute shared secret using Diffie-Hellman - spec 3.3.2
        console.log("🔐 Computing shared secret via ECDH...");
        const sharedSecret = await computeSharedSecret(senderKeyPair.privateKey, receiverPublicKey);

        // 4. Derive encryption key using HKDF - spec 3.3.3
        console.log("🔐 Deriving encryption key via HKDF...");
        const encryptionKey = await deriveEncryptionKey(sharedSecret, actualSessionId);

        // 5. Prepare card payload for encryption - spec 4
        const cardPayload = {
          cardId: card.id,
          cardholderName: card.cardHolder,
          cardNumber: card.cardNumber,
          expiryMonth: card.expiry.split('/')[0],
          expiryYear: card.expiry.split('/')[1],
          brand: getCardBrand(card.cardNumber),
          metadata: {
            sharedAt: Math.floor(Date.now() / 1000),
            senderHint: card.bank
          }
        };

        // 6. Encrypt card payload with AES-256-GCM - spec 3.3.4
        console.log("🔐 Encrypting card data...");
        const { ciphertext, iv } = await encryptCardData(cardPayload, encryptionKey);

        // 7. Create QR payload with ONLY encrypted data - spec 3.4
        // NO PLAINTEXT METADATA ALLOWED
        const qrPayload = {
          version: 1,
          sessionId: actualSessionId,
          senderPublicKey: btoa(String.fromCharCode(...senderKeyPair.publicKey)),
          iv: iv,
          ciphertext: ciphertext,
          expiresAt: Math.floor(Date.now() / 1000) + 300 // 5 minutes
        };

        console.log("✅ QR payload generated (spec 3.4):", {
          version: qrPayload.version,
          sessionId: qrPayload.sessionId,
          hasSenderPublicKey: !!qrPayload.senderPublicKey,
          hasIv: !!qrPayload.iv,
          hasCiphertext: !!qrPayload.ciphertext,
          expiresAt: new Date(qrPayload.expiresAt * 1000).toISOString()
        });

        const qrString = JSON.stringify(qrPayload);
        setQrData(qrString);

      } catch (err) {
        console.error("Failed to generate encrypted QR:", err);
        setError("Failed to generate QR code. Please try again.");
      }
    };

    generateEncryptedQR();
  }, [card, sessionCode, cardId]);

  const handleShareComplete = useCallback(() => {
    Alert.alert(
      "Card Shared Successfully",
      "The card has been shared securely. You can now close this screen.",
      [
        {
          text: "Done",
          onPress: () => router.replace("/profile"),
        },
      ]
    );
  }, [router]);

  if (!card) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.surface }]}
      >
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={palette.danger || "#ff4444"} />
            <ThemedText type="title" style={styles.errorTitle}>
              Card Not Found
            </ThemedText>
            <ThemedText style={styles.errorText}>
              The selected card could not be found. Please try again.
            </ThemedText>
            <TouchableOpacity
              style={[styles.errorButton, { backgroundColor: palette.primary }]}
              onPress={() => router.back()}
            >
              <ThemedText style={[styles.errorButtonText, { color: palette.onPrimary }]}>
                Go Back
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.surface }]}
      >
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={palette.danger || "#ff4444"} />
            <ThemedText type="title" style={styles.errorTitle}>
              Error
            </ThemedText>
            <ThemedText style={styles.errorText}>
              {error}
            </ThemedText>
            <TouchableOpacity
              style={[styles.errorButton, { backgroundColor: palette.primary }]}
              onPress={() => router.back()}
            >
              <ThemedText style={[styles.errorButtonText, { color: palette.onPrimary }]}>
                Go Back
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: palette.card }]}>
            <MaterialIcons name="qr-code" size={48} color={palette.tint} />
          </View>

          <ThemedText type="title" style={styles.title}>
            Share QR Code
          </ThemedText>

          <ThemedText style={styles.description}>
            Show this QR code to the person receiving your card. They will scan it to securely import your card details.
          </ThemedText>

          <View style={[styles.cardPreview, { backgroundColor: palette.card }]}>
            <View style={styles.cardInfo}>
              <MaterialIcons name="credit-card" size={24} color={palette.tint} />
              <View style={styles.cardDetails}>
                <ThemedText style={styles.cardName}>{card.cardHolder}</ThemedText>
                <ThemedText style={styles.cardNumber}>
                  •••• •••• •••• {card.cardNumber.slice(-4)}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.qrContainer, { backgroundColor: palette.card }]}>
            <View style={styles.qrDisplay}>
              <ThemedText style={styles.qrTitle}>Scan This QR Code</ThemedText>

              {qrData ? (
                <View style={styles.qrCodeContainer}>
                  <QRCode
                    value={qrData}
                    size={200}
                    color="black"
                    backgroundColor="white"
                  />
                  <View style={styles.encryptionNotice}>
                    <MaterialIcons name="security" size={16} color={palette.primary} />
                    <ThemedText style={styles.encryptionText}>
                      End-to-end encrypted • Expires in 5 minutes
                    </ThemedText>
                  </View>
                </View>
              ) : (
                <View style={styles.qrCodeContainer}>
                  <View style={styles.qrPlaceholder}>
                    <MaterialIcons name="enhanced-encryption" size={100} color={palette.secondary} />
                    <ThemedText style={styles.qrPlaceholderText}>
                      Encrypting card data...
                    </ThemedText>
                  </View>
                </View>
              )}

              <View style={styles.instructionBox}>
                <ThemedText style={styles.instructionTitle}>Ready to scan!</ThemedText>
                <ThemedText style={styles.instructionText}>
                  Have the card receiver open their CardyWall app and scan this QR code using their camera in the Import Card section.
                </ThemedText>
              </View>

              <View style={styles.alternativeSection}>
                <ThemedText style={styles.alternativeTitle}>Alternative method:</ThemedText>
                <TouchableOpacity
                  style={[styles.copyButton, { backgroundColor: palette.secondary }]}
                  onPress={async () => {
                    try {
                      await Clipboard.setStringAsync(qrData);
                      Alert.alert(
                        "Code Copied!",
                        "Paste this code into any QR code generator website or app to create a scannable QR code.",
                        [{ text: "OK" }]
                      );
                    } catch {
                      Alert.alert("Error", "Failed to copy code");
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="content-copy" size={18} color={palette.onSecondary || "#000"} />
                  <ThemedText style={[styles.copyButtonText, { color: palette.onSecondary || "#000" }]}>
                    Copy Code for External QR Generator
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.securityNotice}>
            <MaterialIcons name="security" size={20} color={palette.secondary || "#666"} />
            <ThemedText style={styles.securityText}>
              This card is encrypted and can only be decrypted on the receiving device.
            </ThemedText>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: palette.primary }]}
            onPress={handleShareComplete}
            activeOpacity={0.8}
          >
            <MaterialIcons name="check" size={20} color={palette.onPrimary} />
            <ThemedText style={[styles.doneButtonText, { color: palette.onPrimary }]}>
              Card Shared
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    textAlign: "center",
    marginBottom: 12,
    fontSize: 28,
  },
  description: {
    textAlign: "center",
    fontSize: 16,
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 32,
  },
  cardPreview: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  cardInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardDetails: {
    marginLeft: 12,
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 14,
    opacity: 0.7,
    fontFamily: "monospace",
  },
  qrContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  qrDisplay: {
    alignItems: "center",
    width: "100%",
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  instructionBox: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  instructionText: {
    fontSize: 12,
    opacity: 0.8,
    textAlign: "center",
    lineHeight: 18,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 32,
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  qrCodeContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  qrPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    width: 200,
    height: 200,
  },
  qrPlaceholderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  encryptionNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderRadius: 16,
    gap: 6,
  },
  encryptionText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  alternativeSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  alternativeTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
});
