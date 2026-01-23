import AlertBox from "@/components/AlertBox";
import Hero from "@/components/Hero";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCountdown } from "@/hooks/use-countdown";
import { formatCardNumber } from "@/utils/formatCardNumber";
import { authenticateUser } from "@/utils/LockScreen";
import { SessionPayload } from "@/utils/session";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";
import { useCards } from "../../context/CardContext";

export default function SelectCardScreen() {
    const scheme = useColorScheme() ?? "light";
    const palette = Colors[scheme];
    const navigation = useNavigation();
    const router = useRouter();
    const { cards, isLoading, refreshCards, revealCard } = useCards();
    const { width } = Dimensions.get("window");
    const CARD_WIDTH = width * 0.8;
    const SPACING = 16;
    const ITEM_SIZE = CARD_WIDTH + SPACING;

    const {
        sessionId,
        receiverPublicKey,
        expiresAt: expiresAtStr,
    } = useLocalSearchParams<{
        sessionId?: string;
        receiverPublicKey?: string;
        expiresAt?: string;
    }>();

    const [sessionPayload, setSessionPayload] = useState<SessionPayload | null>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
    const [revealedCardData, setRevealedCardData] = useState<any>(null);
    const [isRevealingCard, setIsRevealingCard] = useState<boolean>(false);
    const [cardValidityMinutes, setCardValidityMinutes] = useState<number | null>(15);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; buttons?: any[]; cancelable?: boolean }>({ title: "", message: "" });
    const { timeLeft: sessionTimeLeft, isExpired } = useCountdown(sessionPayload?.expiresAt ?? null);
    const scrollX = useRef(new Animated.Value(0)).current;
    const hasRedirectedRef = useRef(false);

    useLayoutEffect(() => {
        const isModalNonDismissible = alertVisible && alertConfig.cancelable === false;

        navigation.setOptions({
            title: "Select Card",
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

    // Initialize session payload from params
    useEffect(() => {
        if (sessionId && receiverPublicKey && expiresAtStr) {
            const expiresAtNum = parseInt(expiresAtStr);
            const payload: SessionPayload = {
                version: 1,
                sessionId,
                receiverPublicKey,
                expiresAt: expiresAtNum,
            };
            setSessionPayload(payload);
        }
    }, [sessionId, receiverPublicKey, expiresAtStr]);

    // Refresh cards when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            console.log("🔄 Select card screen focused, refreshing cards...");
            refreshCards();
        }, [refreshCards])
    );

    // Disable screenshots when on card selection screen
    useEffect(() => {
        ScreenCapture.preventScreenCaptureAsync();
        return () => {
            ScreenCapture.allowScreenCaptureAsync();
        };
    }, []);

    // Auto-select the first card when there's only one available card
    useEffect(() => {
        const availableCards = cards.filter((card) => card.cardUser !== "other");
        if (availableCards.length === 1 && !selectedCardId) {
            setSelectedCardId(availableCards[0].id);
        }
    }, [cards, selectedCardId]);

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

    const handleRevealCard = useCallback(async (cardId: string) => {
        if (revealedCardId === cardId) {
            setRevealedCardId(null);
            setRevealedCardData(null);
            return;
        }

        try {
            const authenticated = await authenticateUser("card");
            if (!authenticated) {
                setAlertConfig({
                    title: "Authentication Failed",
                    message: "Biometric authentication failed. Please try again.",
                    buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
                });
                setAlertVisible(true);
                return;
            }

            setIsRevealingCard(true);
            const fullCard = await revealCard(cardId);
            if (fullCard) {
                setRevealedCardId(cardId);
                setRevealedCardData(fullCard);
            }
        } catch (error) {
            console.error("Failed to reveal card:", error);
            setAlertConfig({
                title: "Error",
                message: "Failed to reveal card details",
                buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
        } finally {
            setIsRevealingCard(false);
        }
    }, [revealedCardId, revealCard]);

    const handleGenerateQR = useCallback(() => {
        if (!selectedCardId || !sessionPayload) {
            setAlertConfig({
                title: "Error",
                message: "Please select a card to share",
                buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
            });
            setAlertVisible(true);
            return;
        }

        // Navigate to generate QR screen
        router.push({
            pathname: "/share-card/generate-qr",
            params: {
                selectedCardId,
                sessionId: sessionPayload.sessionId,
                receiverPublicKey: sessionPayload.receiverPublicKey,
                expiresAt: sessionPayload.expiresAt.toString(),
                cardValidityMinutes: cardValidityMinutes?.toString() || "15",
            },
        });
    }, [selectedCardId, sessionPayload, cardValidityMinutes, router]);

    const availableCards = cards.filter((card) => card.cardUser !== "other");

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return (
        <SafeAreaView
            style={[styles.safeArea, { backgroundColor: palette.surface }]}
        >
            <Hero
                title="Select Card"
                subtitle="Choose which card to share"
                showBackButton={true}
                onBack={() => router.back()}
            />
            {sessionTimeLeft > 0 && (
                <View style={[styles.sessionTimerBar, { backgroundColor: palette.primary + '15', borderBottomColor: palette.primary }]}>
                    <MaterialIcons name="schedule" size={16} color={palette.primary} />
                    <ThemedText style={[styles.sessionTimerText, { color: palette.primary }]}>
                        Session expires in {formatTime(sessionTimeLeft)}
                    </ThemedText>
                </View>
            )}
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
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
                                name="credit-card-off"
                                size={64}
                                color={palette.secondary}
                            />
                            <ThemedText style={styles.emptyTitle}>No Cards to Share</ThemedText>
                            <ThemedText style={styles.emptyText}>
                                You need to add some cards before you can share them.
                            </ThemedText>
                            <TouchableOpacity
                                style={[
                                    styles.addCardButton,
                                    { backgroundColor: palette.primary }
                                ]}
                                onPress={() => router.push({
                                    pathname: "/add-card",
                                    params: {
                                        redirectTo: "/share-card/select-card",
                                        sessionId,
                                        receiverPublicKey,
                                        expiresAt: expiresAtStr,
                                    }
                                })}
                                activeOpacity={0.8}
                            >
                                <MaterialIcons name="add" size={24} color={palette.onPrimary} />
                                <ThemedText style={[styles.addCardButtonText, { color: palette.onPrimary }]}>
                                    Add Card
                                </ThemedText>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Animated.FlatList
                            data={availableCards}
                            keyExtractor={(item) => item.id}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={ITEM_SIZE}
                            decelerationRate="fast"
                            contentContainerStyle={{
                                paddingHorizontal: (width - ITEM_SIZE) / 2,
                                paddingVertical: 20,
                                alignItems: 'center',
                            }}
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                                { useNativeDriver: true }
                            )}
                            onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
                                const index = Math.round(event.nativeEvent.contentOffset.x / ITEM_SIZE);
                                if (availableCards[index]) {
                                    setSelectedCardId(availableCards[index].id);
                                }
                            }}
                            renderItem={({ item: card, index }) => {
                                const isSelected = selectedCardId === card.id;
                                const isRevealed = revealedCardId === card.id;
                                const cardColor = card.dominantColor || palette.primary;

                                const inputRange = [
                                    (index - 1) * ITEM_SIZE,
                                    index * ITEM_SIZE,
                                    (index + 1) * ITEM_SIZE,
                                ];

                                const scale = scrollX.interpolate({
                                    inputRange,
                                    outputRange: [0.9, 1, 0.9],
                                    extrapolate: 'clamp',
                                });

                                const opacity = scrollX.interpolate({
                                    inputRange,
                                    outputRange: [0.7, 1, 0.7],
                                    extrapolate: 'clamp',
                                });

                                return (
                                    <TouchableOpacity
                                        onPress={() => setSelectedCardId(card.id)}
                                        activeOpacity={0.9}
                                    >
                                        <Animated.View
                                            style={{
                                                width: CARD_WIDTH,
                                                marginRight: SPACING,
                                                transform: [{ scale }],
                                                opacity,
                                            }}
                                        >
                                            <View
                                                style={[
                                                    styles.cardContainer,
                                                    {
                                                        backgroundColor: cardColor,
                                                        height: 200,
                                                        justifyContent: 'space-between',
                                                        padding: 24,
                                                        shadowColor: cardColor,
                                                        shadowOpacity: isSelected ? 0.4 : 0.1,
                                                        shadowOffset: { width: 0, height: 8 },
                                                        shadowRadius: 12,
                                                        elevation: isSelected ? 8 : 2,
                                                    },
                                                ]}
                                            >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <View>
                                                        <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '700', opacity: 0.9 }}>
                                                            {card.bank || 'Bank'}
                                                        </ThemedText>
                                                        <ThemedText style={{ color: '#fff', fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                                                            {card.cardName || 'Card'}
                                                        </ThemedText>
                                                    </View>
                                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                                                        <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
                                                            {card.cardKind === "credit" ? "💳" : "💵"} {card.cardKind?.toUpperCase() || 'DEBIT'}
                                                        </ThemedText>
                                                    </View>
                                                </View>

                                                <View style={styles.cardNumberRow}>
                                                    <ThemedText
                                                        numberOfLines={1}
                                                        adjustsFontSizeToFit
                                                        style={styles.cardNumber}
                                                    >
                                                        {isRevealed && revealedCardData
                                                            ? formatCardNumber(revealedCardData.cardNumber)
                                                            : formatCardNumber(card.cardNumber)}
                                                    </ThemedText>

                                                    <TouchableOpacity
                                                        onPress={() => handleRevealCard(card.id)}
                                                        disabled={isRevealingCard}
                                                        hitSlop={10}
                                                    >
                                                        <MaterialIcons
                                                            name={isRevealed ? "visibility" : "visibility-off"}
                                                            size={18}
                                                            color="rgba(255,255,255,0.8)"
                                                        />
                                                    </TouchableOpacity>
                                                </View>

                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                    <View>
                                                        <ThemedText style={{ color: '#fff', fontSize: 10, opacity: 0.7, textTransform: 'uppercase', marginBottom: 2 }}>
                                                            Card Holder
                                                        </ThemedText>
                                                        <ThemedText style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                                                            {isRevealed && revealedCardData ? revealedCardData.cardHolder : card.cardHolder}
                                                        </ThemedText>
                                                    </View>
                                                    <View style={{ alignItems: 'flex-end' }}>
                                                        <ThemedText style={{ color: '#fff', fontSize: 10, opacity: 0.7, textTransform: 'uppercase', marginBottom: 2 }}>
                                                            Expires
                                                        </ThemedText>
                                                        <ThemedText style={{ color: '#fff', fontSize: 14, fontWeight: '600', fontFamily: 'monospace', letterSpacing: 1 }}>
                                                            {isRevealed && revealedCardData ? revealedCardData.expiry : (card.expiry || 'XX/XX')}
                                                        </ThemedText>
                                                    </View>
                                                </View>

                                                {isSelected && (
                                                    <View style={[styles.selectedIndicator, { backgroundColor: '#fff', top: -10, right: -10 }]}>
                                                        <MaterialIcons name="check" size={16} color={cardColor} />
                                                    </View>
                                                )}
                                            </View>
                                        </Animated.View>
                                    </TouchableOpacity>
                                );
                            }}
                        />
                    )}
                </View>

                {!isLoading && availableCards.length > 0 && (
                    <View style={{ paddingHorizontal: 40, marginBottom: 20 }}>
                        <View style={{ height: 1, backgroundColor: palette.border, opacity: 0.5, marginBottom: 24 }} />

                        <View style={[
                            styles.securityPill,
                            {
                                backgroundColor: scheme === "dark"
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.04)"
                            }
                        ]}>
                            <MaterialIcons
                                name="lock"
                                size={14}
                                color={palette.secondary}
                            />
                            <ThemedText style={styles.securityPillText}>
                                CVV never shared · Encrypted end-to-end
                            </ThemedText>
                        </View>

                        <View style={[styles.validitySelector, { backgroundColor: 'transparent', padding: 0, shadowOpacity: 0, elevation: 0 }]}>
                            <ThemedText style={[styles.validitySelectorTitle, { color: palette.text, fontSize: 18, marginBottom: 8 }]}>
                                Set Expiry Time
                            </ThemedText>
                            <ThemedText style={[styles.validitySelectorSubtitle, { color: palette.secondary, marginBottom: 16 }]}>
                                How long will this stay on their device?
                            </ThemedText>
                            <View style={styles.validityOptions}>
                                {[
                                    { label: "15m", value: 15 },
                                    { label: "1h", value: 60 },
                                    { label: "1d", value: 1440 },
                                    { label: "∞ Forever", value: null },
                                ].map((option) => (
                                    <TouchableOpacity
                                        key={option.value === null ? "infinity" : option.value}
                                        onPress={() => setCardValidityMinutes(option.value)}
                                        style={[
                                            styles.validityOption,
                                            {
                                                backgroundColor: cardValidityMinutes === option.value ? palette.primary : palette.card,
                                                borderColor: cardValidityMinutes === option.value ? palette.primary : palette.border,
                                                borderWidth: 1,
                                                height: 45,
                                                minWidth: '22%'
                                            },
                                        ]}
                                        activeOpacity={0.7}
                                    >
                                        <ThemedText
                                            style={[
                                                styles.validityOptionText,
                                                {
                                                    color: cardValidityMinutes === option.value ? palette.onPrimary : palette.text,
                                                    fontWeight: cardValidityMinutes === option.value ? "700" : "500",
                                                    textAlign: 'center',
                                                },
                                            ]}
                                        >
                                            {option.label}
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={{ height: 32 }} />
                    </View>
                )}

                {!isLoading && availableCards.length > 0 && (
                    <View style={[styles.buttonContainer, { paddingTop: 0, marginTop: 0 }]}>
                        <TouchableOpacity
                            style={[
                                styles.generateButton,
                                {
                                    backgroundColor: selectedCardId ? palette.primary : palette.border,
                                    height: 56,
                                    borderRadius: 16,
                                },
                            ]}
                            onPress={handleGenerateQR}
                            disabled={!selectedCardId || isGenerating}
                            activeOpacity={selectedCardId ? 0.8 : 1}
                        >
                            {isGenerating ? (
                                <MaterialIcons name="hourglass-top" size={24} color={palette.onPrimary} />
                            ) : (
                                <MaterialIcons
                                    name="qr-code"
                                    size={24}
                                    color={selectedCardId ? palette.onPrimary : palette.secondary}
                                />
                            )}
                            <ThemedText
                                style={[
                                    styles.generateButtonText,
                                    {
                                        color: selectedCardId ? palette.onPrimary : palette.secondary,
                                        fontSize: 18,
                                    },
                                ]}
                            >
                                {isGenerating ? "Processing..." : "Generate Secure QR"}
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <AlertBox
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                cancelable={alertConfig.cancelable}
                onRequestClose={() => setAlertVisible(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    cardsList: { flex: 1 },
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
        marginBottom: 24,
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
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    cardNumberRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 12,
    },
    cardNumber: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "700",
        letterSpacing: 1.4,
        fontFamily: "monospace",
        flex: 1,
        marginRight: 12,
    },
    securityPill: {
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        marginTop: 8,
        marginBottom: 12,
        opacity: 0.85,
    },
    securityPillText: {
        fontSize: 12,
        fontWeight: "500",
        letterSpacing: 0.2,
    },
    validitySelector: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },
    validitySelectorTitle: {
        fontSize: 16,
        fontWeight: "600",
        marginBottom: 4,
    },
    validitySelectorSubtitle: {
        fontSize: 13,
        opacity: 0.7,
        marginBottom: 12,
    },
    validityOptions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    validityOption: {
        flex: 1,
        minWidth: "45%",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    validityOptionText: {
        fontSize: 13,
    },
    buttonContainer: {
        padding: 20,
        paddingTop: 16,
        paddingBottom: 32,
        gap: 12,
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
    addCardButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
        marginTop: 24,
    },
    addCardButtonText: {
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
