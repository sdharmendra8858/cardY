import AlertBox from "@/components/AlertBox";
import Hero from "@/components/Hero";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  encryptCardForSharing,
  validateSessionPayload,
} from "@/utils/cardSharing";
import { formatCardNumber } from "@/utils/formatCardNumber";
import { authenticateUser } from "@/utils/LockScreen";
import {
  parseSessionQRString,
  qrPayloadToQRString,
} from "@/utils/qr";
import { CardPayload, SessionPayload } from "@/utils/session";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Camera, CameraView } from "expo-camera";
import { useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import * as ScreenCapture from "expo-screen-capture";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
  const {
    selectedCardId: initialSelectedCardId,
    showCardSelection: forceCardSelection,
    sessionId: restoredSessionId,
    receiverPublicKey: restoredReceiverPublicKey,
    expiresAt: restoredExpiresAt
  } = useLocalSearchParams<{
    selectedCardId?: string;
    showCardSelection?: string;
    sessionId?: string;
    receiverPublicKey?: string;
    expiresAt?: string;
  }>();
  const { cards, isLoading, refreshCards, revealCard } = useCards();
  const { width } = Dimensions.get("window");
  const CARD_WIDTH = width * 0.8;
  const SPACING = 16;
  const ITEM_SIZE = CARD_WIDTH + SPACING;

  const [sessionPayload, setSessionPayload] = useState<SessionPayload | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(initialSelectedCardId || null);
  const [showCardSelection, setShowCardSelection] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const [revealedCardData, setRevealedCardData] = useState<any>(null);
  const [isRevealingCard, setIsRevealingCard] = useState<boolean>(false);
  const [cardValidityMinutes, setCardValidityMinutes] = useState<number | null>(15); // 15 minutes default
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; buttons?: any[] }>({ title: "", message: "" });
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const scrollX = useRef(new Animated.Value(0)).current;

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

  // Refresh cards when screen comes into focus to get latest card data
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 Share screen focused, refreshing cards...");
      refreshCards();
    }, [refreshCards])
  );

  // Disable screenshots when showing card selection
  useEffect(() => {
    if (showCardSelection) {
      ScreenCapture.preventScreenCaptureAsync();
      return () => {
        ScreenCapture.allowScreenCaptureAsync();
      };
    }
  }, [showCardSelection]);

  // Auto-select the first card when there's only one available card
  useEffect(() => {
    const availableCards = cards.filter((card) => card.cardUser !== "other");
    if (availableCards.length === 1 && !selectedCardId) {
      setSelectedCardId(availableCards[0].id);
    }
  }, [cards, selectedCardId]);




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


  // Handle redirect from add card screen
  useEffect(() => {
    if (forceCardSelection === "true") {
      // Check if we have session parameters to restore
      if (restoredSessionId && restoredReceiverPublicKey && restoredExpiresAt) {
        const restoredPayload: SessionPayload = {
          version: 1,
          sessionId: restoredSessionId,
          receiverPublicKey: restoredReceiverPublicKey,
          expiresAt: parseInt(restoredExpiresAt)
        };
        setSessionPayload(restoredPayload);
        setShowCardSelection(true);
      } else if (sessionPayload) {
        // User has a session, show card selection
        setShowCardSelection(true);
      } else {
        // User doesn't have a session yet, stay on scanning screen
        setShowCardSelection(false);
        // Show alert to scan receiver's QR first
        setAlertConfig({
          title: "Scan Receiver's QR",
          message: "Please scan the receiver's QR code first before selecting a card to share.",
          buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
        });
        setAlertVisible(true);
      }
    }
  }, [forceCardSelection, sessionPayload, restoredSessionId, restoredReceiverPublicKey, restoredExpiresAt]);

  const handleCardSelect = useCallback((cardId: string) => {
    setSelectedCardId(cardId);
  }, []);

  const handleRevealCard = useCallback(async (cardId: string) => {
    if (revealedCardId === cardId) {
      // Toggle off - hide the revealed card
      setRevealedCardId(null);
      setRevealedCardData(null);
      return;
    }

    // Toggle on - require biometric authentication first
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

        // Get selected card from masked collection
        const maskedCard = cards.find(c => c.id === selectedCardId);
        if (!maskedCard) {
          throw new Error("Card not found");
        }

        console.log("🔍 Masked card data:", {
          id: maskedCard.id,
          cardNumber: maskedCard.cardNumber,
          cardHolder: maskedCard.cardHolder,
          expiry: maskedCard.expiry,
          bank: maskedCard.bank,
          cardName: maskedCard.cardName,
        });

        // Fetch the full unmasked card data to get sensitive fields like expiry
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

        const card = fullCard;

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
          // Set card expiry based on validity duration (null = infinity)
          cardExpiresAt: cardValidityMinutes === null ? undefined : Math.floor(Date.now() / 1000) + (cardValidityMinutes * 60),
          // Include optional metadata if available
          bank: card.bank || undefined,
          cobrandName: card.cobrandName || undefined,
          cardKind: card.cardKind || undefined,
          dominantColor: card.dominantColor || undefined,
          // Note: isPinned is NOT included - it's a device-specific property
          // Imported cards will always start with isPinned: false on the receiver's device
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
  }, [selectedCardId, sessionPayload, cardValidityMinutes, refreshCards, revealCard, router]);



  // Filter to only show cards that belong to the user (not "other" cards)
  const availableCards = cards.filter((card) => card.cardUser !== "other");


  function getCardBrand(cardNumber: string): "VISA" | "MC" | "AMEX" | "OTHER" {
    const number = cardNumber.replace(/\D/g, '');
    if (number.startsWith('4')) return 'VISA';
    if (number.startsWith('5') || number.startsWith('2')) return 'MC';
    if (number.startsWith('3')) return 'AMEX';
    return 'OTHER';
  }

  // ✅ ALL HOOKS CALLED - NOW SAFE TO HAVE CONDITIONAL RETURNS
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

  // Removed scanning screen - no QR scanning required

  if (showCardSelection) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.surface }]}
      >
        <Hero
          title="Select Card"
          subtitle="Choose which card to share"
          showBackButton={true}
          onBack={() => {
            setShowCardSelection(false);
            setSelectedCardId(null);
          }}
        />
        <View style={styles.container}>
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
                  style={[styles.addCardButton, { backgroundColor: palette.primary }]}
                  onPress={() => {
                    const params = new URLSearchParams({ from: "share" });
                    if (sessionPayload) {
                      params.append("sessionId", sessionPayload.sessionId);
                      params.append("receiverPublicKey", sessionPayload.receiverPublicKey);
                      params.append("expiresAt", sessionPayload.expiresAt.toString());
                    }
                    router.push(`/add-card?${params.toString()}`);
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="add" size={20} color={palette.onPrimary} />
                  <ThemedText style={[styles.addCardButtonText, { color: palette.onPrimary }]}>
                    Add Your First Card
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
                      onPress={() => {
                        setSelectedCardId(card.id);
                      }}
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
            </View>
          )}

          {!isLoading && availableCards.length > 0 && (
            <View style={[styles.buttonContainer, { paddingTop: 0 }]}>
              <TouchableOpacity
                style={[
                  styles.generateButton,
                  {
                    backgroundColor: selectedCardId ? palette.primary : palette.border,
                    height: 56,
                    borderRadius: 16,
                  },
                ]}
                onPress={generateQRCode}
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
          <View style={styles.buttonContainer}>
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
    marginBottom: 24,
  },
  addCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addCardButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
});
