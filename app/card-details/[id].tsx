// app/card-details/[id].tsx
import AppButton from "@/components/AppButton";
import CardNotFound from "@/components/CardNotFound";
import Hero from "@/components/Hero";
import type { PipCardHandle } from "@/components/PipCard";
import PipCard from "@/components/PipCard";
import { ThemedText } from "@/components/themed-text";
import { SECURITY_SETTINGS_KEY } from "@/constants/storage";
import { Colors } from "@/constants/theme";
import { useAlert } from "@/context/AlertContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import { formatCardNumber } from "@/utils/formatCardNumber";
import { authenticateUser } from "@/utils/LockScreen";
import { maskAndFormatCardNumber } from "@/utils/mask";
import {
  getCards as secureGetCards,
  removeCard as secureRemoveCard,
} from "@/utils/secureStorage";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StackActions, useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

const { PipModule } = NativeModules;

export default function CardDetailsScreen() {
  const { showAlert } = useAlert();
  const { id } = useLocalSearchParams<{ id: string }>();
  useScreenProtection();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const [card, setCard] = useState<any>(null);
  const [showNumber, setShowNumber] = useState(false);
  const [canUsePip, setCanUsePip] = useState(false);
  // const [showCVV, setShowCVV] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const cooldownActiveRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pipCardRef = useRef<PipCardHandle | null>(null);
  const [renderPipCard, setRenderPipCard] = useState(false);
  const layoutResolveRef = useRef<null | (() => void)>(null);
  const navigation = useNavigation();

  // reset the pip disability on reopen
  useEffect(() => {
    setCanUsePip(false);
  }, [id]);

  const openPip = useCallback(async () => {
    console.log("🔘 PiP button pressed");
    if (!card) {
      console.log("❌ No card data");
      return;
    }

    try {
      console.log("📸 Mounting PipCard for snapshot...");
      // Mount off-screen and wait for layout
      setRenderPipCard(true);
      await new Promise<void>((resolve) => {
        layoutResolveRef.current = resolve;
      });
      // No time-based delay

      if (!pipCardRef.current) throw new Error("Pip card ref not mounted");
      console.log("📸 Capturing snapshot...");
      const frameUri = await pipCardRef.current.captureSnapshot({
        format: "png",
        quality: 1,
      });
      console.log("✅ Snapshot captured:", frameUri);

      setRenderPipCard(false);

      // Launch PiP with image directly, pass card id for return navigation
      // @ts-ignore - Native module method signature (imageUri, cardId)
      if (PipModule && PipModule.enterPipMode) {
        console.log("🚀 Calling PipModule.enterPipMode...");
        PipModule.enterPipMode(frameUri, id);
      } else {
        console.error("❌ PipModule is not available", NativeModules);
        Toast.show({
          type: "error",
          text1: "PiP Unavailable",
          text2: "Native module not loaded. Please rebuild the app.",
        });
      }

      //Best-effort cleanup of the temp snapshot file after pip starts
      setTimeout(() => {
        FileSystem.deleteAsync(frameUri, { idempotent: true }).catch(() => { })
      }, 1500)
    } catch (err) {
      setRenderPipCard(false);
      console.error("❌ Failed to open PiP:", err);
    }
  }, [card, id]);

  useEffect(() => {
    navigation.setOptions({
      title: "Card Details",
      headerRight: () =>
        card ? (
          <Pressable onPress={openPip} style={{ marginRight: 16 }}>
            <Ionicons
              name="caret-forward-circle-outline"
              size={28}
              color={palette.tint}
            />
          </Pressable>
        ) : null,
    });
  }, [navigation, card, openPip, palette.tint]); // ✅ openPip is stable now

  useEffect(() => {
    const loadCard = async () => {
      try {
        const list = await secureGetCards();
        const found = list.find((c) => c.id === id);
        if (found) setCard(found);
      } catch (err) {
        console.error("Error loading card details", err);
      }
    };

    loadCard();
  }, [id]);

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
              navigation.dispatch(StackActions.popToTop());
            } catch (err) {
              console.error("Error deleting card:", err);
              await showAlert({
                title: "Error",
                message: "Failed to delete the card. Please try again.",
              });
            }
          },
        },
      ],
    });
  };

  const handleDeviceLock = async () => {
    try {
      // Hide case
      if (showNumber) {
        setShowNumber(false);
        // setShowCVV(false);
        setCanUsePip(false);
        return;
      }

      // Load settings
      const saved = await AsyncStorage.getItem(SECURITY_SETTINGS_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      const cardLock = parsed.cardLock ?? true;
      const cooldown = parsed.cooldown ?? 0;

      // Auth disabled
      if (!cardLock) {
        setShowNumber(true);
        // setShowCVV(true);
        setCanUsePip(true);
        return;
      }

      // Cooldown still active
      if (cooldownActiveRef.current) {
        setShowNumber(true);
        // setShowCVV(true);
        setCanUsePip(true);
        return;
      }

      // Authentication required
      const ok = await authenticateUser("card");

      if (ok) {
        setShowNumber(true);
        // setShowCVV(true);
        setCanUsePip(true);

        if (cooldown > 0) {
          cooldownActiveRef.current = true;
          setCooldownActive(true);

          // Clear previous timer
          if (cooldownTimerRef.current) {
            clearTimeout(cooldownTimerRef.current);
          }

          cooldownTimerRef.current = setTimeout(() => {
            cooldownActiveRef.current = false;
            setCooldownActive(false);
            cooldownTimerRef.current = null;
          }, cooldown * 1000);
        }
      } else {
        console.log("❌ Auth canceled or failed");
      }
    } catch (err) {
      console.error("💥 Error in handleDeviceLock:", err);
    }
  };

  const handleCopy = async () => {
    if (!card?.cardNumber) return;
    try {
      await Clipboard.setStringAsync(card.cardNumber);
      Toast.show({
        type: "success",
        text1: "Copied to clipboard",
        text2: "Card number copied successfully",
        visibilityTime: 1500,
      });
    } catch (err) {
      console.error("Copy failed:", err);
      Toast.show({
        type: "error",
        text1: "Failed to copy",
        text2: "Something went wrong. Try again.",
      });
    }
  };

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
      setCooldownActive(false);
    };
  }, []);

  if (!card) {
    return <CardNotFound />;
  }

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <Hero
        title="Card Details"
        subtitle="View and manage this card"
        showBackButton={true}
        onBack={() => navigation.dispatch(StackActions.popToTop())}
      />
      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Card Front */}
          <View
            style={[styles.cardFront, { backgroundColor: palette.primary }]}
          >
            <ThemedText style={styles.bankName}>{card.bank}</ThemedText>
            <Pressable
              onPress={canUsePip ? openPip : undefined}
              disabled={!canUsePip}
              style={[
                styles.pipIconButton,
                !canUsePip && { opacity: 0.4 }, // visually dim when disabled
              ]}
              hitSlop={10}
            >
              <Ionicons
                name="contract-outline"
                size={22}
                color={canUsePip ? "#FFF" : "rgba(255,255,255,0.5)"}
              />
            </Pressable>

            {/* Card Number with Eye Icon */}
            <View style={styles.cardNumberRow}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <ThemedText
                  style={[styles.cardNumber, { color: palette.onPrimary }]}
                >
                  {showNumber
                    ? formatCardNumber(card.cardNumber)
                    : maskAndFormatCardNumber(card.cardNumber)}
                </ThemedText>

                <Pressable
                  onPress={showNumber ? handleCopy : undefined}
                  hitSlop={10}
                  disabled={!showNumber}
                  style={{ marginLeft: 8, opacity: showNumber ? 1 : 0.4 }}
                >
                  <Ionicons name="copy-outline" size={20} color="#fff" />
                </Pressable>
              </View>

              <Pressable onPress={handleDeviceLock} hitSlop={10}>
                <Ionicons
                  name={!showNumber ? "eye-off" : "eye"}
                  size={22}
                  color="#fff"
                  style={{ marginLeft: 12 }}
                />
              </Pressable>
            </View>

            <View style={styles.cardInfoRow}>
              <View>
                <ThemedText style={styles.label}>Card Holder</ThemedText>
                <ThemedText style={styles.info}>{card.cardHolder}</ThemedText>
              </View>
              <View>
                <ThemedText style={styles.label}>Expiry</ThemedText>
                <ThemedText style={styles.info}>
                  {showNumber ? card.expiry : "xx/xx"}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={styles.cardType}>{card.type}</ThemedText>
          </View>

          {/* Card Back */}
          <View style={[styles.cardBack, { backgroundColor: palette.card }]}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <ThemedText style={{ fontSize: 13 }}>CVV / CVC</ThemedText>
              <ThemedText
                style={[
                  styles.info,
                  {
                    fontSize: 16,
                    letterSpacing: 2,
                    color: scheme === "dark" ? "#fff" : "#111",
                  },
                ]}
              >
                {showNumber ? "xxx" : card.cvv}
              </ThemedText>
            </View>
          </View>

          <ThemedText style={styles.note}>Card ID: {id}</ThemedText>
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={styles.footer}>
          <AppButton
            title="Delete Card"
            variant="danger"
            onPress={handleDelete}
          />
          <View style={{ height: 10 }} />
          <AppButton
            title="Back to Home"
            variant="secondary"
            onPress={() => navigation.dispatch(StackActions.popToTop())}
          />
        </View>
      </View>

      {/* Hidden offscreen PipCard for capture */}
      {renderPipCard && (
        <View
          collapsable={false}
          pointerEvents="none"
          renderToHardwareTextureAndroid
          needsOffscreenAlphaCompositing
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            opacity: 0.01,
            width: 320,
            height: 200,
            backgroundColor: "#fff",
          }}
          onLayout={() => {
            if (layoutResolveRef.current) {
              layoutResolveRef.current();
              layoutResolveRef.current = null;
            }
          }}
        >
          <PipCard ref={pipCardRef} card={card} showNumber={showNumber} />
        </View>
      )}

      {/* Removed image preview */}

      {/* Video preview removed; PiP uses image directly */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f2f2f2" },
  contentContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },
  cardFront: {
    backgroundColor: "#4b7bec",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  bankName: {
    fontSize: 16,
    marginBottom: 20,
    fontWeight: "600",
    color: "white",
  },
  cardInfoRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: "white", fontSize: 12 },
  info: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: -1,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
    }),
  },
  cardType: { color: "white", fontSize: 14, textAlign: "right", marginTop: 10 },

  cardBack: {
    backgroundColor: "#333",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  note: { fontSize: 12, textAlign: "center", marginTop: 12 },
  error: { fontSize: 18, textAlign: "center", marginTop: 20, color: "red" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  cardNumberRow: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardNumber: {
    fontSize: 22,
    letterSpacing: -2,
    lineHeight: 26,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
    }),
  },
  pipIconButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255, 0.2",
    borderRadius: 16,
    padding: 8,
  },
});
