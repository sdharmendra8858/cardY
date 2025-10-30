// app/card-details/[id].tsx
import AppButton from "@/components/AppButton";
import CardNotFound from "@/components/CardNotFound";
import Hero from "@/components/Hero";
import type { PipCardHandle } from "@/components/PipCard";
import PipCard from "@/components/PipCard";
import { useAlert } from "@/context/AlertContext";
import { maskAndFormatCardNumber } from "@/utils/mask";
import {
  getCards as secureGetCards,
  removeCard as secureRemoveCard,
} from "@/utils/secureStorage";
import { Ionicons } from "@expo/vector-icons";
import { StackActions, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { PipModule, LockModule } = NativeModules;

export default function CardDetailsScreen() {
  const { showAlert } = useAlert();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<any>(null);
  const [showNumber, setShowNumber] = useState(false);
  const [canUsePip, setCanUsePip] = useState(false);
  const [showCVV, setShowCVV] = useState(false);
  const pipCardRef = useRef<PipCardHandle | null>(null);
  const [renderPipCard, setRenderPipCard] = useState(false);
  const layoutResolveRef = useRef<null | (() => void)>(null);
  const navigation = useNavigation();

  // reset the pip disability on reopen
  useEffect(() => {
    setCanUsePip(false);
  }, [id]);

  const openPip = useCallback(async () => {
    if (!card) return;

    try {
      // Mount off-screen and wait for layout
      setRenderPipCard(true);
      await new Promise<void>((resolve) => {
        layoutResolveRef.current = resolve;
      });
      // No time-based delay

      if (!pipCardRef.current) throw new Error("Pip card ref not mounted");
      const frameUri = await pipCardRef.current.captureSnapshot({
        format: "png",
        quality: 1,
      });

      setRenderPipCard(false);

      console.log("✅ Captured image:", frameUri);
      // Launch PiP with image directly, pass card id for return navigation
      // @ts-ignore - Native module method signature (imageUri, cardId)
      PipModule.enterPipMode(frameUri, id);
    } catch (err) {
      setRenderPipCard(false);
      console.error("❌ Failed:", err);
    }
  }, [card]);

  useEffect(() => {
    navigation.setOptions({
      title: "Card Details",
      headerRight: () =>
        card ? (
          <Pressable onPress={openPip} style={{ marginRight: 16 }}>
            <Ionicons
              name="caret-forward-circle-outline"
              size={28}
              color="#4b7bec"
            />
          </Pressable>
        ) : null,
    });
  }, [navigation, card, openPip]); // ✅ openPip is stable now

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

  const handleDeviceLock =  async () => {
    try {
      // if trying to hide number, no need for auth
      if (showNumber) {
        setShowNumber(false);
        setCanUsePip(false);
        setShowCVV(false);
        return;
      }

      // 🔐 Trigger device lock (Android)
      const success =
        Platform.OS === "android" && LockModule
          ? await LockModule.authenticateUser()
          : true; // skip lock on iOS for now

      if (success) {
        // Unlock succeeded → show number + enable PiP
        setShowCVV(true); // 👈 show CVV as well
        setShowNumber(true);
        setCanUsePip(true);
      } else {
        console.log("❌ Authentication canceled");
      }
    } catch (err) {
      console.error("Error during authentication:", err);
    }
  }

  if (!card) {
    return <CardNotFound />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Hero
        title="Card Details"
        subtitle="View and manage this card"
        tone="dark"
        surfaceColor="#F2F2F2"
      />
      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Card Front */}
          <View style={styles.cardFront}>
            <Text style={styles.bankName}>{card.bank}</Text>
            <Pressable
              onPress={canUsePip ? openPip : undefined}
              disabled={!canUsePip}
              style={[
                styles.pipIconButton,
                !canUsePip && { opacity: 0.4 }, // visually dim when disabled
              ]}
              hitSlop={10}
            >
              <Ionicons name="contract-outline" size={22} color={canUsePip ? "#FFF" : "rgba(255,255,255,0.5)"} />
            </Pressable>

            {/* Card Number with Eye Icon */}
            <View style={styles.cardNumberRow}>
              <Text style={styles.cardNumber}>
                {showNumber
                  ? card.cardNumber
                  : maskAndFormatCardNumber(card.cardNumber)}
              </Text>
              <Pressable
                onPress={handleDeviceLock}
                hitSlop={10}
              >
                <Ionicons
                  name={!showNumber ? "eye-off" : "eye"}
                  size={22}
                  color="#fff"
                  style={{ marginTop: 2 }}
                />
              </Pressable>
            </View>

            <View style={styles.cardInfoRow}>
              <View>
                <Text style={styles.label}>Card Holder</Text>
                <Text style={styles.info}>{card.cardHolder}</Text>
              </View>
              <View>
                <Text style={styles.label}>Expiry</Text>
                <Text style={styles.info}>{card.expiry}</Text>
              </View>
            </View>

            <Text style={styles.cardType}>{card.type}</Text>
          </View>

          {/* Card Back */}
          <View style={styles.cardBack}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={[styles.label, { fontSize: 13 }]}>CVV / CVC</Text>
              <Text
                style={[
                  styles.info,
                  { fontSize: 16, letterSpacing: 2, color: "#fff" },
                ]}
              >
                {showCVV ? card.cvv : "•••"}
              </Text>
            </View>
          </View>

          <Text style={styles.note}>Card ID: {id}</Text>
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
    color: "white",
    fontSize: 16,
    marginBottom: 20,
    fontWeight: "600",
  },
  cardInfoRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: "white", fontSize: 12 },
  info: { color: "white", fontSize: 16, fontWeight: "bold" },
  cardType: { color: "white", fontSize: 14, textAlign: "right", marginTop: 10 },

  cardBack: {
    backgroundColor: "#333",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  note: { fontSize: 12, color: "#666", textAlign: "center", marginTop: 12 },
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
    color: "white",
    fontSize: 22,
    letterSpacing: 2,
    lineHeight: 26,
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
