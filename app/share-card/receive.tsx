import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { x25519 } from "@noble/curves/ed25519.js";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import { useNavigation, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, Share, StyleSheet, TouchableOpacity, View } from "react-native";
import "react-native-get-random-values"; // Polyfill for crypto.getRandomValues
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";

const SESSION_DURATION = 300; // 5 minutes in seconds

// Generate Curve25519/X25519 ephemeral key pair as per spec 3.1
async function generateEphemeralKeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }> {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return { publicKey, privateKey };
}

export default function ReceiveCardScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();

  const [sessionPayload, setSessionPayload] = useState<any>(null);
  const [sessionCode, setSessionCode] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(SESSION_DURATION);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [generationError, setGenerationError] = useState<string>("");

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

        // Check if there's an existing active session
        const existingSessionId = await SecureStore.getItemAsync("current_session_id", {
          keychainService: "cardywall_sessions"
        });

        if (existingSessionId) {
          console.log("✅ Found existing session:", existingSessionId);

          // Retrieve the existing session payload and code
          try {
            const sessionPayloadStr = await SecureStore.getItemAsync(`session_payload_${existingSessionId}`, {
              keychainService: "cardywall_sessions"
            });

            if (sessionPayloadStr) {
              const payload = JSON.parse(sessionPayloadStr);

              // Check if session is still valid (not expired)
              if (payload.expiresAt > Math.floor(Date.now() / 1000)) {
                console.log("✅ Session is still valid, reusing it");

                // Find the code for this session
                // We need to search through all stored codes to find the one matching this sessionId
                // For now, we'll store the code alongside the session
                const storedCode = await SecureStore.getItemAsync(`session_code_for_${existingSessionId}`, {
                  keychainService: "cardywall_sessions"
                });

                if (storedCode) {
                  setSessionPayload(payload);
                  setSessionCode(storedCode);

                  // Calculate remaining time
                  const now = Math.floor(Date.now() / 1000);
                  const remaining = Math.max(0, payload.expiresAt - now);
                  setTimeLeft(remaining);

                  console.log("✅ Loaded existing session with code:", storedCode);
                  return;
                }
              } else {
                console.log("⏰ Existing session has expired, generating new one");
              }
            }
          } catch (loadError) {
            console.warn("⚠️ Failed to load existing session:", loadError);
          }
        }

        // No valid existing session, generate a new one
        console.log("🔐 Generating new session...");
        await generateNewSession();

      } catch (error) {
        console.error("❌ Failed to load or generate session:", error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        setGenerationError(errorMsg);
        Alert.alert(
          "Error",
          `Failed to generate secure session: ${errorMsg}\n\nPlease try again.`
        );
      }
    };

    loadOrGenerateSession();
  }, []);

  // Helper function to generate a new session
  const generateNewSession = useCallback(async () => {
    try {
      console.log("🔐 Starting new session generation...");

      // Clean up any existing session first (keep only one session at a time)
      try {
        console.log("🧹 Cleaning up any existing sessions...");
        const previousSessionId = await SecureStore.getItemAsync("current_session_id", {
          keychainService: "cardywall_sessions"
        });

        if (previousSessionId) {
          console.log("🧹 Deleting previous session:", previousSessionId);
          await SecureStore.deleteItemAsync(`session_private_${previousSessionId}`, {
            keychainService: "cardywall_sessions"
          });
          await SecureStore.deleteItemAsync(`session_payload_${previousSessionId}`, {
            keychainService: "cardywall_sessions"
          });

          // Delete all code mappings for this session
          try {
            const previousCode = await SecureStore.getItemAsync(`session_code_for_${previousSessionId}`, {
              keychainService: "cardywall_sessions"
            });
            if (previousCode) {
              await SecureStore.deleteItemAsync(`session_code_${previousCode}`, {
                keychainService: "cardywall_sessions"
              });
              await SecureStore.deleteItemAsync(`session_code_for_${previousSessionId}`, {
                keychainService: "cardywall_sessions"
              });
            }
          } catch {
            // Code mapping might not exist
          }

          console.log("✅ Previous session cleaned up");
        }
      } catch (cleanupError) {
        console.warn("⚠️ No previous session to clean up:", cleanupError);
      }

      // Generate UUIDv4 for sessionId
      const sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      console.log("✅ Generated sessionId:", sessionId);

      // Generate Curve25519/X25519 ephemeral key pair (spec 3.1)
      console.log("🔐 Generating ephemeral key pair...");
      let keyPair;
      try {
        keyPair = await generateEphemeralKeyPair();
        console.log("✅ Generated key pair, public key length:", keyPair.publicKey.length);
      } catch (keyError) {
        console.error("❌ Key generation failed:", keyError);
        throw new Error(`Key generation failed: ${keyError}`);
      }

      let receiverPublicKeyBase64;
      try {
        receiverPublicKeyBase64 = btoa(String.fromCharCode(...keyPair.publicKey));
        console.log("✅ Encoded public key to base64");
      } catch (encodeError) {
        console.error("❌ Base64 encoding failed:", encodeError);
        throw new Error(`Base64 encoding failed: ${encodeError}`);
      }

      // Generate device binding (SHA256 of device identifier)
      console.log("🔐 Generating device binding...");
      let deviceBinding;
      try {
        const deviceSalt = "cardywall-device-" + sessionId;
        deviceBinding = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          deviceSalt
        );
        console.log("✅ Generated device binding");
      } catch (hashError) {
        console.error("❌ Device binding generation failed:", hashError);
        throw new Error(`Device binding failed: ${hashError}`);
      }

      // Set expiration (5 minutes from now)
      const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION;

      // Create session payload as specified in spec 3.2
      const payload = {
        version: 1,
        sessionId: sessionId,
        receiverPublicKey: receiverPublicKeyBase64,
        expiresAt: expiresAt,
        deviceBinding: deviceBinding
      };

      // Store receiver's private key in SecureStore (spec 3.1)
      console.log("🔐 Storing private key in SecureStore...");
      try {
        const privateKeyBase64 = btoa(String.fromCharCode(...keyPair.privateKey));
        await SecureStore.setItemAsync(`session_private_${sessionId}`, privateKeyBase64, {
          keychainService: "cardywall_sessions"
        });
        console.log("✅ Stored private key");
      } catch (storeError) {
        console.error("❌ SecureStore private key storage failed:", storeError);
        throw new Error(`SecureStore failed: ${storeError}`);
      }

      // Store full session payload for sender to retrieve
      console.log("🔐 Storing session payload in SecureStore...");
      try {
        await SecureStore.setItemAsync(`session_payload_${sessionId}`, JSON.stringify(payload), {
          keychainService: "cardywall_sessions"
        });
        console.log("✅ Stored session payload");
      } catch (storeError) {
        console.error("❌ SecureStore payload storage failed:", storeError);
        throw new Error(`SecureStore payload failed: ${storeError}`);
      }

      // Generate a human-readable 6-character code for sharing
      const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
      let code = "";
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Store mapping from 6-char code to sessionId so sender can retrieve session
      console.log("🔐 Storing code-to-sessionId mapping...");
      try {
        await SecureStore.setItemAsync(`session_code_${code}`, sessionId, {
          keychainService: "cardywall_sessions"
        });
        // Also store reverse mapping for easy retrieval
        await SecureStore.setItemAsync(`session_code_for_${sessionId}`, code, {
          keychainService: "cardywall_sessions"
        });
        console.log("✅ Stored code mapping:", code, "->", sessionId);
      } catch (codeMapError) {
        console.error("❌ Code mapping storage failed:", codeMapError);
        throw new Error(`Code mapping failed: ${codeMapError}`);
      }

      // Store current session ID so we can clean it up when generating a new one
      console.log("🔐 Storing current session ID...");
      try {
        await SecureStore.setItemAsync("current_session_id", sessionId, {
          keychainService: "cardywall_sessions"
        });
        console.log("✅ Stored current session ID");
      } catch (currentError) {
        console.error("❌ Failed to store current session ID:", currentError);
        throw new Error(`Current session ID storage failed: ${currentError}`);
      }

      setSessionPayload(payload);
      setSessionCode(code);
      setTimeLeft(SESSION_DURATION);
      setIsExpired(false);
      setGenerationError("");

      console.log("✅ Session generation complete:", {
        sessionId,
        code,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        hasReceiverPublicKey: !!receiverPublicKeyBase64,
        hasDeviceBinding: !!deviceBinding
      });

    } catch (error) {
      console.error("❌ Failed to generate session:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setGenerationError(errorMsg);
      Alert.alert(
        "Error",
        `Failed to generate secure session: ${errorMsg}\n\nPlease try again.`
      );
    }
  }, []);

  // Countdown timer and session expiry cleanup (only on timeout, not on app background)
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      // Clean up expired session
      (async () => {
        if (sessionPayload?.sessionId) {
          try {
            console.log("⏰ Session expired, cleaning up...");
            await SecureStore.deleteItemAsync(`session_private_${sessionPayload.sessionId}`, {
              keychainService: "cardywall_sessions"
            });
            await SecureStore.deleteItemAsync(`session_payload_${sessionPayload.sessionId}`, {
              keychainService: "cardywall_sessions"
            });
            await SecureStore.deleteItemAsync(`session_code_${sessionCode}`, {
              keychainService: "cardywall_sessions"
            });
            await SecureStore.deleteItemAsync("current_session_id", {
              keychainService: "cardywall_sessions"
            });
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
  }, [timeLeft, sessionPayload?.sessionId, sessionCode]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const regenerateSession = useCallback(async () => {
    try {
      setGenerationError("");
      setSessionCode("");
      setSessionPayload(null);
      setTimeLeft(SESSION_DURATION);
      setIsExpired(false);

      await generateNewSession();
    } catch (error) {
      console.error("Failed to regenerate session:", error);
      Alert.alert("Error", "Failed to regenerate session. Please try again.");
    }
  }, [generateNewSession]);

  const copySessionCode = useCallback(async () => {
    if (!sessionCode) return;

    try {
      await Clipboard.setStringAsync(sessionCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000); // Reset after 2 seconds
    } catch {
      Alert.alert("Error", "Failed to copy session code to clipboard");
    }
  }, [sessionCode]);

  const shareSessionCode = useCallback(async () => {
    if (!sessionCode) return;

    const message = `Here's my CardyWall session code to share a card: ${sessionCode}\n\nCode expires in 5 minutes.`;

    try {
      const result = await Share.share({
        message: message,
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with activity type
        } else {
          // Shared
        }
      } else if (result.action === Share.dismissedAction) {
        // Dismissed
      }
    } catch {
      // Fallback to clipboard if sharing fails
      try {
        await Clipboard.setStringAsync(message);
        Alert.alert("Copied!", "Session code copied to clipboard. Share it with the card sender.");
      } catch {
        Alert.alert("Error", "Failed to share session code");
      }
    }
  }, [sessionCode]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: palette.card }]}>
            <MaterialIcons name="qr-code-scanner" size={48} color={palette.tint} />
          </View>

          <ThemedText type="title" style={styles.title}>
            Receive Card
          </ThemedText>

          <ThemedText style={styles.description}>
            Share this code with someone to securely receive their card details.
            The code expires in 5 minutes.
          </ThemedText>

          {sessionCode && !isExpired && (
            <View style={[styles.codeContainer, { backgroundColor: palette.card }]}>
              <ThemedText style={styles.codeLabel}>Session Code</ThemedText>
              <ThemedText type="title" style={styles.code}>
                {sessionCode}
              </ThemedText>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: palette.surface }]}
                  onPress={copySessionCode}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name={copiedCode ? "check" : "content-copy"}
                    size={18}
                    color={copiedCode ? palette.primary : palette.tint}
                  />
                  <ThemedText
                    style={[
                      styles.actionButtonText,
                      { color: copiedCode ? palette.primary : palette.text }
                    ]}
                  >
                    {copiedCode ? "Copied!" : "Copy"}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: palette.primary }]}
                  onPress={shareSessionCode}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="send" size={18} color={palette.onPrimary} />
                  <ThemedText style={[styles.actionButtonText, { color: palette.onPrimary }]}>
                    Share
                  </ThemedText>
                </TouchableOpacity>
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
              <ThemedText style={styles.timer}>
                Expires in {formatTime(timeLeft)}
              </ThemedText>
            </View>
          )}

          {isExpired && (
            <View style={[styles.expiredContainer, { backgroundColor: palette.card }]}>
              <MaterialIcons name="schedule" size={32} color={palette.danger || "#ff4444"} />
              <ThemedText style={styles.expiredTitle}>Session Expired</ThemedText>
              <ThemedText style={styles.expiredText}>
                This session code has expired. Generate a new one to continue.
              </ThemedText>
            </View>
          )}

          {!sessionCode && !generationError && (
            <View style={[styles.loadingContainer, { backgroundColor: palette.card }]}>
              <MaterialIcons name="hourglass-empty" size={48} color={palette.secondary} />
              <ThemedText style={styles.loadingText}>Generating secure session...</ThemedText>
            </View>
          )}

          {generationError && (
            <View style={[styles.errorContainer, { backgroundColor: palette.card }]}>
              <MaterialIcons name="error-outline" size={48} color={palette.danger || "#ff4444"} />
              <ThemedText style={styles.errorTitle}>Generation Failed</ThemedText>
              <ThemedText style={styles.errorText}>{generationError}</ThemedText>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: palette.primary }]}
                onPress={async () => {
                  setGenerationError("");
                  setSessionCode("");
                  setSessionPayload(null);
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

          <View style={styles.instructions}>
            <ThemedText style={styles.instructionTitle}>How it works:</ThemedText>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.instructionNumber}>1</ThemedText>
              <ThemedText style={styles.instructionText}>
                Share the session code above with the card sender
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.instructionNumber}>2</ThemedText>
              <ThemedText style={styles.instructionText}>
                Sender enters the code and selects a card to share
              </ThemedText>
            </View>
            <View style={styles.instructionItem}>
              <ThemedText style={styles.instructionNumber}>3</ThemedText>
              <ThemedText style={styles.instructionText}>
                Scan the QR code they generate to import the card
              </ThemedText>
            </View>
          </View>
        </View>

        {isExpired && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.regenerateButton, { backgroundColor: palette.primary }]}
              onPress={regenerateSession}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={20} color={palette.onPrimary} />
              <ThemedText style={[styles.regenerateButtonText, { color: palette.onPrimary }]}>
                Generate New Code
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {!isExpired && sessionCode && (
          <View style={styles.waitingContainer}>
            <MaterialIcons name="hourglass-empty" size={24} color={palette.secondary || "#666"} />
            <ThemedText style={styles.waitingText}>
              Waiting for sender...
            </ThemedText>
          </View>
        )}
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
  codeContainer: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  codeLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  code: {
    fontSize: 36,
    fontWeight: "bold",
    letterSpacing: 4,
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
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
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginBottom: 12,
  },
  regenerateCodeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  timer: {
    fontSize: 14,
    opacity: 0.6,
  },
  expiredContainer: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
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
  },
  loadingContainer: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
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
    marginBottom: 32,
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
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
  waitingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  waitingText: {
    fontSize: 16,
    opacity: 0.7,
  },
});
