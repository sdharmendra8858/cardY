import AlertBox from "@/components/AlertBox";
import Hero from "@/components/Hero";
import ShareQRTemplate from "@/components/ShareQrTemplate";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { sessionPayloadToQRString } from "@/utils/qr";
import {
  createSession,
  createSessionPayload,
  deleteSession,
  getCurrentSession,
  SessionState,
  storeSession
} from "@/utils/session";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Image, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import RNFS from "react-native-fs";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import Share from "react-native-share";
import ViewShot from "react-native-view-shot";
import { Colors } from "../../constants/theme";

const SESSION_DURATION = 300; // 5 minutes in seconds

export default function ReceiveCardScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();
  const snapshotRef = useRef<ViewShot>(null);
  const lastTempFileRef = useRef<string | null>(null);

  const [session, setSession] = useState<SessionState | null>(null);
  const [qrString, setQrString] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(SESSION_DURATION);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string>("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; buttons?: any[] }>({ title: "", message: "" });
  const [showRegenerateInfo, setShowRegenerateInfo] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Receive Card",
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

  // Load existing session on mount, or create new one if none exists
  useEffect(() => {
    const loadOrGenerateSession = async () => {
      try {
        console.log("🔐 Loading or generating session...");

        // Try to load existing session
        const existingSession = await getCurrentSession();

        if (existingSession) {
          // Check if session is still valid
          const now = Math.floor(Date.now() / 1000);
          const timeRemaining = existingSession.expiresAt - now;

          if (timeRemaining > 0) {
            // Session is still valid, use it
            console.log("✅ Using existing session:", existingSession.sessionId);
            const payload = createSessionPayload(existingSession);
            const qr = sessionPayloadToQRString(payload);

            setSession(existingSession);
            setQrString(qr);
            setTimeLeft(timeRemaining);
            setGenerationError("");
            return;
          } else {
            // Session expired, delete it
            console.log("⏰ Existing session expired, deleting...");
            await deleteSession(existingSession.sessionId);
          }
        }

        // Create new session
        const newSession = await createSession();
        await storeSession(newSession);

        const payload = createSessionPayload(newSession);
        const qr = sessionPayloadToQRString(payload);

        setSession(newSession);
        setQrString(qr);
        setTimeLeft(SESSION_DURATION);
        setGenerationError("");

        console.log("✅ Session generation complete:", {
          sessionId: newSession.sessionId,
          code: newSession.sessionCode,
          expiresAt: new Date(newSession.expiresAt * 1000).toISOString(),
        });
      } catch (error) {
        console.error("❌ Failed to load or generate session:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        setGenerationError(errorMsg);
        setAlertConfig({
          title: "Error",
          message: `Failed to generate secure session: ${errorMsg}\n\nPlease try again.`,
          buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
      }
    };

    loadOrGenerateSession();
  }, []);

  const shareQRCode = useCallback(async () => {
    try {
      console.log("📤 Share button pressed");

      if (!snapshotRef.current) {
        console.error("❌ snapshotRef.current is null");
        throw new Error("Snapshot reference not available");
      }

      if (!qrString) {
        console.error("❌ qrString is empty");
        throw new Error("QR string not available");
      }

      console.log("⏳ Waiting for snapshot to render...");
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log("📸 Capturing snapshot...");
      const uri = await snapshotRef.current.capture?.();

      console.log("📁 Captured URI:", uri);

      if (!uri) {
        console.error("❌ Capture returned empty URI");
        throw new Error("Failed to capture snapshot");
      }

      // Save the URI for cleanup when new QR is generated
      lastTempFileRef.current = uri;

      console.log("🔗 Sharing file:", uri);

      await Share.open({
        url: uri,
        title: "Receive My Card",
        message: "Share this QR code so I can securely receive your card details",
        failOnCancel: false,
      });

      console.log("✅ Share successful");

    } catch (error) {
      console.error("❌ Share failed:", error);

      setAlertConfig({
        title: "Share Failed",
        message: error instanceof Error ? error.message : "Unable to share QR code. Please try again.",
        buttons: [{ text: "OK", onPress: () => setAlertVisible(false) }],
      });
      setAlertVisible(true);
    }
  }, [qrString]);

  // Helper function to generate a new session
  const generateNewSession = useCallback(async () => {
    try {
      console.log("🔐 Starting new session generation...");

      // Clean up old temporary file if it exists
      if (lastTempFileRef.current) {
        try {
          console.log("🗑️ Cleaning up old temporary QR file:", lastTempFileRef.current);
          await RNFS.unlink(lastTempFileRef.current);
          console.log("✅ Old temporary file deleted");
          lastTempFileRef.current = null;
        } catch (cleanupError) {
          console.warn("⚠️ Failed to delete old temporary file:", cleanupError);
          // Don't throw - continue with session generation
        }
      }

      // Delete old session if it exists
      if (session?.sessionId) {
        console.log("🗑️ Deleting old session:", session.sessionId);
        await deleteSession(session.sessionId);
      }

      // Create new session using utility
      const newSession = await createSession();

      // Store in SecureStore
      await storeSession(newSession);

      // Create shareable payload
      const payload = createSessionPayload(newSession);

      // Convert to QR string
      const qr = sessionPayloadToQRString(payload);

      setSession(newSession);
      setQrString(qr);
      setTimeLeft(SESSION_DURATION);
      setIsExpired(false);
      setGenerationError("");
      setShowRegenerateInfo(true);

      // Hide info bar after 3 seconds
      setTimeout(() => setShowRegenerateInfo(false), 3000);

      console.log("✅ Session generation complete:", {
        sessionId: newSession.sessionId,
        code: newSession.sessionCode,
        expiresAt: new Date(newSession.expiresAt * 1000).toISOString(),
      });
    } catch (error) {
      console.error("❌ Failed to generate session:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setGenerationError(errorMsg);
      setAlertConfig({
        title: "Error",
        message: `Failed to generate secure session: ${errorMsg}\n\nPlease try again.`,
        buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  }, [session?.sessionId]);

  // Countdown timer (runs continuously)
  useEffect(() => {
    if (timeLeft <= 0) {
      return; // Don't start timer if already expired
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Empty dependency array - timer runs once and continues

  // Session expiry cleanup (separate effect)
  useEffect(() => {
    if (timeLeft <= 0 && !isExpired) {
      setIsExpired(true);
      // Clean up expired session
      (async () => {
        if (session?.sessionId) {
          try {
            console.log("⏰ Session expired, cleaning up...");
            const { deleteSession } = await import("@/utils/session");
            await deleteSession(session.sessionId);
            console.log("✅ Expired session cleaned up");
          } catch (error) {
            console.error("❌ Failed to cleanup expired session:", error);
          }
        }
      })();
    }
  }, [timeLeft, isExpired, session?.sessionId]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const regenerateSession = useCallback(async () => {
    try {
      setGenerationError("");
      setSession(null);
      setQrString("");
      setTimeLeft(SESSION_DURATION);
      setIsExpired(false);

      await generateNewSession();
    } catch (error) {
      console.error("Failed to regenerate session:", error);
      setAlertConfig({
        title: "Error",
        message: "Failed to regenerate session. Please try again.",
        buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    }
  }, [generateNewSession]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <Hero
        title="Receive Card"
        subtitle="Share this QR code to securely receive card details"
        showBackButton={true}
      />
      <View
        style={{
          position: "absolute",
          left: -1000, // Move it far off-screen instead of just zIndex
          top: 0,
          width: 300,
          height: 400, // Adjust to fit your ShareQRTemplate perfectly
        }}
        pointerEvents="none"
      >
        <ViewShot
          ref={snapshotRef}
          options={{
            format: "png",
            quality: 1,
            result: "tmpfile", // ✅ CORRECT
          }}
        >
          <ShareQRTemplate
            qrValue={qrString}
            expiresInSeconds={timeLeft}
            intent="receive"
          />
        </ViewShot>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {showRegenerateInfo && (
          <View style={[styles.infoBar, { backgroundColor: palette.primary + '20', borderColor: palette.primary }]}>
            <MaterialIcons name="info" size={20} color={palette.primary} />
            <ThemedText style={[styles.infoBarText, { color: palette.primary }]}>
              New QR code generated. Old code is no longer valid.
            </ThemedText>
          </View>
        )}

        {/* Step-by-step flow */}
        <View style={[styles.flowContainer, { backgroundColor: palette.card }]}>
          {/* Step 1: Generate QR */}
          <View style={styles.stepBox}>
            <View style={[styles.stepHeader, { backgroundColor: palette.primary + '15' }]}>
              <View style={[styles.stepNumber, { backgroundColor: palette.primary }]}>
                <ThemedText style={{ color: palette.onPrimary, fontWeight: '700', fontSize: 14 }}>1</ThemedText>
              </View>
              <ThemedText style={[styles.stepTitle, { color: palette.text }]}>Your QR Code</ThemedText>
            </View>
            <View style={styles.stepContent}>
              {qrString && !isExpired && (
                <View style={styles.qrCodeWrapper}>
                  <View style={styles.qrWrapper}>
                    <QRCode
                      value={qrString}
                      size={140}
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
                </View>
              )}
              {isExpired && (
                <View style={[styles.expiredBox, { backgroundColor: palette.danger + '15' }]}>
                  <MaterialIcons name="schedule" size={32} color={palette.danger} />
                  <ThemedText style={[styles.expiredText, { color: palette.danger }]}>Session Expired</ThemedText>
                </View>
              )}
              {!session && !generationError && (
                <View style={[styles.loadingBox, { backgroundColor: palette.primary + '15' }]}>
                  <MaterialIcons name="hourglass-empty" size={32} color={palette.primary} />
                  <ThemedText style={[styles.loadingText, { color: palette.primary }]}>Generating...</ThemedText>
                </View>
              )}
              {generationError && (
                <View style={[styles.errorBox, { backgroundColor: palette.danger + '15' }]}>
                  <MaterialIcons name="error-outline" size={32} color={palette.danger} />
                  <ThemedText style={[styles.errorText, { color: palette.danger }]}>Generation Failed</ThemedText>
                </View>
              )}
              <ThemedText style={[styles.stepDescription, { color: palette.secondary }]}>
                Show this QR code to the person who wants to share a card with you
              </ThemedText>
              {qrString && !isExpired && (
                <ThemedText style={[styles.timerText, { color: palette.secondary }]}>
                  Expires in {formatTime(timeLeft)}
                </ThemedText>
              )}
              {qrString && !isExpired && (
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: palette.primary }]}
                  onPress={shareQRCode}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="share" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.shareButtonText, { color: palette.onPrimary }]}>
                    Share QR Code
                  </ThemedText>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.regenerateCodeButton, { borderColor: palette.secondary }]}
                onPress={regenerateSession}
                activeOpacity={0.7}
              >
                <MaterialIcons name="refresh" size={16} color={palette.secondary} />
                <ThemedText style={[styles.regenerateCodeButtonText, { color: palette.secondary }]}>
                  Generate New Code
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Step 2: Wait for sender */}
          <View style={[styles.stepConnector, { backgroundColor: palette.border }]} />

          <View style={styles.stepBox}>
            <View style={[styles.stepHeader, { backgroundColor: palette.tint + '15' }]}>
              <View style={[styles.stepNumber, { backgroundColor: palette.tint }]}>
                <ThemedText style={{ color: palette.onPrimary, fontWeight: '700', fontSize: 14 }}>2</ThemedText>
              </View>
              <ThemedText style={[styles.stepTitle, { color: palette.text }]}>Sender Shares Card</ThemedText>
            </View>
            <View style={styles.stepContent}>
              <View style={[styles.infoBox, { backgroundColor: palette.tint + '15' }]}>
                <MaterialIcons name="info" size={20} color={palette.tint} />
                <ThemedText style={[styles.infoText, { color: palette.tint }]}>
                  The sender will scan your QR code and share their card with you
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Step 3: Scan sender's QR */}
          <View style={[styles.stepConnector, { backgroundColor: palette.border }]} />

          <View style={styles.stepBox}>
            <View style={[styles.stepHeader, { backgroundColor: palette.secondary + '15' }]}>
              <View style={[styles.stepNumber, { backgroundColor: palette.secondary }]}>
                <ThemedText style={{ color: palette.onPrimary, fontWeight: '700', fontSize: 14 }}>3</ThemedText>
              </View>
              <ThemedText style={[styles.stepTitle, { color: palette.text }]}>Scan Their QR Code</ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText style={[styles.stepDescription, { color: palette.secondary }]}>
                Once the sender generates their encrypted QR code, tap the button below to scan it and import their card
              </ThemedText>
              <TouchableOpacity
                style={[styles.scanButton, { backgroundColor: palette.secondary }]}
                onPress={() => router.push('/share-card/import')}
                activeOpacity={0.8}
              >
                <MaterialIcons name="qr-code-scanner" size={20} color={palette.onPrimary} />
                <ThemedText style={[styles.scanButtonText, { color: palette.onPrimary }]}>
                  Scan Sender's QR Code
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.securityNotice, { backgroundColor: palette.card }]}>
          <MaterialIcons name="security" size={20} color={palette.primary} />
          <ThemedText style={styles.securityText}>
            This QR code is encrypted and can only be used once. It expires in 5 minutes.
          </ThemedText>
        </View>
      </ScrollView>

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
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  codeContainer: {
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
  codeLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  code: {
    fontSize: 36,
    fontWeight: "bold",
    letterSpacing: 4,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    width: "100%",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  regenerateCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
  },
  regenerateCodeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  timer: {
    fontSize: 13,
    fontWeight: "500",
  },
  qrContainer: {
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  qrLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qrDescription: {
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
    opacity: 0.7,
  },
  qrCodeWrapper: {
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  qrWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  iconOverlay: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
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
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  expiredBox: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    marginBottom: 12,
  },
  expiredText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  loadingBox: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  errorBox: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.8,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    gap: 10,
  },
  infoBarText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
  },
  flowContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  stepBox: {
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    gap: 10,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  stepContent: {
    paddingHorizontal: 8,
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  stepConnector: {
    height: 2,
    marginVertical: 8,
    borderRadius: 1,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },

  shareButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
