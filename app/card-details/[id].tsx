// app/card-details/[id].tsx
import CardNotFound from "@/components/CardNotFound";
import Hero from "@/components/Hero";
import type { PipCardHandle } from "@/components/PipCard";
import PipCard from "@/components/PipCard";
import { ThemedText } from "@/components/themed-text";
import { CARD_TYPES } from "@/constants/cardTypes";
import { SECURITY_SETTINGS_KEY } from "@/constants/storage";
import { Colors } from "@/constants/theme";
import { useAlert } from "@/context/AlertContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import { getCardType } from "@/utils/CardType";
import { authenticateUser } from "@/utils/LockScreen";
import { formatCardNumber } from "@/utils/formatCardNumber";
import { maskAndFormatCardNumber } from "@/utils/mask";
import {
  getCards as secureGetCards,
  removeCard as secureRemoveCard,
} from "@/utils/secureStorage";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

// Expo Router header configuration - PiP button only
export const unstable_settings = {
  headerRight: () => (
    <Pressable style={{ marginRight: 16 }}>
      <Ionicons name="caret-forward-circle-outline" size={28} color="#0a7ea4" />
    </Pressable>
  ),
};

const { PipModule } = NativeModules;

const getContrastColor = (hexcolor: string) => {
  if (!hexcolor || hexcolor.length < 7) return "#FFFFFF";
  try {
    const r = parseInt(hexcolor.substring(1, 3), 16);
    const g = parseInt(hexcolor.substring(3, 5), 16);
    const b = parseInt(hexcolor.substring(5, 7), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#1a1a1a" : "#FFFFFF";
  } catch {
    return "#FFFFFF";
  }
};

export default function CardDetailsScreen() {
  const { showAlert } = useAlert();
  const { id } = useLocalSearchParams<{ id: string }>();
  useScreenProtection();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const [card, setCard] = useState<any>(null);
  const [showNumber, setShowNumber] = useState(false);
  const [canUsePip, setCanUsePip] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const cooldownActiveRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pipCardRef = useRef<PipCardHandle | null>(null);
  const [renderPipCard, setRenderPipCard] = useState(false);
  const layoutResolveRef = useRef<null | (() => void)>(null);
  const navigation = useNavigation();
  const router = useRouter();

  const flipRotation = useSharedValue(0);
  const isFlipped = useSharedValue(false);

  useEffect(() => {
    setCanUsePip(false);
    flipRotation.value = 0;
    isFlipped.value = false;
    setFlipped(false);
  }, [id]);

  const toggleFlip = () => {
    const nextFlipped = !isFlipped.value;
    isFlipped.value = nextFlipped;
    setFlipped(nextFlipped);
    flipRotation.value = withSpring(nextFlipped ? 180 : 0, {
      damping: 15,
      stiffness: 90,
    });
  };

  const openPip = useCallback(async () => {
    if (!card) return;
    try {
      setRenderPipCard(true);
      await new Promise<void>((resolve) => {
        layoutResolveRef.current = resolve;
      });
      if (!pipCardRef.current) throw new Error("Pip card ref not mounted");
      const frameUri = await pipCardRef.current.captureSnapshot({
        format: "png",
        quality: 1,
      });
      setRenderPipCard(false);
      if (PipModule && PipModule.enterPipMode) {
        PipModule.enterPipMode(frameUri, id);
      } else {
        Toast.show({
          type: "error",
          text1: "PiP Unavailable",
          text2: "Native module not loaded.",
        });
      }
      setTimeout(() => {
        FileSystem.deleteAsync(frameUri, { idempotent: true }).catch(() => { })
      }, 1500)
    } catch (err) {
      setRenderPipCard(false);
      console.error("PiP Error:", err);
    }
  }, [card, id]);

  const handleEdit = useCallback(() => {
    router.push({
      pathname: "/add-card",
      params: {
        editId: id,
        defaultCardNumber: card.cardNumber,
        defaultCardHolder: card.cardHolder,
        defaultExpiry: card.expiry,
        defaultCvv: card.cvv,
        defaultBank: card.bank,
        defaultCardType: card.cardType,
        defaultCardKind: card.cardKind,
        defaultCobrandName: card.cobrandName,
        defaultCardUser: card.cardUser,
        defaultDominantColor: card.dominantColor,
        fromEdit: "true",
      },
    });
  }, [router, id, card]);

  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        title: "Card Details",
      });
    }, [navigation])
  );

  const loadCard = React.useCallback(async () => {
    try {
      const list = await secureGetCards();
      const found = list.find((c) => c.id === id);
      if (found) setCard(found);
    } catch (err) { console.error(err); }
  }, [id]);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  // Reload card data when screen comes into focus (e.g., after editing)
  useFocusEffect(
    React.useCallback(() => {
      loadCard();
    }, [loadCard])
  );

  const handleDelete = async () => {
    await showAlert({
      title: "Delete Card",
      message: "Are you sure you want to delete this card?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await secureRemoveCard(id);
              router.back();
            } catch (err) { console.error(err); }
          },
        },
      ],
    });
  };

  const handleDeviceLock = async () => {
    if (showNumber) {
      setShowNumber(false);
      setCanUsePip(false);
      return;
    }
    const saved = await AsyncStorage.getItem(SECURITY_SETTINGS_KEY);
    const parsed = saved ? JSON.parse(saved) : {};
    const cardLock = parsed.cardLock ?? true;
    const cooldown = parsed.cooldown ?? 0;
    if (!cardLock || cooldownActiveRef.current) {
      setShowNumber(true);
      setCanUsePip(true);
      return;
    }
    const ok = await authenticateUser("card");
    if (ok) {
      setShowNumber(true);
      setCanUsePip(true);
      if (cooldown > 0) {
        cooldownActiveRef.current = true;
        setCooldownActive(true);
        if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = setTimeout(() => {
          cooldownActiveRef.current = false;
          setCooldownActive(false);
          cooldownTimerRef.current = null;
        }, cooldown * 1000);
      }
    }
  };

  const handleCopy = async () => {
    if (!card?.cardNumber) return;
    try {
      await Clipboard.setStringAsync(card.cardNumber);
      Toast.show({ type: "success", text1: "Copied!", visibilityTime: 1500 });
    } catch (err) { console.error(err); }
  };

  const handleShare = useCallback(() => {
    router.push({
      pathname: "/share-card/share",
      params: { cardId: id },
    });
  }, [router, id]);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, []);

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(flipRotation.value, [0, 180], [0, 180]);
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateValue}deg` as any }
      ],
      opacity: rotateValue > 90 ? 0 : 1,
      backfaceVisibility: "hidden" as any,
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    const rotateValue = interpolate(flipRotation.value, [0, 180], [180, 360]);
    return {
      transform: [
        { perspective: 1200 },
        { rotateY: `${rotateValue}deg` as any }
      ],
      opacity: (rotateValue > 90 && rotateValue < 270) ? 0 : 1,
      backfaceVisibility: "hidden" as any,
      position: "absolute" as any,
      top: 0, left: 0, right: 0,
    };
  });

  if (!card) return <CardNotFound />;

  const cardColor = card.dominantColor || palette.primary;
  const contentColor = getContrastColor(cardColor);
  const isDarkCard = contentColor === "#FFFFFF";


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.surface }]}>
      <Hero title="Card Details" subtitle="Secure View" showBackButton onBack={() => router.back()} />
      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.cardContainerWrapper}>
            <Pressable onPress={toggleFlip}>
              <Animated.View style={[styles.cardFront, frontAnimatedStyle, { backgroundColor: cardColor }]}>
                <View style={styles.cardHeader}>
                  <ThemedText style={[styles.bankName, { color: contentColor, textShadowColor: isDarkCard ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]}>
                    {card.bank}
                  </ThemedText>
                  <View style={styles.cardTypeIcon}>
                    {(() => {
                      const detectedCardType = getCardType(card.cardNumber);
                      if (detectedCardType === CARD_TYPES.VISA) {
                        return <FontAwesome name="cc-visa" size={24} color={contentColor} />;
                      }
                      if (detectedCardType === CARD_TYPES.MASTERCARD) {
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#EB001B', marginRight: -4, opacity: 0.9 }} />
                            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#F79E1B', opacity: 0.9 }} />
                          </View>
                        );
                      }
                      if (detectedCardType === CARD_TYPES.AMEX) {
                        return <FontAwesome name="cc-amex" size={24} color={contentColor} />;
                      }
                      if (detectedCardType === CARD_TYPES.DISCOVER) {
                        return <FontAwesome name="cc-discover" size={24} color={contentColor} />;
                      }
                      if (detectedCardType === CARD_TYPES.RUPAY) {
                        return (
                          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            <ThemedText style={[styles.cardTypeLabel, { color: contentColor, fontSize: 10, fontWeight: 'bold', opacity: 0.8 }]}>
                              RuPay
                            </ThemedText>
                          </View>
                        );
                      }
                      if (detectedCardType === CARD_TYPES.MAESTRO) {
                        return <FontAwesome name="cc-mastercard" size={24} color={contentColor} />;
                      }
                      if (detectedCardType === CARD_TYPES.JCB) {
                        return <FontAwesome name="cc-jcb" size={24} color={contentColor} />;
                      }
                      if (detectedCardType === CARD_TYPES.DINERS) {
                        return <FontAwesome name="cc-diners-club" size={24} color={contentColor} />;
                      }
                      return detectedCardType ? (
                        <ThemedText style={[styles.cardTypeLabel, { color: contentColor, opacity: 0.7, fontSize: 10, fontWeight: 'bold' }]}>
                          {(detectedCardType as string).toUpperCase()}
                        </ThemedText>
                      ) : null;
                    })()}
                  </View>
                </View>
                <View style={styles.cardNumberRow}>
                  <ThemedText numberOfLines={1} adjustsFontSizeToFit style={[styles.cardNumber, { color: contentColor }]}>
                    {showNumber ? formatCardNumber(card.cardNumber) : maskAndFormatCardNumber(card.cardNumber)}
                  </ThemedText>
                </View>
                <View style={styles.cardInfoRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.label, { color: isDarkCard ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }]}>Card Holder</ThemedText>
                    <ThemedText numberOfLines={1} style={[styles.info, { color: contentColor }]}>{card.cardHolder}</ThemedText>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                    <ThemedText style={[styles.label, { color: isDarkCard ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }]}>Expiry</ThemedText>
                    <ThemedText style={[styles.info, { color: contentColor }]}>{showNumber ? card.expiry : "•• / ••"}</ThemedText>
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={[styles.cardBack, backAnimatedStyle, { backgroundColor: card.dominantColor || "#333" }]}>
                <View style={styles.magneticStripe} />
                <View style={styles.signatureRow}>
                  <View style={styles.signatureArea} />
                  <View style={styles.cvvArea}>
                    <ThemedText style={styles.cvvLabel}>CVV</ThemedText>
                    <ThemedText style={styles.cvvText}>{showNumber ? card.cvv : "•••"}</ThemedText>
                  </View>
                </View>
                <View style={styles.backInfo}>
                  <ThemedText style={styles.backInfoText}>Authorized Signature • Not Valid Unless Signed</ThemedText>
                </View>
              </Animated.View>
            </Pressable>
            <ThemedText style={styles.flipHint}><Ionicons name="refresh-outline" size={14} color={palette.text} /> Tap card to flip</ThemedText>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.actionButton} onPress={handleDeviceLock}>
              <View style={[styles.actionIconWrapper, { backgroundColor: palette.primary }]}>
                <Ionicons name={!showNumber ? "eye-off-outline" : "eye-outline"} size={24} color="white" />
              </View>
              <ThemedText style={styles.actionLabel}>{showNumber ? "Hide" : "Reveal"}</ThemedText>
            </Pressable>
            <Pressable style={[styles.actionButton, (!showNumber || flipped) && { opacity: 0.5 }]} onPress={handleCopy} disabled={!showNumber || flipped}>
              <View style={[styles.actionIconWrapper, { backgroundColor: palette.primary }]}>
                <Ionicons name="copy-outline" size={24} color="white" />
              </View>
              <ThemedText style={styles.actionLabel}>Copy</ThemedText>
            </Pressable>
            <Pressable style={[styles.actionButton, (!showNumber || flipped || !canUsePip) && { opacity: 0.5 }]} onPress={openPip} disabled={!showNumber || flipped || !canUsePip}>
              <View style={[styles.actionIconWrapper, { backgroundColor: palette.primary }]}>
                <Ionicons name="contract" size={24} color="white" />
              </View>
              <ThemedText style={styles.actionLabel}>PiP</ThemedText>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={handleShare}>
              <View style={[styles.actionIconWrapper, { backgroundColor: palette.tint }]}>
                <Ionicons name="share-social-outline" size={24} color="white" />
              </View>
              <ThemedText style={styles.actionLabel}>Share</ThemedText>
            </Pressable>
            <Pressable style={[styles.actionButton, (!showNumber || flipped) && { opacity: 0.5 }]} onPress={handleEdit} disabled={!showNumber || flipped}>
              <View style={[styles.actionIconWrapper, { backgroundColor: palette.secondary }]}>
                <Ionicons name="pencil-outline" size={24} color="white" />
              </View>
              <ThemedText style={styles.actionLabel}>Edit</ThemedText>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={handleDelete}>
              <View style={[styles.actionIconWrapper, { backgroundColor: palette.danger }]}>
                <Ionicons name="trash-outline" size={24} color="white" />
              </View>
              <ThemedText style={[styles.actionLabel, { color: palette.danger }]}>Delete</ThemedText>
            </Pressable>
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
              <Ionicons name="information-circle-outline" size={20} color={palette.text} />
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Card Details</ThemedText>
            </View>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <View style={[styles.summaryIcon, { backgroundColor: palette.primary + '15' }]}>
                  <Ionicons name="business-outline" size={18} color={palette.primary} />
                </View>
                <View style={styles.summaryContent}>
                  <ThemedText style={styles.summaryLabel}>Bank</ThemedText>
                  <ThemedText style={styles.summaryValue}>{card.bank || "N/A"}</ThemedText>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <View style={[styles.summaryIcon, { backgroundColor: palette.secondary + '15' }]}>
                  <Ionicons name={card.cardUser === "other" ? "people-outline" : "person-outline"} size={18} color={palette.secondary} />
                </View>
                <View style={styles.summaryContent}>
                  <ThemedText style={styles.summaryLabel}>Owner</ThemedText>
                  <ThemedText style={[styles.summaryValue, { textTransform: 'capitalize' }]}>{card.cardUser || "Self"}</ThemedText>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <View style={[styles.summaryIcon, { backgroundColor: palette.tint + '15' }]}>
                  <Ionicons name={card.cardKind === "debit" ? "card-outline" : "card"} size={18} color={palette.tint} />
                </View>
                <View style={styles.summaryContent}>
                  <ThemedText style={styles.summaryLabel}>Card Type</ThemedText>
                  <ThemedText style={[styles.summaryValue, { textTransform: 'uppercase' }]}>{card.cardKind || "Credit"}</ThemedText>
                </View>
              </View>

              {card.cobrandName && (
                <View style={styles.summaryCard}>
                  <View style={[styles.summaryIcon, { backgroundColor: palette.danger + '15' }]}>
                    <Ionicons name="pricetag-outline" size={18} color={palette.danger} />
                  </View>
                  <View style={styles.summaryContent}>
                    <ThemedText style={styles.summaryLabel}>Co-brand</ThemedText>
                    <ThemedText style={styles.summaryValue}>{card.cobrandName}</ThemedText>
                  </View>
                </View>
              )}
            </View>

            <View style={styles.cardInsights}>
              <View style={styles.insightRow}>
                <View style={styles.insightItem}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={palette.text} />
                  <ThemedText style={styles.insightText}>Secure Storage</ThemedText>
                </View>
                <View style={styles.insightItem}>
                  <Ionicons name="eye-off-outline" size={16} color={palette.text} />
                  <ThemedText style={styles.insightText}>Hidden by Default</ThemedText>
                </View>
              </View>
              <View style={styles.insightRow}>
                <View style={styles.insightItem}>
                  <Ionicons name="lock-closed-outline" size={16} color={palette.text} />
                  <ThemedText style={styles.insightText}>Biometric Protected</ThemedText>
                </View>
                <View style={styles.insightItem}>
                  <Ionicons name="time-outline" size={16} color={palette.text} />
                  <ThemedText style={styles.insightText}>Auto Cleanup</ThemedText>
                </View>
              </View>
            </View>
          </View>
          <ThemedText style={styles.note}>Unique ID: {id}</ThemedText>
        </ScrollView>
      </View>
      {renderPipCard && (
        <View collapsable={false} pointerEvents="none" renderToHardwareTextureAndroid needsOffscreenAlphaCompositing style={{ position: "absolute", top: 0, left: 0, opacity: 0.01, width: 320, height: 200, backgroundColor: "#fff" }} onLayout={() => { if (layoutResolveRef.current) { layoutResolveRef.current(); layoutResolveRef.current = null; } }}>
          <PipCard ref={pipCardRef} card={card} showNumber={showNumber} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  contentContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  cardContainerWrapper: { marginBottom: 32, alignItems: "center" },
  cardFront: {
    width: 330, height: 200, borderRadius: 16, padding: 24,
    justifyContent: "space-between", overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 10 }, shadowRadius: 15, elevation: 10,
  },
  cardBack: {
    width: 330, height: 200, borderRadius: 16, paddingVertical: 20,
    shadowColor: "#000", shadowOpacity: 0.3, shadowOffset: { width: 0, height: 10 }, shadowRadius: 15, elevation: 10,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  cardTypeIcon: { alignItems: "center", justifyContent: "center" },
  bankName: { fontSize: 18, fontWeight: "bold", letterSpacing: 0.5 },
  cardNumberRow: { marginBottom: 20 },
  cardNumber: {
    fontSize: 22, letterSpacing: 1.5, fontWeight: "700",
    fontFamily: Platform.select({ ios: "Courier-Bold", android: "monospace" }),
    textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0.5, height: 0.5 }, textShadowRadius: 1,
  },
  cardInfoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  label: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2, fontWeight: "600" },
  info: { fontSize: 15, fontWeight: "bold", letterSpacing: 0.5 },
  cardTypeLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "900", fontStyle: "italic" },
  // providerLogoContainer: { position: "absolute", bottom: 15, right: 20, opacity: 0.9 },
  magneticStripe: { backgroundColor: "#1a1a1a", height: 40, width: "100%", marginTop: 10, marginBottom: 20 },
  signatureRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20 },
  signatureArea: { backgroundColor: "rgba(255,255,255,0.8)", height: 35, flex: 1, marginRight: 10 },
  cvvArea: { backgroundColor: "white", height: 30, paddingHorizontal: 10, justifyContent: "center", borderRadius: 4 },
  cvvLabel: { fontSize: 8, color: "#666", fontWeight: "bold", marginBottom: -4 },
  cvvText: { fontSize: 14, fontWeight: "bold", fontFamily: Platform.select({ ios: "Courier", android: "monospace" }), color: "#000", lineHeight: 16 },
  backInfo: { marginTop: 20, paddingHorizontal: 20 },
  backInfoText: { color: "rgba(255,255,255,0.5)", fontSize: 8, textAlign: "center", letterSpacing: 0.5 },
  flipHint: { marginTop: 12, fontSize: 12, opacity: 0.5, textAlign: "center" },
  actionRow: { flexDirection: "row", justifyContent: "space-evenly", alignItems: "center", paddingHorizontal: 20, marginBottom: 32 },
  actionButton: { alignItems: "center", width: 60, paddingVertical: 8 },
  actionIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    opacity: 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionLabel: { fontSize: 12, fontWeight: "600", textAlign: "center", minWidth: 60 },
  summaryContainer: { marginHorizontal: 16, padding: 20, backgroundColor: "rgba(0,0,0,0.03)", borderRadius: 16, marginBottom: 24 },
  summaryHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginLeft: 8 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 12,
    width: "48%",
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  summaryContent: { flex: 1 },
  summaryLabel: { fontSize: 10, opacity: 0.6, marginBottom: 2, textTransform: "uppercase", fontWeight: "500" },
  summaryValue: { fontSize: 14, fontWeight: "600" },
  cardInsights: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.1)" },
  insightRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  insightItem: { flexDirection: "row", alignItems: "center", flex: 0.48 },
  insightText: { fontSize: 11, opacity: 0.7, marginLeft: 6 },
  note: { fontSize: 10, textAlign: "center", marginTop: 32, opacity: 0.3 },
  pipIconButton: { backgroundColor: "rgba(255,255,255, 0.2)", borderRadius: 20, padding: 6 },
});
