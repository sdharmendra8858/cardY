import AlertBox from "@/components/AlertBox";
import Hero from "@/components/Hero";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  encryptCardForSharing,
  validateSessionPayload,
} from "@/utils/cardSharing";
import {
  parseSessionQRString,
  qrPayloadToQRString,
} from "@/utils/qr";
import { CardPayload, SessionPayload } from "@/utils/session";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Camera, CameraView } from "expo-camera";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";
import { useCards } from "../../context/CardContext";

export default function ShareCardScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();
  const { cards, isLoading, refreshCards } = useCards();

  const [sessionPayload, setSessionPayload] = useState<SessionPayload | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showCardSelection, setShowCardSelection] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; buttons?: any[] }>({ title: "", message: "" });
  const scanLineAnimation = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Share Card",
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

  const handleScanQRCode = useCallback(async () => {
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

    try {
      handleSessionQRScanned(data);
    } catch (error) {
      console.error("Error processing QR code:", error);
      setAlertConfig({
        title: "Invalid QR Code",
        message: "This QR code is not a valid session QR code. Please try again.",
        buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  }, [scanLineAnimation]);

  const handleSessionQRScanned = useCallback((qrData: string) => {
    try {
      // 1. Parse session QR (spec 6)
      const payload = parseSessionQRString(qrData);

      // 2. Validate session payload (spec 6.1)
      if (!validateSessionPayload(payload)) {
        throw new Error("Invalid session payload");
      }

      // 3. Check expiration (spec 6)
      const now = Math.floor(Date.now() / 1000);
      if (now > payload.expiresAt) {
        throw new Error("Session has expired");
      }

      setSessionPayload(payload);

      // Ensure cards are loaded before showing selection
      if (cards.length === 0 && !isLoading) {
        console.log("🔄 Loading cards before showing selection...");
        refreshCards();
      }

      setShowCardSelection(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid QR code";
      console.error("Failed to parse session QR:", error);
      setAlertConfig({
        title: "Invalid QR Code",
        message: message,
        buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  }, [cards.length, isLoading, refreshCards]);

  const handleCardSelect = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  const generateQRCode = useCallback(() => {
    if (!selectedCardId || !sessionPayload) {
      setAlertConfig({
        title: "Error",
        message: "Please select a card to share",
        buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
      return;
    }

    (async () => {
      try {
        setIsGenerating(true);

        // Get selected card
        const card = cards.find(c => c.id === selectedCardId);
        if (!card) {
          throw new Error("Card not found");
        }

        console.log("🔍 Raw card data:", {
          id: card.id,
          cardNumber: card.cardNumber ? `****${card.cardNumber.slice(-4)}` : "MISSING",
          cardHolder: card.cardHolder,
          expiry: card.expiry,
          bank: card.bank,
          cardName: card.cardName,
        });

        // Validate required card fields
        if (!card.cardNumber || !card.cardHolder || !card.expiry) {
          const missing = [];
          if (!card.cardNumber) missing.push("cardNumber");
          if (!card.cardHolder) missing.push("cardHolder");
          if (!card.expiry) missing.push("expiry");
          throw new Error(`Card is missing required information: ${missing.join(", ")}`);
        }

        // Parse expiry - handle both "MM/YY" and "MM/YYYY" formats
        const expiryParts = card.expiry.split("/");
        if (expiryParts.length !== 2) {
          throw new Error(`Invalid expiry format: "${card.expiry}". Expected MM/YY or MM/YYYY`);
        }

        const expiryMonth = expiryParts[0].trim();
        const expiryYear = expiryParts[1].trim();

        if (!expiryMonth || !expiryYear) {
          throw new Error(`Expiry parsing failed: month="${expiryMonth}", year="${expiryYear}"`);
        }

        // 1. Prepare card data (spec 11)
        const cardData: CardPayload = {
          cardId: card.id,
          cardholderName: card.cardHolder,
          cardNumber: card.cardNumber,
          expiryMonth: expiryMonth,
          expiryYear: expiryYear,
          brand: getCardBrand(card.cardNumber),
          sharedAt: Math.floor(Date.now() / 1000),
          // Include optional metadata if available
          bank: card.bank || undefined,
          cobrandName: card.cobrandName || undefined,
          cardKind: card.cardKind || undefined,
          dominantColor: card.dominantColor || undefined,
        };

        console.log("📋 Card data prepared:", {
          cardId: cardData.cardId,
          cardholderName: cardData.cardholderName,
          cardNumber: `****${cardData.cardNumber.slice(-4)}`,
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear,
          brand: cardData.brand,
          sharedAt: cardData.sharedAt,
        });

        console.log("🔐 Session payload:", {
          sessionId: sessionPayload.sessionId,
          receiverPublicKey: sessionPayload.receiverPublicKey ? "present" : "MISSING",
          expiresAt: sessionPayload.expiresAt,
        });

        // 2. Encrypt card (spec 8)
        const qrPayload = await encryptCardForSharing(cardData, sessionPayload);

        // 3. Convert to QR string (spec 9)
        const qrString = qrPayloadToQRString(qrPayload);

        // Navigate to QR display screen
        router.push({
          pathname: "/share-card/qr",
          params: {
            encryptedQRString: qrString,
            cardId: selectedCardId,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to generate QR code";
        console.error("❌ Failed to generate encrypted QR:", error);
        setAlertConfig({
          title: "Error",
          message: message,
          buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
      } finally {
        setIsGenerating(false);
      }
    })();
  }, [selectedCardId, sessionPayload, cards, router]);



  // Filter to only show cards that belong to the user (not "other" cards)
  const availableCards = cards.filter((card) => card.cardUser !== "other");

  // Debug logging (only when card selection is shown to avoid excessive logging)
  if (showCardSelection) {
    console.log("🎯 ShareCard Debug:", {
      totalCards: cards.length,
      availableCards: availableCards.length,
      isLoading,
      showCardSelection,
      sessionPayload: sessionPayload ? "present" : "none",
      filteredOut: cards.length - availableCards.length
    });
  }

  function getCardBrand(cardNumber: string): "VISA" | "MC" | "AMEX" | "OTHER" {
    const number = cardNumber.replace(/\D/g, '');
    if (number.startsWith('4')) return 'VISA';
    if (number.startsWith('5') || number.startsWith('2')) return 'MC';
    if (number.startsWith('3')) return 'AMEX';
    return 'OTHER';
  }

  // Show camera if scanning
  if (isScanning) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.surface }]}
      >
        <View style={styles.container}>
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
            onMountError={(error: any) => {
              console.error('Camera mount error:', error);
              setAlertConfig({
                title: 'Camera Error',
                message: 'Unable to access camera. Please check permissions.',
                buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
              });
              setAlertVisible(true);
              setIsScanning(false);
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
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
            onPress={() => {
              setIsScanning(false);
              scanLineAnimation.stopAnimation();
            }}
            activeOpacity={0.7}
          >
            <ThemedText style={[styles.cancelButtonText, { color: palette.text }]}>
              Stop Scanning
            </ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (showCardSelection) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.surface }]}
      >
        <Hero
          title="Select Card"
          subtitle="Choose which card to share"
          showBackButton={true}
          onBack={() => setShowCardSelection(false)}
        />
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.cardsList}>
              {isLoading ? (
                <View style={styles.emptyState}>
                  <MaterialIcons
                    name="hourglass-empty"
                    size={48}
                    color={palette.secondary}
                  />
                  <ThemedText style={styles.emptyTitle}>Loading cards...</ThemedText>
                </View>
              ) : availableCards.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons
                    name="credit-card"
                    size={48}
                    color={palette.secondary}
                  />
                  <ThemedText style={styles.emptyTitle}>No cards available</ThemedText>
                  <ThemedText style={styles.emptyText}>
                    You don&apos;t have any cards to share. Add some cards first.
                  </ThemedText>
                </View>
              ) : (
                availableCards.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    onPress={() => handleCardSelect(card.id)}
                    activeOpacity={0.7}
                    style={{ paddingHorizontal: 0, marginBottom: 12 }}
                  >
                    <View
                      style={[
                        styles.cardContainer,
                        {
                          backgroundColor: palette.card,
                          borderColor: selectedCardId === card.id ? palette.primary : palette.border,
                          borderWidth: selectedCardId === card.id ? 2 : 1,
                        },
                      ]}
                    >
                      <View style={{ padding: 16 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>
                            {card.bank || card.cardName || `Unknown Bank`}
                          </ThemedText>
                          {card.cardKind && (
                            <View style={{
                              backgroundColor: palette.surface,
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 12
                            }}>
                              <ThemedText style={{ fontSize: 12, textTransform: 'capitalize', fontWeight: '500' }}>
                                {card.cardKind}
                              </ThemedText>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <ThemedText style={{ fontSize: 18, fontFamily: 'monospace', letterSpacing: 1 }}>
                              •••• •••• •••• {card.cardNumber.slice(-4)}
                            </ThemedText>
                            <ThemedText style={{ fontSize: 14, opacity: 0.7, marginTop: 4 }}>
                              {card.cardHolder}
                            </ThemedText>
                          </View>
                          <ThemedText style={{ fontSize: 14, fontFamily: 'monospace' }}>
                            {card.expiry}
                          </ThemedText>
                        </View>
                      </View>
                      {selectedCardId === card.id && (
                        <View style={[styles.selectedIndicator, { backgroundColor: palette.primary }]}>
                          <MaterialIcons name="check" size={16} color={palette.onPrimary} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>

          {!isLoading && availableCards.length > 0 && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  {
                    backgroundColor: selectedCardId ? palette.primary : palette.surface,
                  },
                ]}
                onPress={generateQRCode}
                disabled={!selectedCardId || isGenerating}
                activeOpacity={selectedCardId ? 0.8 : 1}
              >
                <MaterialIcons
                  name="qr-code"
                  size={20}
                  color={selectedCardId ? palette.onPrimary : palette.secondary}
                />
                <ThemedText
                  style={[
                    styles.generateButtonText,
                    {
                      color: selectedCardId ? palette.onPrimary : palette.secondary,
                    },
                  ]}
                >
                  {isGenerating ? "Generating..." : "Generate QR Code"}
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <Hero
        title="Share Card"
        subtitle="Scan the receiver's session QR code to share your card"
        showBackButton={true}
      />
      <View style={styles.container}>
        <View style={styles.content}>

          <View style={[styles.scanPrompt, { backgroundColor: palette.card }]}>
            <MaterialIcons name="qr-code-2" size={64} color={palette.primary} />
            <ThemedText style={[styles.scanPromptTitle, { color: palette.text }]}>
              Ready to share?
            </ThemedText>
            <ThemedText style={[styles.scanPromptText, { color: palette.secondary }]}>
              Scan the QR code displayed on the receiver's device to begin the sharing process.
            </ThemedText>
          </View>

          <View style={[styles.instructions, { backgroundColor: palette.card }]}>
            <ThemedText style={[styles.instructionTitle, { color: palette.text }]}>How it works:</ThemedText>
            <View style={styles.instructionItem}>
              <ThemedText style={[styles.instructionNumber, { backgroundColor: palette.primary }]}>1</ThemedText>
              <ThemedText style={styles.instructionText}>
                Ask the receiver to show you their session QR code
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={[styles.instructionNumber, { backgroundColor: palette.primary }]}>2</ThemedText>
              <ThemedText style={styles.instructionText}>
                Scan the QR code using the button below
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={[styles.instructionNumber, { backgroundColor: palette.primary }]}>3</ThemedText>
              <ThemedText style={styles.instructionText}>
                Select which card to share and generate the encrypted QR code
              </ThemedText>
            </View>
          </View>
        </View>        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: palette.primary }]}
            onPress={handleScanQRCode}
            activeOpacity={0.8}
          >
            <MaterialIcons name="qr-code-scanner" size={24} color={palette.onPrimary} />
            <ThemedText style={[styles.scanButtonText, { color: palette.onPrimary }]}>
              Scan Session QR Code
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <AlertBox
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onRequestClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 20,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  selectionTitle: {
    fontSize: 28,
    flex: 1,
    fontWeight: "700",
  },
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
  scanPrompt: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  scanPromptTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  scanPromptText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 18,
    marginLeft: 12,
    fontWeight: "500",
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
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
  continueButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
  cardsList: {
    flex: 1,
  },
  cardContainer: {
    borderRadius: 12,
    padding: 16,
    position: "relative",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  selectedIndicator: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
  scanLine: {
    position: "absolute",
    top: 0,
    left: 40,
    width: 120,
    height: 2,
    borderRadius: 1,
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    margin: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
