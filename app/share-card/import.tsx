import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { x25519 } from "@noble/curves/ed25519.js";
import { Camera, CameraView } from "expo-camera";
import { useNavigation, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Alert, Animated, AppState, Easing, StyleSheet, TouchableOpacity, View } from "react-native";
import "react-native-get-random-values"; // Polyfill for crypto.getRandomValues
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";
import { useCards } from "../../context/CardContext";

// Cryptographic helper function (duplicate from qr.tsx for import functionality)
async function generateEphemeralKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
  // Generate Curve25519/X25519 ephemeral key pair as per spec 3.1
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);

  return {
    publicKey: publicKey,    // Raw bytes (32 bytes)
    privateKey: privateKey   // Raw bytes (32 bytes)
  };
}

export default function ImportCardScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();
  const { addCard } = useCards();

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scanLineAnimation = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Import Card",
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

  // Request camera permissions
  useEffect(() => {
    const getCameraPermissions = async () => {
      try {
        console.log('Requesting camera permissions...');
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log('Camera permission status:', status);
        setHasPermission(status === "granted");
      } catch (error) {
        console.error('Error requesting camera permissions:', error);
        setHasPermission(false);
      }
    };

    getCameraPermissions();
  }, []);

  // Clean up any active sessions when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state === "background" || state === "inactive") {
        console.log("📱 Import screen: App going to background, cleaning up active sessions...");
        // Note: We don't know which sessions are active here, so we rely on
        // the receive screen and successful import to clean up
      }
    });

    return () => subscription.remove();
  }, []);

  const handleScanQR = useCallback(() => {
    console.log('handleScanQR called');
    console.log('hasPermission:', hasPermission);
    console.log('isScanning:', isScanning);

    if (hasPermission === null) {
      console.log('Requesting camera permission...');
      Alert.alert("Camera permission is required to scan QR codes");
      return;
    }
    if (hasPermission === false) {
      console.log('Camera permission denied');
      Alert.alert("Camera permission denied", "Please enable camera permissions in settings to scan QR codes");
      return;
    }

    console.log('Starting camera scan...');
    setIsScanning(true);

    // Start scan line animation
    scanLineAnimation.setValue(0);
    Animated.loop(
      Animated.timing(scanLineAnimation, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [hasPermission, scanLineAnimation, isScanning]);



  const handleBarCodeScanned = useCallback(({ type, data }: { type: string; data: string }) => {
    setIsScanning(false);
    scanLineAnimation.stopAnimation();
    setIsProcessing(true);

    setTimeout(async () => {
      try {
        const qrData = JSON.parse(data);

        // FOLLOW SPEC 3.5: Validate QR data structure
        if (qrData.version && qrData.sessionId && qrData.senderPublicKey && qrData.ciphertext && qrData.iv) {
          // Check if QR code hasn't expired (5 minutes)
          if (Date.now() > qrData.expiresAt * 1000) {
            setIsProcessing(false);
            Alert.alert(
              "QR Code Expired",
              "This card sharing QR code has expired. Please ask the sender to generate a new one."
            );
            return;
          }

          try {
            console.log("🔐 Starting decryption process (spec 3.5)...");

            // Retrieve receiver's private key from session storage
            const sessionId = qrData.sessionId;
            const privateKeyBase64 = await SecureStore.getItemAsync(`session_private_${sessionId}`, {
              keychainService: "cardywall_sessions"
            });

            if (!privateKeyBase64) {
              setIsProcessing(false);
              Alert.alert(
                "Session Not Found",
                "This QR code doesn't match any active session on this device. Make sure you're using the same device that initiated the card sharing."
              );
              return;
            }

            // Decode receiver's private key
            const receiverPrivateKey = new Uint8Array(
              atob(privateKeyBase64).split('').map(c => c.charCodeAt(0))
            );

            // 1. Decode sender's public key from QR
            const senderPublicKey = new Uint8Array(
              atob(qrData.senderPublicKey).split('').map(c => c.charCodeAt(0))
            );

            // 2. Compute shared secret: DH(receiverPrivateKey, senderPublicKey) - spec 3.5.2
            const sharedSecret = x25519.getSharedSecret(receiverPrivateKey, senderPublicKey);

            // 3. Derive encryption key using same approach as encryption - spec 3.5.3
            const sharedSecretStr = Array.from(sharedSecret).map(b => String.fromCharCode(b)).join('');
            const combined = sharedSecretStr + sessionId + "cardywall-share-v1";
            const Crypto = await import("expo-crypto");
            const derivedHex = await Crypto.digestStringAsync(
              Crypto.CryptoDigestAlgorithm.SHA256,
              combined
            );

            // Convert hex to Uint8Array
            const encryptionKey = new Uint8Array(32);
            for (let i = 0; i < 32; i++) {
              encryptionKey[i] = parseInt(derivedHex.substr(i * 2, 2), 16);
            }

            // 4. Decrypt using same XOR approach as encryption (DEMO)
            const encryptedBytes = atob(qrData.ciphertext).split('').map(c => c.charCodeAt(0));
            const decrypted = encryptedBytes.map((byte, i) =>
              byte ^ encryptionKey[i % encryptionKey.length]
            );

            const decryptedText = String.fromCharCode(...decrypted);
            const cardData = JSON.parse(decryptedText);
            console.log("✅ Card data decrypted (spec 3.5):", cardData);

            // Map decrypted card data to Card format
            const cardToImport = {
              id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              cardNumber: cardData.cardNumber,
              cardHolder: cardData.cardholderName,
              expiry: `${cardData.expiryMonth}/${cardData.expiryYear}`,
              cvv: "",
              cardName: cardData.metadata?.senderHint || `${cardData.brand} Card`,
              cardKind: (cardData.brand === "AMEX" ? "credit" : "debit") as "credit" | "debit",
              cobrandName: undefined,
              cardUser: "other" as "self" | "other",
              dominantColor: undefined,
              bank: cardData.metadata?.senderHint || "Imported Card"
            };

            console.log("💳 Importing card:", cardToImport);

            // Save the imported card
            await addCard(cardToImport);

            // Clean up session keys after successful import (spec 3.5.6)
            await SecureStore.deleteItemAsync(`session_private_${sessionId}`, {
              keychainService: "cardywall_sessions"
            });
            await SecureStore.deleteItemAsync(`session_payload_${sessionId}`, {
              keychainService: "cardywall_sessions"
            });
            // Also delete the code mapping if it exists
            try {
              await SecureStore.deleteItemAsync(`session_code_${sessionId}`, {
                keychainService: "cardywall_sessions"
              });
            } catch {
              // Code mapping might not exist, that's ok
            }
            console.log("✅ Session cleaned up after successful import");

            setIsProcessing(false);
            Alert.alert(
              "Card Added Successfully",
              `Imported card from ${cardToImport.bank || 'Unknown Bank'}.\n\nThis card is stored securely on your device only.`,
              [
                {
                  text: "View My Cards",
                  onPress: () => router.replace("/"),
                },
                {
                  text: "Done",
                  style: "cancel",
                  onPress: () => router.replace("/profile"),
                },
              ]
            );
          } catch (decryptError) {
            console.error("Failed to decrypt card data:", decryptError);
            setIsProcessing(false);
            Alert.alert(
              "Decryption Failed",
              "Could not decrypt the card data. The QR code may be corrupted or from a different session."
            );
            return;
          }
        } else {
          setIsProcessing(false);
          Alert.alert(
            "Invalid QR Code",
            "This QR code doesn't contain a valid CardyWall card. Make sure you're scanning a card shared from CardyWall."
          );
        }
      } catch {
        setIsProcessing(false);
        Alert.alert(
          "Couldn't Read Card",
          "This QR code doesn't contain card information. Try scanning again with a card shared from CardyWall."
        );
      }
    }, 1500);
  }, [router, scanLineAnimation, addCard]);

  const handleManualEntry = useCallback(() => {
    Alert.alert(
      "Manual Entry",
      "For now, please use the camera to scan QR codes. Manual entry will be available in a future update.",
      [{ text: "OK" }]
    );
  }, []);

  return (
    <>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.surface }]}
      >
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={[styles.iconContainer, { backgroundColor: palette.card }]}>
              <MaterialIcons name="qr-code-scanner" size={48} color={palette.tint} />
            </View>

            <ThemedText type="title" style={styles.title}>
              Import Card
            </ThemedText>

            <ThemedText style={styles.description}>
              Someone shared a card with you? Scan their QR code to add it safely to your collection.
              Your card stays private and secure on your device.
            </ThemedText>

            {/* Debug info - remove in production */}
            <ThemedText style={{ fontSize: 10, color: 'red', marginTop: 8 }}>
              Debug: Permission: {hasPermission === null ? 'checking' : hasPermission ? 'granted' : 'denied'}
            </ThemedText>

            <View style={[styles.scanArea, { backgroundColor: palette.card }]}>
              {isProcessing ? (
                <View style={styles.processingContainer}>
                  <View style={styles.processingAnimation}>
                    <MaterialIcons name="security" size={60} color={palette.primary} />
                    <View style={[styles.processingSpinner, { borderColor: palette.primary }]} />
                  </View>
                  <ThemedText style={styles.processingText}>
                    Adding card securely...
                  </ThemedText>
                  <ThemedText style={styles.processingSubtext}>
                    This card will only work on your device
                  </ThemedText>
                </View>
              ) : isScanning ? (
                hasPermission ? (
                  <CameraView
                    style={styles.camera}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ["qr"],
                    }}
                    onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
                    onCameraReady={() => {
                      console.log('Camera is ready for scanning');
                    }}
                    onMountError={(error) => {
                      console.error('Camera mount error:', error);
                      Alert.alert('Camera Error', 'Unable to access camera. Please check permissions.');
                      setIsScanning(false);
                      scanLineAnimation.stopAnimation();
                    }}
                  >
                    <View style={styles.cameraOverlay}>
                      <View style={styles.scanFrame}>
                        <Animated.View
                          style={[
                            styles.scanLine,
                            {
                              backgroundColor: palette.primary,
                              transform: [{
                                translateY: scanLineAnimation.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, 160], // Move from top to bottom of frame
                                }),
                              }],
                            },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.cameraText}>
                        Center the QR code in the frame
                      </ThemedText>
                    </View>
                  </CameraView>
                ) : (
                  <View style={styles.errorContainer}>
                    <MaterialIcons name="no-photography" size={60} color={palette.danger} />
                    <ThemedText style={styles.errorTitle}>Camera Access Needed</ThemedText>
                    <ThemedText style={styles.errorText}>
                      Please allow camera access in your device settings to scan QR codes.
                    </ThemedText>
                  </View>
                )
              ) : (
                <View style={styles.scanPlaceholder}>
                  <View style={styles.placeholderIcon}>
                    <MaterialIcons name="qr-code-2" size={80} color={palette.secondary} />
                  </View>
                  <ThemedText style={styles.scanPlaceholderText}>
                    Ready to scan when you tap the button below
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={styles.instructions}>
              <ThemedText style={styles.instructionTitle}>Ready to add a card?</ThemedText>
              <View style={styles.instructionItem}>
                <ThemedText style={styles.instructionNumber}>1</ThemedText>
                <ThemedText style={styles.instructionText}>
                  Have the person show you their QR code
                </ThemedText>
              </View>
              <View style={styles.instructionItem}>
                <ThemedText style={styles.instructionNumber}>2</ThemedText>
                <ThemedText style={styles.instructionText}>
                  Tap &quot;Scan QR Code&quot; below
                </ThemedText>
              </View>
              <View style={styles.instructionItem}>
                <ThemedText style={styles.instructionNumber}>3</ThemedText>
                <ThemedText style={styles.instructionText}>
                  Hold your camera over the QR code
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            {!isScanning && !isProcessing && (
              <>
                <TouchableOpacity
                  style={[styles.scanButton, { backgroundColor: palette.primary }]}
                  onPress={handleScanQR}
                  activeOpacity={0.8}
                  accessibilityLabel="Scan QR code to import card"
                  accessibilityHint="Opens camera to scan a QR code containing card information"
                >
                  <MaterialIcons name="qr-code-scanner" size={24} color={palette.onPrimary} />
                  <ThemedText style={[styles.scanButtonText, { color: palette.onPrimary }]}>
                    Scan QR Code
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.manualButton, { borderColor: palette.border }]}
                  onPress={handleManualEntry}
                  activeOpacity={0.7}
                  accessibilityLabel="Manual entry not available"
                >
                  <MaterialIcons name="keyboard" size={20} color={palette.text} />
                  <ThemedText style={styles.manualButtonText}>
                    Manual Entry
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}

            {isScanning && (
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                onPress={() => {
                  setIsScanning(false);
                  scanLineAnimation.stopAnimation();
                }}
                activeOpacity={0.7}
                accessibilityLabel="Cancel QR scanning"
              >
                <ThemedText style={styles.cancelButtonText}>
                  Stop Scanning
                </ThemedText>
              </TouchableOpacity>
            )}

            {isProcessing && (
              <View style={styles.processingButton}>
                <ThemedText style={[styles.processingButtonText, { color: palette.secondary }]}>
                  Please wait...
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>

    </>
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
  scanArea: {
    height: 300,
    borderRadius: 16,
    marginBottom: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  cameraText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  scanPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  scanPlaceholderText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: 20,
  },
  processingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  processingAnimation: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  processingSpinner: {
    position: "absolute",
    width: 80,
    height: 80,
    borderWidth: 3,
    borderRadius: 40,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  processingText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  processingSubtext: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  scanningAnimation: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  scanLine: {
    position: "absolute",
    top: 40,
    width: 120,
    height: 2,
    borderRadius: 1,
  },
  scanningText: {
    fontSize: 16,
    opacity: 0.8,
    marginTop: 24,
  },
  instructions: {
    marginTop: 16,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    color: "white",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 12,
    marginTop: 2,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  manualButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  processingButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  processingButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

