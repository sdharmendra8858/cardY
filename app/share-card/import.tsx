import AlertBox from "@/components/AlertBox";
import Hero from "@/components/Hero";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  decryptCardFromQR,
  validateQRPayload,
} from "@/utils/cardSharing";
import { parseCardQRString } from "@/utils/qr";
import {
  canUseSession,
  deleteSession,
  markSessionAsUsed,
  retrieveSession,
} from "@/utils/session";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Camera, CameraView } from "expo-camera";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, AppState, Easing, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";
import { useCards } from "../../context/CardContext";

export default function ImportCardScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();
  const { addCard } = useCards();

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; buttons?: any[] }>({ title: "", message: "" });

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

  const handleScanQR = useCallback(async () => {
    console.log('handleScanQR called');

    try {
      console.log('Requesting camera permissions...');
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);

      if (status !== "granted") {
        setAlertConfig({
          title: "Camera permission denied",
          message: "Please enable camera permissions in settings to scan QR codes",
          buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
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
    } catch (error) {
      console.error('Error requesting camera permissions:', error);
      setAlertConfig({
        title: "Error",
        message: "Failed to access camera",
        buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  }, [scanLineAnimation]);



  const handleBarCodeScanned = useCallback(({ data }: { type: string; data: string }) => {
    setIsScanning(false);
    scanLineAnimation.stopAnimation();
    setIsProcessing(true);

    setTimeout(async () => {
      try {
        // Spec 10: Card decryption on Device A
        console.log("🔐 Starting card import process (spec 10)...");

        // Parse QR code string to QR payload
        const qrPayload = parseCardQRString(data);

        // Validate QR payload structure (spec 9.1)
        if (!validateQRPayload(qrPayload)) {
          setIsProcessing(false);
          setAlertConfig({
            title: "Invalid QR Code",
            message: "This QR code doesn't contain a valid CardyWall card. Make sure you're scanning a card shared from CardyWall.",
            buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
          });
          setAlertVisible(true);
          return;
        }

        // Retrieve receiver's session from storage (spec 10.1)
        const sessionId = qrPayload.sessionId;
        const session = await retrieveSession(sessionId);

        if (!session) {
          setIsProcessing(false);
          setAlertConfig({
            title: "Session Not Found",
            message: "This QR code doesn't match any active session on this device. Make sure you're using the same device that initiated the card sharing.",
            buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
          });
          setAlertVisible(true);
          return;
        }

        // Validate session can be used (spec 10.1)
        if (!canUseSession(session)) {
          setIsProcessing(false);
          setAlertConfig({
            title: "Session Expired or Already Used",
            message: "This card sharing session has expired or was already used. Please ask the sender to generate a new QR code.",
            buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
          });
          setAlertVisible(true);
          return;
        }

        try {
          // Decrypt card from QR (spec 10.2-10.4)
          const cardData = await decryptCardFromQR(
            qrPayload,
            session.receiverPrivateKey
          );
          console.log("✅ Card data decrypted (spec 10):", cardData);

          // Map decrypted card data to Card format
          const cardToImport = {
            id: `imported_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
            cardNumber: cardData.cardNumber,
            cardHolder: cardData.cardholderName,
            expiry: `${cardData.expiryMonth}/${cardData.expiryYear}`,
            cvv: "",
            cardName: `${cardData.brand} Card`,
            cardKind: cardData.cardKind || "credit" as "credit" | "debit", // Use shared value or default
            cobrandName: cardData.cobrandName || "", // Use shared value or empty
            cardUser: "other" as "self" | "other",
            dominantColor: cardData.dominantColor || "#1E90FF", // Use shared color or default blue
            bank: cardData.bank || "", // Use shared bank or empty
            cardExpiresAt: cardData.cardExpiresAt, // Set expiry from shared data
            isPinned: false, // Imported cards always start unpinned (device-specific property)
          };

          console.log("💳 Importing card:", cardToImport);

          // Save the imported card
          await addCard(cardToImport);

          // Mark session as used (spec 10.5)
          await markSessionAsUsed(sessionId);

          // Delete session after successful import (spec 10.5)
          await deleteSession(sessionId);
          console.log("✅ Session cleaned up after successful import");

          setIsProcessing(false);
          setAlertConfig({
            title: "Card Added Successfully",
            message: `Imported ${cardToImport.bank || cardToImport.cardName}.\n\nThis card is stored securely on your device only.`,
            buttons: [
              {
                text: "View Card Details",
                onPress: () => router.replace(`/card-details/${cardToImport.id}`),
              },
              {
                text: "View All Cards",
                onPress: () => router.replace("/"),
              },
              {
                text: "Done",
                style: "cancel",
                onPress: () => router.replace("/profile"),
              },
            ]
          });
          setAlertVisible(true);
        } catch (decryptError) {
          console.error("Failed to decrypt card data:", decryptError);
          setIsProcessing(false);
          setAlertConfig({
            title: "Decryption Failed",
            message: "Could not decrypt the card data. The QR code may be corrupted or from a different session.",
            buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
          });
          setAlertVisible(true);
          return;
        }
      } catch (error) {
        console.error("Failed to parse QR code:", error);
        setIsProcessing(false);
        setAlertConfig({
          title: "Couldn't Read Card",
          message: "This QR code doesn't contain card information. Try scanning again with a card shared from CardyWall.",
          buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
      }
    }, 1500);
  }, [router, scanLineAnimation, addCard]);


  return (
    <>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.surface }]}
      >
        <Hero
          title="Import Card"
          subtitle="Scan a QR code to securely add a shared card"
          showBackButton={true}
        />
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={[styles.scanArea, { backgroundColor: palette.card }]}>
              {isProcessing ? (
                <View style={styles.processingContainer}>
                  <View style={styles.processingAnimation}>
                    <MaterialIcons name="security" size={60} color={palette.primary} />
                    <View style={[styles.processingSpinner, { borderColor: palette.primary }]} />
                  </View>
                  <ThemedText style={[styles.processingText, { color: palette.text }]}>
                    Adding card securely...
                  </ThemedText>
                  <ThemedText style={[styles.processingSubtext, { color: palette.secondary }]}>
                    This card will only work on your device
                  </ThemedText>
                </View>
              ) : isScanning ? (
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
                    setAlertConfig({
                      title: 'Camera Error',
                      message: 'Unable to access camera. Please check permissions.',
                      buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
                    });
                    setAlertVisible(true);
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
                                outputRange: [0, 200],
                              }),
                            }],
                          },
                        ]}
                      />
                    </View>
                    <ThemedText style={[styles.cameraText, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
                      Center the QR code in the frame
                    </ThemedText>
                  </View>
                </CameraView>
              ) : (
                <View style={styles.scanPlaceholder}>
                  <View style={[styles.placeholderIcon, { backgroundColor: palette.card }]}>
                    <MaterialIcons name="qr-code-2" size={80} color={palette.secondary} />
                  </View>
                  <ThemedText style={[styles.scanPlaceholderText, { color: palette.text }]}>
                    Ready to scan when you tap the button below
                  </ThemedText>
                </View>
              )}
            </View>

            <View style={[styles.instructions, { backgroundColor: palette.card }]}>
              <ThemedText style={[styles.instructionTitle, { color: palette.text }]}>Ready to add a card?</ThemedText>
              <View style={styles.instructionItem}>
                <ThemedText style={[styles.instructionNumber, { backgroundColor: palette.primary }]}>1</ThemedText>
                <ThemedText style={styles.instructionText}>
                  Have the person show you their QR code
                </ThemedText>
              </View>
              <View style={styles.instructionItem}>
                <ThemedText style={[styles.instructionNumber, { backgroundColor: palette.primary }]}>2</ThemedText>
                <ThemedText style={styles.instructionText}>
                  Tap &quot;Scan QR Code&quot; below
                </ThemedText>
              </View>
              <View style={styles.instructionItem}>
                <ThemedText style={[styles.instructionNumber, { backgroundColor: palette.primary }]}>3</ThemedText>
                <ThemedText style={styles.instructionText}>
                  Hold your camera over the QR code
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            {!isScanning && !isProcessing && (
              <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: palette.primary, marginTop: 24 }]}
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
            )}

            {isScanning && (
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
                onPress={() => {
                  setIsScanning(false);
                  scanLineAnimation.stopAnimation();
                }}
                activeOpacity={0.7}
                accessibilityLabel="Cancel QR scanning"
              >
                <ThemedText style={[styles.cancelButtonText, { color: palette.text }]}>
                  Stop Scanning
                </ThemedText>
              </TouchableOpacity>
            )}

            {isProcessing && (
              <View style={[styles.processingButton, { backgroundColor: palette.card }]}>
                <ThemedText style={[styles.processingButtonText, { color: palette.secondary }]}>
                  Please wait...
                </ThemedText>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>

      <AlertBox
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onRequestClose={() => setAlertVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  title: {
    textAlign: "center",
    marginBottom: 12,
    fontSize: 28,
    fontWeight: "700",
  },
  description: {
    textAlign: "center",
    fontSize: 16,
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 24,
  },
  scanArea: {
    height: 300,
    borderRadius: 16,
    marginBottom: 24,
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
  scanLine: {
    position: "absolute",
    top: 0,
    left: 40,
    width: 120,
    height: 2,
    borderRadius: 1,
  },
  instructions: {
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "700",
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
    color: "white",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 12,
    fontWeight: "700",
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
  },
  processingButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

