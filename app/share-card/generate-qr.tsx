import AlertBox from "@/components/AlertBox";
import Hero from "@/components/Hero";
import QRDisplaySection from "@/components/QRDisplaySection";
import ShareQRTemplate from "@/components/ShareQrTemplate";
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
    const cardValidityMinutes = params.cardValidityMinutes ? parseInt(params.cardValidityMinutes as string) : 15;

    const [qrData, setQrData] = useState<string>("");
    const [error, setError] = useState<string>("");
    const { timeLeft, isExpired, formatTime } = useCountdown(expiresAt);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; buttons?: any[]; cancelable?: boolean }>({ title: "", message: "" });
    const snapshotRef = useRef<any>(null);
    const hasRedirectedRef = useRef(false);

    useLayoutEffect(() => {
        const isModalNonDismissible = alertVisible && alertConfig.cancelable === false;

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

        // Cleanup: reset alert when screen unmounts or loses focus
        const unsubscribe = navigation.addListener('beforeRemove', (e) => {
            if (alertVisible && alertConfig.cancelable === false) {
                // Prevent navigation if a non-dismissible alert is up
                e.preventDefault();
                return;
            }
            setAlertVisible(false);
        });

        return unsubscribe;
    }, [navigation, palette.text, router, alertVisible, alertConfig.cancelable]);

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

    // Generate QR code
    useEffect(() => {
        const generateEncryptedQR = async () => {
            try {
                if (!card || !selectedCardId) {
                    console.log("Generate QR Screen - Missing data");
                    return;
                }

                // Fetch the full unmasked card data
                const fullCard = await revealCard(selectedCardId);

                if (!fullCard) {
                    throw new Error("Failed to retrieve full card data");
                }

                console.log("🔍 Full card data retrieved:", {
                    id: fullCard.id,
                    cardNumber: fullCard.cardNumber ? `****${fullCard.cardNumber.slice(-4)}` : "MISSING",
                    cardHolder: fullCard.cardHolder,
                    expiry: fullCard.expiry,
                    bank: fullCard.bank,
                    cardName: fullCard.cardName,
                });

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

                console.log("📋 Card data prepared:", {
                    cardId: cardData.cardId,
                    cardholderName: cardData.cardholderName,
                    cardNumber: `****${cardData.cardNumber.slice(-4)}`,
                    expiryMonth: cardData.expiryMonth,
                    expiryYear: cardData.expiryYear,
                    brand: cardData.brand,
                    sharedAt: cardData.sharedAt,
                });

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

                console.log("🔐 Session payload:", {
                    sessionId: sessionPayload.sessionId,
                    receiverPublicKey: sessionPayload.receiverPublicKey ? "present" : "MISSING",
                    expiresAt: sessionPayload.expiresAt,
                });

                // Encrypt card
                const qrPayload = await encryptCardForSharing(cardData, sessionPayload);

                console.log("📦 Generated QR Payload:", {
                    version: qrPayload.version,
                    sessionId: qrPayload.sessionId,
                    senderPublicKey: qrPayload.senderPublicKey ? `${qrPayload.senderPublicKey.substring(0, 30)}...` : "MISSING",
                    iv: qrPayload.iv ? `${qrPayload.iv.substring(0, 30)}...` : "MISSING",
                    ciphertext: qrPayload.ciphertext ? `${qrPayload.ciphertext.substring(0, 50)}...` : "MISSING",
                    expiresAt: qrPayload.expiresAt,
                });

                // Convert to QR string
                const qrString = qrPayloadToQRString(qrPayload);

                console.log("✅ QR string generated successfully");
                setQrData(qrString);

            } catch (err) {
                console.error("Failed to generate QR:", err);
                setError("Failed to display QR code. Please try again.");
            }
        };

        generateEncryptedQR();
    }, [card, selectedCardId, sessionId, receiverPublicKey, expiresAt, cardValidityMinutes, revealCard]);

    // Session timer effect for expiry redirection
    useEffect(() => {
        if (isExpired && !hasRedirectedRef.current && navigation.isFocused()) {
            hasRedirectedRef.current = true;
            setAlertConfig({
                title: "Session Expired",
                message: "Your sharing session has expired. Please scan the QR code again.",
                cancelable: false,
                buttons: [
                    {
                        text: "OK",
                        onPress: () => {
                            setAlertVisible(false);
                            router.dismissAll();
                            router.push("/share-card/share");
                        }
                    }
                ]
            });
            setAlertVisible(true);
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
                {timeLeft > 0 && (
                    <View style={[styles.sessionTimerBar, { backgroundColor: palette.primary + '15', borderBottomColor: palette.primary }]}>
                        <MaterialIcons name="schedule" size={16} color={palette.primary} />
                        <ThemedText style={[styles.sessionTimerText, { color: palette.primary }]}>
                            Session expires in {formatTime(timeLeft)}
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
                cancelable={alertConfig.cancelable}
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
