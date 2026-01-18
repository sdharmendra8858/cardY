import AlertBox from "@/components/AlertBox";
import Hero from "@/components/Hero";
import ShareQRTemplate from "@/components/ShareQrTemplate";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import Share from "react-native-share";
import ViewShot from "react-native-view-shot";
import { Colors } from "../../constants/theme";
import { useCards } from "../../context/CardContext";

export default function QRCodeScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { cards } = useCards();

  const encryptedQRString = params.encryptedQRString as string;
  const cardId = params.cardId as string;

  const [qrData, setQrData] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; buttons?: any[] }>({ title: "", message: "" });
  const snapshotRef = useRef<any>(null);

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
    if (!cardId || !encryptedQRString) {
      console.log("QR Screen - Missing required params:", { cardId, encryptedQRString });
      setAlertConfig({
        title: "Error",
        message: "Required information is missing. Please go back and try again.",
        buttons: [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      });
      setAlertVisible(true);
      return;
    }
  }, [cardId, encryptedQRString, router]);

  // Generate QR data (encrypted according to spec)
  useEffect(() => {
    const generateEncryptedQR = async () => {
      try {
        if (!card || !encryptedQRString || !cardId) {
          console.log("QR Screen - Missing data:", { cardId, encryptedQRString: !!encryptedQRString, card: !!card });
          return;
        }

        console.log("✅ QR string received from share screen");
        setQrData(encryptedQRString);

      } catch (err) {
        console.error("Failed to process QR:", err);
        setError("Failed to display QR code. Please try again.");
      }
    };

    generateEncryptedQR();
  }, [card, encryptedQRString, cardId]);

  const handleShareComplete = useCallback(() => {
    setAlertConfig({
      title: "Card Shared Successfully",
      message: "The card has been shared securely. You can now close this screen.",
      buttons: [
        {
          text: "Done",
          onPress: () => router.replace("/profile"),
        },
      ]
    });
    setAlertVisible(true);
  }, [router]);

  const handleShareQR = useCallback(async () => {
    try {
      if (!qrData) {
        setAlertConfig({
          title: "Error",
          message: "QR code is not ready yet. Please wait a moment and try again.",
          buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
        return;
      }

      console.log("📸 Capturing QR code snapshot...");
      const uri = await snapshotRef.current?.capture?.();

      console.log("📁 Captured URI:", uri);

      if (!uri) {
        console.error("❌ Capture returned empty URI");
        throw new Error("Failed to capture QR code");
      }

      console.log("🔗 Sharing QR code...");

      await Share.open({
        url: uri,
        title: "Share My Card",
        message: "Scan this QR code with CardyWall to securely receive my card details",
        failOnCancel: false,
      });

      console.log("✅ Share successful");
    } catch (error) {
      console.error("❌ Share failed:", error);
      // User cancelled share, no need to show error
    }
  }, [qrData]);

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
    <>
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.surface }]}
      >
        <Hero
          title="Share QR Code"
          subtitle="Show this QR code to securely share your card"
          showBackButton={true}
        />
        <View style={styles.container}>
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>

              <View style={[styles.cardPreview, { backgroundColor: palette.card }]}>
                <View style={styles.cardInfo}>
                  <MaterialIcons name="credit-card" size={24} color={palette.tint} />
                  <View style={styles.cardDetails}>
                    <ThemedText style={styles.cardName}>{card.bank || 'Bank'}</ThemedText>
                    <ThemedText style={styles.cardNumber}>
                      {card.cardNumber}
                    </ThemedText>
                  </View>
                </View>
              </View>

              <View style={[styles.qrContainer, { backgroundColor: palette.card }]}>
                <View style={styles.qrDisplay}>
                  <ThemedText style={styles.qrTitle}>Scan This QR Code</ThemedText>

                  {qrData ? (
                    <View style={styles.qrCodeContainer}>
                      <View style={styles.qrWrapper}>
                        <QRCode
                          value={qrData}
                          size={200}
                          color="black"
                          backgroundColor="white"
                        />
                        {/* App icon overlay in center */}
                        <View style={styles.iconOverlay}>
                          <Image
                            source={require("@/assets/images/cc.png")}
                            style={styles.icon}
                          />
                        </View>
                      </View>
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

                </View>
              </View>

              <View style={styles.securityNotice}>
                <MaterialIcons name="security" size={20} color={palette.secondary || "#666"} />
                <ThemedText style={styles.securityText}>
                  This card is encrypted and can only be decrypted on the receiving device.
                </ThemedText>
              </View>

              <View style={styles.cvvNotice}>
                <MaterialIcons name="info-outline" size={20} color={palette.primary} />
                <ThemedText style={styles.cvvText}>
                  CVV will not be shared for security reasons.
                </ThemedText>
              </View>
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.shareQRButton, { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 }]}
              onPress={handleShareQR}
              activeOpacity={0.8}
              disabled={!qrData}
            >
              <MaterialIcons name="share" size={20} color={palette.text} />
              <ThemedText style={[styles.shareQRButtonText, { color: palette.text }]}>
                Share QR
              </ThemedText>
            </TouchableOpacity>

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

      <AlertBox
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onRequestClose={() => setAlertVisible(false)}
      />

      {/* Off-screen template for sharing */}
      {qrData && (
        <View
          style={{
            position: "absolute",
            left: -1000,
            top: 0,
            width: 300,
            height: 400,
          }}
          pointerEvents="none"
        >
          <ViewShot
            ref={snapshotRef}
            options={{
              format: "png",
              quality: 0.9,
              result: "tmpfile",
            }}
            style={{
              width: 300,
              height: 400,
            }}
          >
            <ShareQRTemplate qrValue={qrData} intent="send" />
          </ViewShot>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, flexDirection: "column" },
  scrollContent: { flex: 1 },
  scrollContentContainer: { paddingBottom: 20 },
  content: { padding: 20 },
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
  cvvNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.08)",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 12,
  },
  cvvText: {
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
  shareQRButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareQRButtonText: {
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
  qrWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  iconOverlay: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  biometricContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  biometricIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  biometricTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  biometricSubtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  biometricButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  biometricWarning: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.6,
  },
});
