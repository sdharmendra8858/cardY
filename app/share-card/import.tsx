import Hero from "@/components/Hero";
import QRScanSection from "@/components/QRScanSection";
import { ThemedText } from "@/components/themed-text";
import UnifiedModal, { UnifiedModalButton } from "@/components/UnifiedModal";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  decryptCardFromQR,
  validateQRPayload,
} from "@/utils/cardSharing";
import { getCardType } from "@/utils/CardType";
import { maskAndFormatCardNumber } from "@/utils/mask";
import { parseCardQRString, parseSessionQRString } from "@/utils/qr";
import { decodeQRFromImage } from "@/utils/qrDecoder";
import { setGlobalAdSuppression } from "@/utils/adControl";
import {
  canUseSession,
  deleteSession,
  markSessionAsUsed,
  retrieveSession,
} from "@/utils/session";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, AppState, Easing, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";
import { useCardsWithMigration as useCards } from "../../context/CardContextWithMigration";

export default function ImportCardScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();
  const { addCard, cards } = useCards();

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const [alertVisible, setAlertVisible] = useState(false);
  const permissionDeniedRef = useRef(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    buttons?: UnifiedModalButton[];
    type?: "default" | "error" | "warning" | "success";
  }>({ title: "", message: "" });

  // Suppress App Open Ads while in this flow
  useEffect(() => {
    setGlobalAdSuppression(true);
    return () => setGlobalAdSuppression(false);
  }, []);

  const handleBackAction = useCallback(() => {
    if (isScanning) {
      setIsScanning(false);
      scanLineAnimation.stopAnimation();
      return true;
    }
    router.replace("/profile");
    return true;
  }, [isScanning, router, scanLineAnimation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Import Card",
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleBackAction}
          style={{ marginLeft: 8, padding: 4 }}
        >
          <MaterialIcons name="close" size={24} color={palette.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, palette.text, handleBackAction]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // If the user is trying to leave and we are scanning, stop scanning instead
      if (isScanning) {
        e.preventDefault();
        setIsScanning(false);
        scanLineAnimation.stopAnimation();
        return;
      }

      // If we are not scanning, allow the navigation to proceed
    });

    return unsubscribe;
  }, [navigation, isScanning, router, scanLineAnimation]);

  // Clean up any active sessions when app goes to background
  useEffect(() => {
    const subscription = AppState.addEventListener("change", async (state) => {
      if (state === "background" || state === "inactive") {
        // App going to background, clean up if needed
      }
    });

    return () => subscription.remove();
  }, []);

  const requestCameraPermission = useCallback(async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return status === "granted";
    } catch (error) {
      return false;
    }
  }, []);

  const handleScanQR = useCallback(async () => {
    try {
      const permissionGranted = await requestCameraPermission();
      if (!permissionGranted) {
        // If permission was already denied once, show modal with "Open Settings"
        if (permissionDeniedRef.current) {
          setAlertConfig({
            title: "Camera permission denied",
            message: "Camera permission is required to scan QR codes. Please enable it in settings.",
            buttons: [
              {
                text: "Open Settings",
                style: "default",
                onPress: () => {
                  setAlertVisible(false);
                  if (Platform.OS === 'ios') {
                    Linking.openURL('app-settings:');
                  } else {
                    Linking.openSettings();
                  }
                }
              },
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => setAlertVisible(false)
              }
            ]
          });
          setAlertVisible(true);
        } else {
          permissionDeniedRef.current = true;
        }
        return;
      }

      // Permission granted - reset the ref and start scanning
      permissionDeniedRef.current = false;
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
      console.error('Error in handleScanQR:', error);
    }
  }, [scanLineAnimation, requestCameraPermission]);



  const handleBarCodeScanned = useCallback(({ data }: { type: string; data: string }) => {
    setIsScanning(false);
    scanLineAnimation.stopAnimation();
    setIsProcessing(true);

    setTimeout(async () => {
      try {
        try {
          const qrPayload = parseCardQRString(data);

          if (!validateQRPayload(qrPayload)) {
            throw new Error("Invalid card QR payload");
          }

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
            const cardData = await decryptCardFromQR(
              qrPayload,
              session.receiverPrivateKey
            );

            const detectedCardType = getCardType(cardData.cardNumber);
            const maskedCardNumber = maskAndFormatCardNumber(cardData.cardNumber);

            const cardExists = cards.some(
              (card) =>
                card.cardUser === "other" &&
                card.cardNumber === maskedCardNumber
            );

            if (cardExists) {
              setIsProcessing(false);
              setAlertConfig({
                title: "Card Already Added",
                message: "This card is already in your collection.",
                buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
              });
              setAlertVisible(true);
              return;
            }

            const cardToImport = {
              id: `imported_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
              cardNumber: cardData.cardNumber,
              cardHolder: cardData.cardholderName,
              expiry: `${cardData.expiryMonth}/${cardData.expiryYear}`,
              cvv: "",
              cardKind: cardData.cardKind || "credit" as "credit" | "debit",
              cobrandName: cardData.cobrandName || "",
              cardUser: "other" as "self" | "other",
              dominantColor: cardData.dominantColor || "#1E90FF",
              bank: cardData.bank || "",
              cardType: detectedCardType || undefined,
              cardExpiresAt: cardData.cardExpiresAt,
              isPinned: false,
            };

            await addCard(cardToImport);
            await markSessionAsUsed(sessionId);
            await deleteSession(sessionId);

            setIsProcessing(false);
            setAlertConfig({
              title: "Card Added Successfully",
              message: `Imported ${cardToImport.bank || 'Card'}.\n\nThis card is stored securely on your device only.`,
              buttons: [
                {
                  text: "View Card Details",
                  onPress: () => router.replace(`/card-details/${cardToImport.id}`),
                },
                {
                  text: "OK",
                  style: "cancel",
                  onPress: () => router.replace("/"),
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
        } catch (cardParseError) {
          try {
            const sessionPayload = parseSessionQRString(data);
            setIsProcessing(false);
            setAlertConfig({
              title: "Session QR Detected",
              message: "This is a receiver's session QR code. You should use this on the Share Card screen to share your card.",
              buttons: [
                {
                  text: "Go to Share Screen",
                  onPress: () => {
                    router.push({
                      pathname: "/share-card/share",
                      params: {
                        sessionId: sessionPayload.sessionId,
                        receiverPublicKey: sessionPayload.receiverPublicKey,
                        expiresAt: sessionPayload.expiresAt.toString(),
                        showCardSelection: "true",
                      },
                    });
                  },
                },
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => setAlertVisible(false),
                },
              ]
            });
            setAlertVisible(true);
            return;
          } catch (sessionParseError) {
            setIsProcessing(false);
            setAlertConfig({
              title: "Couldn't Read Card",
              message: "This QR code doesn't contain valid card information. Try scanning again with a QR code shared from CardyWall.",
              buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
          }
        }
      } catch (error) {
        setIsProcessing(false);
        setAlertConfig({
          title: "Error",
          message: "An error occurred while processing the QR code. Please try again.",
          buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
      }
    }, 1500);
  }, [router, scanLineAnimation, addCard]);

  const handleUploadImage = useCallback(async () => {
    // Standard Android System Photo Picker (API 33+) does not require READ_MEDIA_IMAGES 
    // if called directly. Permission is still needed for iOS gallery access.
    if (Platform.OS === 'ios') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setAlertConfig({
          title: "Permission Denied",
          message: "Please enable photo library permissions in settings to upload QR code images",
          buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
        return;
      }
    }

    try {
      console.log('Opening image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      setIsProcessing(true);

      try {
        const qrResult = await decodeQRFromImage(result.assets[0].uri);

        if (qrResult.success && qrResult.data) {
          // Process the decoded QR code data using existing handler
          handleBarCodeScanned({ type: 'QR', data: qrResult.data });
        } else {
          setIsProcessing(false);
          setAlertConfig({
            title: "No QR Code Found",
            message: qrResult.error || "Could not find a QR code in the selected image. Please try another image with a clear QR code.",
            buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
          });
          setAlertVisible(true);
        }
      } catch (decodeError) {
        console.error('❌ Error decoding QR from image:', decodeError);
        setIsProcessing(false);
        setAlertConfig({
          title: "Decoding Failed",
          message: "Failed to decode QR code from the image. Please ensure the image contains a clear QR code.",
          buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setIsProcessing(false);
      setAlertConfig({
        title: "Error",
        message: "An error occurred while uploading the image. Please try again.",
        buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  }, [decodeQRFromImage, handleBarCodeScanned]);



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
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {isProcessing ? (
              <View style={[styles.scanArea, { backgroundColor: palette.card }]}>
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
              </View>
            ) : (
              <QRScanSection
                isScanning={isScanning}
                scanLineAnimation={scanLineAnimation}
                onBarcodeScanned={handleBarCodeScanned}
                onCameraError={(error: any) => {
                  setAlertConfig({
                    title: 'Camera Error',
                    message: 'Unable to access camera. Please check permissions.',
                    buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
                  });
                  setAlertVisible(true);
                  setIsScanning(false);
                  scanLineAnimation.stopAnimation();
                }}
                onScanPress={handleScanQR}
                onUploadPress={handleUploadImage}
                onStopPress={() => {
                  setIsScanning(false);
                  scanLineAnimation.stopAnimation();
                }}
                isProcessing={isProcessing}
                title="Ready to add a card?"
                instructions={[
                  {
                    number: 1,
                    text: "Have the person show you their QR code",
                  },
                  {
                    number: 2,
                    text: 'Tap "Scan QR Code" below',
                  },
                  {
                    number: 3,
                    text: "Hold your camera over the QR code",
                  },
                ]}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <UnifiedModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        type={alertConfig.type}
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
});

