import Hero from "@/components/Hero";
import QRDisplaySection from "@/components/QRDisplaySection";
import SessionTimerBar from "@/components/SessionTimerBar";
import ShareQRTemplate from "@/components/ShareQrTemplate";
import UnifiedModal, { UnifiedModalButton } from "@/components/UnifiedModal";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCountdown } from "@/hooks/use-countdown";
import {
    encryptCardForSharing,
} from "@/utils/cardSharing";
import { qrPayloadToQRString } from "@/utils/qr";
import { CardPayload, SessionPayload } from "@/utils/session";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Share from "react-native-share";
import ViewShot from "react-native-view-shot";
import { Colors } from "../../constants/theme";
import { useCards } from "../../context/CardContext";

export default function GenerateQRScreen() {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];
    const navigation = useNavigation();
    const router = useRouter();
    const params = useLocalSearchParams();
    const { cards, revealCard } = useCards();

    const selectedCardId = params.selectedCardId as string;
    const sessionId = params.sessionId as string;
    const receiverPublicKey = params.receiverPublicKey as string;
    const expiresAt = params.expiresAt ? parseInt(params.expiresAt as string) : null;
    const cardValidityMinutes = params.cardValidityMinutes !== undefined ? parseInt(params.cardValidityMinutes as string) : 15;

    const [qrData, setQrData] = useState<string>("");
    const [error, setError] = useState<string>("");
    const { isExpired, timeLeft } = expiresAt ? useCountdown(expiresAt) : { isExpired: false, timeLeft: 0 };
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{
        title: string;
        message: string;
        buttons?: UnifiedModalButton[];
        dismissible?: boolean;
        type?: "default" | "error" | "warning" | "success";
    }>({ title: "", message: "" });
    const [isSharing, setIsSharing] = useState(false);
    const snapshotRef = useRef<any>(null);
    const hasRedirectedRef = useRef(false);
    // Default dismissible to true (dismissible by default)
    const alertStateRef = useRef({ visible: false, dismissible: true });
    const isMountedRef = useRef(true);

    useLayoutEffect(() => {
        const isModalNonDismissible = alertStateRef.current.dismissible === false;

        navigation.setOptions({
            title: "Share QR Code",
            gestureEnabled: !isModalNonDismissible,
            headerLeft: () => (
                <TouchableOpacity
                    onPress={() => {
                        if (isModalNonDismissible) return;
                        router.back();
                    }}
                    style={{ marginLeft: 8, padding: 4 }}
                >
                    <MaterialIcons name="close" size={24} color={palette.text} />
                </TouchableOpacity>
            ),
        });
    }, [navigation, palette.text, router]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (alertStateRef.current.visible && alertStateRef.current.dismissible === false) {
                e.preventDefault();
            }
        });

        return unsubscribe;
    }, [navigation]);

    const card = cards.find((c) => c.id === selectedCardId);

    // Check if required params are available
    useEffect(() => {
        if (!selectedCardId || !sessionId || !receiverPublicKey || !expiresAt) {
            console.log("Generate QR Screen - Missing required params");
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
    }, [selectedCardId, sessionId, receiverPublicKey, expiresAt, router]);

    // Update alert state ref whenever alert changes
    useEffect(() => {
        alertStateRef.current = {
            visible: alertVisible,
            dismissible: alertConfig.dismissible ?? true
        };
    }, [alertVisible, alertConfig.dismissible]);

    // Track mount/unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    // Generate QR code
    useEffect(() => {
        let cancelled = false;

        const generateEncryptedQR = async () => {
            try {
                if (!selectedCardId) {
                    console.log("Generate QR Screen - Missing selectedCardId");
                    return;
                }

                // Fetch the full unmasked card data
                const fullCard = await revealCard(selectedCardId);

                if (!fullCard) {
                    throw new Error("Failed to retrieve full card data");
                }

                if (__DEV__) {
                    console.log("🔍 Full card data retrieved:", {
                        id: fullCard.id,
                        cardNumber: fullCard.cardNumber ? `****${fullCard.cardNumber.slice(-4)}` : "MISSING",
                        expiry: fullCard.expiry,
                    });
                }

                // Validate required card fields
                if (!fullCard.cardNumber || !fullCard.cardHolder || !fullCard.expiry) {
                    const missing = [];
                    if (!fullCard.cardNumber) missing.push("cardNumber");
                    if (!fullCard.cardHolder) missing.push("cardHolder");
                    if (!fullCard.expiry) missing.push("expiry");
                    throw new Error(`Card is missing required information: ${missing.join(", ")}`);
                }

                // Parse expiry
                const expiryParts = fullCard.expiry.split("/");
                if (expiryParts.length !== 2) {
                    throw new Error(`Invalid expiry format: "${fullCard.expiry}". Expected MM/YY or MM/YYYY`);
                }

                const expiryMonth = expiryParts[0].trim();
                const expiryYear = expiryParts[1].trim();

                if (!expiryMonth || !expiryYear) {
                    throw new Error(`Expiry parsing failed: month="${expiryMonth}", year="${expiryYear}"`);
                }

                // Prepare card data
                const cardData: CardPayload = {
                    cardId: fullCard.id,
                    cardholderName: fullCard.cardHolder,
                    cardNumber: fullCard.cardNumber,
                    expiryMonth: expiryMonth,
                    expiryYear: expiryYear,
                    brand: getCardBrand(fullCard.cardNumber),
                    sharedAt: Math.floor(Date.now() / 1000),
                    cardExpiresAt: cardValidityMinutes === null ? undefined : Math.floor(Date.now() / 1000) + (cardValidityMinutes * 60),
                    bank: fullCard.bank || undefined,
                    cobrandName: fullCard.cobrandName || undefined,
                    cardKind: fullCard.cardKind || undefined,
                    dominantColor: fullCard.dominantColor || undefined,
                };

                if (__DEV__) {
                    console.log("📋 Card data prepared:", {
                        cardId: cardData.cardId,
                        cardNumber: `****${cardData.cardNumber.slice(-4)}`,
                        expiryMonth: cardData.expiryMonth,
                        expiryYear: cardData.expiryYear,
                        brand: cardData.brand,
                    });
                }

                // Create session payload
                if (!expiresAt) {
                    throw new Error("Session expiry time is missing");
                }

                const sessionPayload: SessionPayload = {
                    version: 1,
                    sessionId,
                    receiverPublicKey,
                    expiresAt,
                };

                if (__DEV__) {
                    console.log("🔐 Session payload:", {
                        sessionId: sessionPayload.sessionId,
                        receiverPublicKey: sessionPayload.receiverPublicKey ? "present" : "MISSING",
                        expiresAt: sessionPayload.expiresAt,
                    });
                }

                // Encrypt card
                const qrPayload = await encryptCardForSharing(cardData, sessionPayload);

                if (__DEV__) {
                    console.log("📦 Generated QR Payload:", {
                        version: qrPayload.version,
                        sessionId: qrPayload.sessionId,
                        senderPublicKey: qrPayload.senderPublicKey ? `${qrPayload.senderPublicKey.substring(0, 30)}...` : "MISSING",
                        iv: qrPayload.iv ? `${qrPayload.iv.substring(0, 30)}...` : "MISSING",
                        ciphertext: qrPayload.ciphertext ? `${qrPayload.ciphertext.substring(0, 50)}...` : "MISSING",
                        expiresAt: qrPayload.expiresAt,
                    });
                }

                // Convert to QR string
                const qrString = qrPayloadToQRString(qrPayload);

                if (__DEV__) console.log("✅ QR string generated successfully");

                if (!cancelled) {
                    setQrData(qrString);
                }

            } catch (err) {
                console.error("Failed to generate QR:", err);
                if (!cancelled) {
                    setError("Failed to display QR code. Please try again.");
                }
            }
        };

        generateEncryptedQR();

        return () => {
            cancelled = true;
        };
    }, [selectedCardId, sessionId, receiverPublicKey, expiresAt, cardValidityMinutes]);

    // Session timer effect for expiry redirection
    useEffect(() => {
        if (isExpired && !hasRedirectedRef.current) {
            hasRedirectedRef.current = true;
            setAlertConfig({
                title: "Session Expired",
                message: "Your sharing session has expired. Please generate a new QR code.",
                type: "error",
                dismissible: false,
                buttons: [
                    {
                        text: "OK",
                        onPress: () => {
                            if (isMountedRef.current) {
                                setAlertVisible(false);
                            }
                            router.dismissAll();
                            router.push("/share-card/share");
                        }
                    }
                ]
            });
            if (isMountedRef.current) {
                setAlertVisible(true);
            }
        }
    }, [isExpired, router]);

    // Remove the separate expiry effect - it's now handled in the timer

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
        if (isSharing) return;
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

            setIsSharing(true);
            console.log("📸 Capturing QR code snapshot...");

            await new Promise(r => setTimeout(r, 80));

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
        } finally {
            setIsSharing(false);
        }
    }, [qrData, isSharing]);

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
                <SessionTimerBar
                    expiresAt={expiresAt}
                    label="Session expires in"
                />
                <View style={styles.container}>
                    <QRDisplaySection
                        qrData={qrData}
                        card={card}
                        onShareQR={handleShareQR}
                        onCardShared={handleShareComplete}
                        expiresInSeconds={timeLeft}
                        isGenerating={!qrData && !error}
                        isSharing={isSharing}
                    />
                </View>
            </SafeAreaView>

            <UnifiedModal
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                type={alertConfig.type}
                dismissible={alertConfig.dismissible}
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
                            quality: 0.95,
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

function getCardBrand(cardNumber: string): "VISA" | "MC" | "AMEX" | "OTHER" {
    const number = cardNumber.replace(/\D/g, '');
    if (number.startsWith('4')) return 'VISA';
    if (number.startsWith('5') || number.startsWith('2')) return 'MC';
    if (number.startsWith('3')) return 'AMEX';
    return 'OTHER';
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
});
