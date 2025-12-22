import AlertBox from "@/components/AlertBox";
import Hero from "@/components/Hero";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { sessionPayloadToQRString } from "@/utils/qr";
import {
  createSession,
  createSessionPayload,
  SessionState,
  storeSession
} from "@/utils/session";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";

const SESSION_DURATION = 300; // 5 minutes in seconds

export default function ReceiveCardScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();

  const [session, setSession] = useState<SessionState | null>(null);
  const [qrString, setQrString] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(SESSION_DURATION);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string>("");
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; buttons?: any[] }>({ title: "", message: "" });

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

  // Load existing session or generate new one on mount
  useEffect(() => {
    const loadOrGenerateSession = async () => {
      try {
        console.log("🔐 Loading or generating session...");

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

  // Helper function to generate a new session
  const generateNewSession = useCallback(async () => {
    try {
      console.log("🔐 Starting new session generation...");

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
  }, []);

  // Countdown timer and session expiry cleanup (only on timeout, not on app background)
  useEffect(() => {
    if (timeLeft <= 0) {
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
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, session?.sessionId]);

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
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {qrString && !isExpired && (
          <View style={[styles.qrContainer, { backgroundColor: palette.card }]}>
            <ThemedText style={[styles.qrLabel, { color: palette.secondary }]}>Session QR Code</ThemedText>
            <ThemedText style={[styles.qrDescription, { color: palette.text }]}>
              Show this QR code to the sender to securely share a card
            </ThemedText>
            <View style={styles.qrCodeWrapper}>
              <QRCode
                value={qrString}
                size={180}
                color="black"
                backgroundColor="white"
              />
            </View>
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
            <ThemedText style={[styles.timer, { color: palette.secondary }]}>
              Expires in {formatTime(timeLeft)}
            </ThemedText>
          </View>
        )}

        {isExpired && (
          <View style={[styles.expiredContainer, { backgroundColor: palette.card }]}>
            <MaterialIcons name="schedule" size={32} color={palette.danger} />
            <ThemedText style={styles.expiredTitle}>Session Expired</ThemedText>
            <ThemedText style={styles.expiredText}>
              This session code has expired. Generate a new one to continue.
            </ThemedText>
            <TouchableOpacity
              style={[styles.regenerateButton, { backgroundColor: palette.primary }]}
              onPress={regenerateSession}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={18} color={palette.onPrimary} />
              <ThemedText style={[styles.regenerateButtonText, { color: palette.onPrimary }]}>
                Generate New Code
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {!session && !generationError && (
          <View style={[styles.loadingContainer, { backgroundColor: palette.card }]}>
            <MaterialIcons name="hourglass-empty" size={48} color={palette.secondary} />
            <ThemedText style={styles.loadingText}>Generating secure session...</ThemedText>
          </View>
        )}

        {generationError && (
          <View style={[styles.errorContainer, { backgroundColor: palette.card }]}>
            <MaterialIcons name="error-outline" size={48} color={palette.danger} />
            <ThemedText style={styles.errorTitle}>Generation Failed</ThemedText>
            <ThemedText style={styles.errorText}>{generationError}</ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: palette.primary }]}
              onPress={async () => {
                setGenerationError("");
                setSession(null);
                setQrString("");
                setTimeLeft(SESSION_DURATION);
                await generateNewSession();
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={18} color={palette.onPrimary} />
              <ThemedText style={[styles.retryButtonText, { color: palette.onPrimary }]}>
                Try Again
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.instructions, { backgroundColor: palette.card }]}>
          <ThemedText style={[styles.instructionTitle, { color: palette.text }]}>How it works:</ThemedText>
          <View style={styles.instructionItem}>
            <ThemedText style={[styles.instructionNumber, { backgroundColor: palette.primary }]}>1</ThemedText>
            <ThemedText style={styles.instructionText}>
              Show this QR code to the person who wants to share a card with you
            </ThemedText>
          </View>
          <View style={styles.instructionItem}>
            <ThemedText style={[styles.instructionNumber, { backgroundColor: palette.primary }]}>2</ThemedText>
            <ThemedText style={styles.instructionText}>
              They will scan this code and select a card to share
            </ThemedText>
          </View>
          <View style={styles.instructionItem}>
            <ThemedText style={[styles.instructionNumber, { backgroundColor: palette.primary }]}>3</ThemedText>
            <ThemedText style={styles.instructionText}>
              They will generate an encrypted QR code for you to scan
            </ThemedText>
          </View>
          <View style={styles.instructionItem}>
            <ThemedText style={[styles.instructionNumber, { backgroundColor: palette.primary }]}>4</ThemedText>
            <ThemedText style={styles.instructionText}>
              Scan their QR code to import the card securely
            </ThemedText>
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
    marginBottom: 16,
  },
  expiredContainer: {
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
  expiredTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  expiredText: {
    textAlign: "center",
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
    marginBottom: 16,
  },
  loadingContainer: {
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
  loadingText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: "center",
  },
  errorContainer: {
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
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 8,
  },
  errorText: {
    textAlign: "center",
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  instructions: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
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
    minWidth: 24,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
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
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  regenerateButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
