import AlertBox from "@/components/AlertBox";
import Hero from "@/components/Hero";
import QRDisplaySection from "@/components/QRDisplaySection";
import ShareQRTemplate from "@/components/ShareQrTemplate";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
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
  const expiresAt = params.expiresAt ? parseInt(params.expiresAt as string) : null;
  const sessionExpiresAt = params.sessionExpiresAt ? parseInt(params.sessionExpiresAt as string) : null;

  const [qrData, setQrData] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(0);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
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

  // Calculate and update remaining time
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, expiresAt - now);
      setTimeLeft(remaining);
    };

    updateTimeLeft();

    const timer = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  // Session timer - calculates from sessionExpiresAt timestamp
  useEffect(() => {
    if (!sessionExpiresAt) return;

    const updateSessionTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, sessionExpiresAt - now);
      setSessionTimeLeft(remaining);

      if (remaining === 0 && !sessionExpired) {
        setSessionExpired(true);
        setAlertConfig({
          title: "Session Expired",
          message: "Your session has expired. Please go back and scan the receiver's QR code again.",
          buttons: [
            {
              text: "OK",
              onPress: () => {
                setAlertVisible(false);
                router.back();
              },
            },
          ],
        });
        setAlertVisible(true);
      }
    };

    updateSessionTimeLeft();
    const timer = setInterval(updateSessionTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [sessionExpiresAt, sessionExpired, router]);

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


  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
        {sessionTimeLeft > 0 && (
          <View style={[styles.sessionTimerBar, { backgroundColor: palette.primary + '15', borderBottomColor: palette.primary }]}>
            <MaterialIcons name="schedule" size={16} color={palette.primary} />
            <ThemedText style={[styles.sessionTimerText, { color: palette.primary }]}>
              Session expires in {formatTime(sessionTimeLeft)}
            </ThemedText>
          </View>
        )}
        <View style={styles.container}>
          <QRDisplaySection
            qrData={qrData}
            card={card}
            onShareQR={handleShareQR}
            onCardShared={handleShareComplete}
            expiresInSeconds={timeLeft}
          />
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
  sessionTimerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  sessionTimerText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
