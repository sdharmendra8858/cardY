import { showInterstitialAd } from "@/components/AdInterstitial";
import CardNetworkLogo from "@/components/CardNetworkLogo";
import CardNotFound from "@/components/CardNotFound";
import AppButton from "@/components/AppButton";
import DecryptLoader from "@/components/DecryptLoader";
import ExpiryTimerSection from "@/components/ExpiryTimerSection";
import Hero from "@/components/Hero";
import UnifiedModal, { UnifiedModalButton } from "@/components/UnifiedModal";
import { ThemedText } from "@/components/themed-text";
import { CARD_TYPES } from "@/constants/cardTypes";
import { SECURITY_SETTINGS_KEY } from "@/constants/storage";
import { Colors } from "@/constants/theme";
import { useAlert } from "@/context/AlertContext";
import { useTimer } from "@/context/CardContext";
import { useCardsWithMigration as useCards } from "@/context/CardContextWithMigration";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCountdown } from "@/hooks/use-countdown";
import { useQuota } from "@/hooks/useQuota";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import { authenticateUser } from "@/utils/LockScreen";
import { formatCardNumber } from "@/utils/formatCardNumber";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
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
  const { cards, revealCard, removeCard } = useCards();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { timerTick } = useTimer(); // Force re-renders for validity timer
  const { isQuotaExceeded, incrementViews, loading: quotaLoading, viewsCount } = useQuota('card');
  useScreenProtection();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const [card, setCard] = useState<any>(null);
  const [isLoadingCard, setIsLoadingCard] = useState(true);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [canUsePip, setCanUsePip] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const cooldownActiveRef = useRef(false);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleCardRef = useRef<any>(null);
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigation = useNavigation();
  const router = useRouter();
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [isAdWatched, setIsAdWatched] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    buttons?: UnifiedModalButton[];
    dismissible?: boolean;
    type?: "default" | "error" | "warning" | "success";
  }>({ title: "", message: "", buttons: [] });
  const expiryModalShownRef = useRef(false);
  const isMountedRef = useRef(true);
  const viewProcessedRef = useRef(false);

  useEffect(() => {
    viewProcessedRef.current = false;
  }, [id]);

  const flipRotation = useSharedValue(0);
  const isFlipped = useSharedValue(false);
  const revealButtonShake = useSharedValue(0);

  useEffect(() => {
    setFlipped(false);
    setIsAdWatched(false);
    expiryModalShownRef.current = false; // Reset the ref when card changes
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
    if (__DEV__) console.log('🎬 [PiP] Button clicked - showNumber:', showNumber, 'flipped:', flipped, 'cardId:', id);

    if (!showNumber) {
      if (__DEV__) console.log('⚠️ [PiP] Card not revealed, triggering shake animation');
      // Trigger shake animation on reveal button
      revealButtonShake.value = withSpring(1, { damping: 8, stiffness: 100 });
      setTimeout(() => {
        revealButtonShake.value = withSpring(0, { damping: 8, stiffness: 100 });
      }, 300);
      return;
    }

    if (!card) {
      console.error('❌ [PiP] Card data not available');
      return;
    }

    if (flipped) {
      if (__DEV__) console.log('⚠️ [PiP] Card is flipped, cannot capture');
      return;
    }

    try {
      if (__DEV__) console.log('📸 [PiP] Starting capture process...');

      // Validate ref
      if (!visibleCardRef.current) {
        console.error('❌ [PiP] Visible card ref not available');
        Toast.show({
          type: "error",
          text1: "PiP Error",
          text2: "Card component not ready.",
        });
        return;
      }
      if (__DEV__) console.log('✅ [PiP] Visible card ref is available');

      // Import and capture
      console.log('📦 [PiP] Importing react-native-view-shot...');
      const { captureRef } = await import("react-native-view-shot");
      if (__DEV__) console.log('✅ [PiP] react-native-view-shot imported successfully');

      console.log('📸 [PiP] Capturing card image from visible component...');
      const frameUri = await captureRef(visibleCardRef.current as any, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      console.log('✅ [PiP] Image captured successfully - URI:', frameUri);

      // Pass to native module
      if (PipModule && PipModule.enterPipMode) {
        console.log('📱 [PiP] Calling native module - enterPipMode with URI:', frameUri, 'cardId:', id);
        PipModule.enterPipMode(frameUri, id);
        if (__DEV__) console.log('✅ [PiP] Native module called successfully');
      } else {
        console.error('❌ [PiP] Native PipModule not available');
        Toast.show({
          type: "error",
          text1: "PiP Unavailable",
          text2: "Native module not loaded.",
        });
        return;
      }

      // Schedule file cleanup
      if (cleanupTimeoutRef.current) {
        if (__DEV__) console.log('🧹 [PiP] Clearing previous cleanup timeout');
        clearTimeout(cleanupTimeoutRef.current);
      }

      console.log('⏱️ [PiP] Scheduling file cleanup in 1.5 seconds - URI:', frameUri);
      cleanupTimeoutRef.current = setTimeout(() => {
        console.log('🧹 [PiP] Executing file cleanup - URI:', frameUri);
        FileSystem.deleteAsync(frameUri, { idempotent: true })
          .then(() => {
            console.log('✅ [PiP] File deleted successfully - URI:', frameUri);
          })
          .catch((err) => {
            console.log('ℹ️ [PiP] File deletion error (ignored) - URI:', frameUri, 'Error:', err);
          });
      }, 1500);

      console.log('✅ [PiP] PiP capture flow completed successfully');
    } catch (err) {
      if (__DEV__) {
        console.error('❌ [PiP] Error during capture:', err);
        console.error('❌ [PiP] Error details:', {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
    }
  }, [card, id, showNumber, flipped, revealButtonShake]);

  const handleEdit = useCallback(() => {
    console.log('Edit button clicked, showNumber:', showNumber);
    if (!showNumber) {
      console.log('Card not revealed, triggering shake animation');
      // Trigger shake animation on reveal button
      revealButtonShake.value = withSpring(1, { damping: 8, stiffness: 100 });
      setTimeout(() => {
        revealButtonShake.value = withSpring(0, { damping: 8, stiffness: 100 });
      }, 300);
      return;
    }
    router.push({
      pathname: "/add-card",
      params: {
        editId: id,
        defaultCardNumber: card.cardNumber,
        defaultCardHolder: card.cardHolder,
        defaultExpiry: card.expiry,
        defaultCvv: card.cvv,
        defaultBank: card.bank,
        defaultCardNetwork: card.cardNetwork,
        defaultCardKind: card.cardKind,
        defaultCobrandName: card.cobrandName,
        defaultCardUser: card.cardUser,
        defaultDominantColor: card.dominantColor,
        // Only pass cardExpiresAt for "other" cards
        cardExpiresAt: card.cardUser === "other" && card.cardExpiresAt ? card.cardExpiresAt.toString() : undefined,
        fromEdit: "true",
      },
    });
  }, [router, id, card, showNumber, revealButtonShake]);

  useFocusEffect(
    React.useCallback(() => {
      navigation.setOptions({
        title: "Card Details",
        gestureEnabled: false, // Disable back gesture
      });
    }, [navigation])
  );

  // Intercept back navigation to always go to home
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Always prevent default back behavior and navigate to home instead
      if (e.data.action.type === 'GO_BACK' || e.data.action.type === 'POP') {
        e.preventDefault();
        router.replace("/");
      }
    });

    return unsubscribe;
  }, [navigation, router]);

  const loadCard = React.useCallback(async () => {
    try {
      // 1. Get card from context (masked version initially)
      const found = cards.find((c) => c.id === id);

      // Only show top-level loading if we don't have a card in state yet
      if (!found) {
        setIsLoadingCard(true);
      }
      setHasAttemptedLoad(false);

      if (found) {
        // 2. If already revealed, fetch unmasked info to stay "fresh"
        if (isRevealed) {
          try {
            const revealed = await revealCard(id);
            if (revealed) {
              setCard((prev: any) => JSON.stringify(prev) !== JSON.stringify(revealed) ? revealed : prev);
            } else {
              setCard((prev: any) => JSON.stringify(prev) !== JSON.stringify(found) ? found : prev);
              setIsRevealed(false);
            }
          } catch (revealErr) {
            console.error("Failed to re-reveal card on reload:", revealErr);
            setCard((prev: any) => JSON.stringify(prev) !== JSON.stringify(found) ? found : prev);
            setIsRevealed(false);
          }
        } else {
          setCard((prev: any) => JSON.stringify(prev) !== JSON.stringify(found) ? found : prev);
        }

        setIsLoadingCard(false);
        setHasAttemptedLoad(true);
      } else {
        // If card not found in context, it might not be loaded yet
        setTimeout(async () => {
          const retryCard = cards.find((c) => c.id === id);
          if (retryCard) {
            setCard((prev: any) => JSON.stringify(prev) !== JSON.stringify(retryCard) ? retryCard : prev);
            setIsRevealed(false);
          } else {
            setCard(null);
          }
          setIsLoadingCard(false);
          setHasAttemptedLoad(true);
        }, 800);
        return;
      }
    } catch (err) {
      console.error(err);
      setIsLoadingCard(false);
      setHasAttemptedLoad(true);
    }
  }, [id, cards, isRevealed, revealCard]);

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
              await removeCard(id);
              router.back();
            } catch (err) { console.error(err); }
          },
        },
      ],
    });
  };

  // Countdown timer for imported cards (other's cards) that are about to expire
  const cardExpiresAtNum = card?.cardExpiresAt ? parseInt(card.cardExpiresAt.toString()) : null;
  // Ensure we're working with seconds (Unix timestamp), not milliseconds
  // If the value is > 10 billion, it's likely in milliseconds, so convert to seconds
  const normalizedCardExpiresAt = cardExpiresAtNum && cardExpiresAtNum > 10000000000
    ? Math.floor(cardExpiresAtNum / 1000)
    : cardExpiresAtNum;

  const { isExpired: cardIsExpired } = useCountdown(normalizedCardExpiresAt);

  // Trigger alert when card expiry timer reaches zero
  useEffect(() => {
    if (cardIsExpired && !expiryModalShownRef.current) {
      expiryModalShownRef.current = true;
      if (__DEV__) console.log("🔔 Card expired, hiding details and showing alert");

      // Hide card if it's in reveal state (same as hide/reveal button functionality)
      if (showNumber) {
        setShowNumber(false);
        setCanUsePip(false);
        setIsRevealed(false);
      }

      const last4 = card?.cardNumber ? card.cardNumber.slice(-4) : '****';
      const bankInfo = card?.bank ? `from ${card.bank} ` : '';

      const newAlertConfig = {
        title: "Card Expired",
        message: `The shared card ${bankInfo}ending in ${last4} has expired and is no longer available.`,
        type: "error" as const,
        dismissible: false,
        buttons: [
          {
            text: "Go to Home",
            style: "default" as const,
            onPress: () => {
              console.log("🏠 Going to home");
              if (isMountedRef.current) {
                setAlertVisible(false);
              }
              router.push("/");
            },
          },
        ],
      };

      console.log("📋 Setting alert config:", newAlertConfig);
      setAlertConfig(newAlertConfig);

      if (isMountedRef.current) {
        console.log("✅ Setting alert visible to true");
        setAlertVisible(true);
      }
    }
  }, [cardIsExpired, router, showNumber, cards, id]);

  // Cleanup mounted ref on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleDeviceLock = async (ignoreQuota = false) => {
    // Check if card is expired
    if (cardIsExpired) {
      console.log("⏰ [PiP] Card is expired, showing expiry alert");
      const last4 = card?.cardNumber ? card.cardNumber.slice(-4) : '****';
      const bankInfo = card?.bank ? `from ${card.bank} ` : '';
      const newAlertConfig = {
        title: "Card Expired",
        message: `The shared card ${bankInfo}ending in ${last4} has expired and is no longer available.`,
        type: "error" as const,
        dismissible: false,
        buttons: [
          {
            text: "Go to Home",
            style: "default" as const,
            onPress: () => {
              console.log("🏠 [PiP] Going to home");
              if (isMountedRef.current) {
                setAlertVisible(false);
              }
              router.push("/");
            },
          },
        ],
      };
      setAlertConfig(newAlertConfig);
      setAlertVisible(true);
      return;
    }

    if (showNumber) {
      if (__DEV__) console.log('🔒 [PiP] Hiding card numbers - cardId:', id);
      setShowNumber(false);
      setCanUsePip(false);

      // Revert to masked card from context
      const maskedCard = cards.find((c) => c.id === id);
      if (maskedCard) {
        if (__DEV__) console.log('✅ [PiP] Card hidden and reverted to masked version');
        setCard(maskedCard);
        setIsRevealed(false);
      }
      return;
    }

    if (quotaLoading) return;

    // 1. Quota Check
    if (__DEV__) console.log(`📊 [Quota] Card view count: ${viewsCount}, isQuotaExceeded: ${isQuotaExceeded}, isAdWatched: ${isAdWatched}, ignoreQuota: ${ignoreQuota}`);
    
    if (isQuotaExceeded && !isAdWatched && !ignoreQuota) {
      setShowQuotaModal(true);
      return;
    }

    try {
      // 2. Authentication Check
      // Check security settings for biometric authentication
      const saved = await AsyncStorage.getItem(SECURITY_SETTINGS_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      const cardLock = parsed.cardLock ?? true;
      const cooldown = parsed.cooldown ?? 0;

      // If card lock is disabled or cooldown is active, proceed without auth
      if (!cardLock || cooldownActiveRef.current) {
        await performRevealAndShow();
        return;
      }

      // Require authentication before revealing/showing card data
      const ok = await authenticateUser("card");
      if (ok) {
        await performRevealAndShow();
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
    } catch (err) {
      console.error("Failed to reveal card:", err);
    }
  };

  const performRevealAndShow = async () => {
    if (__DEV__) console.log('🔓 [PiP] Performing reveal and show - cardId:', id);

    // If card is not revealed yet, reveal it first
    if (!isRevealed) {
      if (__DEV__) console.log('🔓 [PiP] Card not yet revealed, fetching unmasked data...');
      try {
        const revealedCard = await revealCard(id);
        if (revealedCard) {
          console.log('✅ [PiP] Card revealed successfully');
          setCard(revealedCard);
          setIsRevealed(true);
        } else {
          console.error('❌ [PiP] Failed to reveal card - no data returned');
          showAlert({
            title: "Error",
            message: "Failed to reveal card details. Please try again.",
            buttons: [{ text: "OK", onPress: () => { } }]
          });
          return;
        }
      } catch (error) {
        console.error("❌ [PiP] Failed to reveal card:", error);
        showAlert({
          title: "Error",
          message: "Failed to reveal card details. Please try again.",
          buttons: [{ text: "OK", onPress: () => { } }]
        });
        return;
      }
    } else {
      console.log('✅ [PiP] Card already revealed');
    }

    // Show the card numbers
    if (__DEV__) console.log('👁️ [PiP] Showing card numbers - canUsePip will be set to true');
    setShowNumber(true);
    setCanUsePip(true);
    await incrementViews();
    setIsAdWatched(false);
    if (__DEV__) console.log('✅ [PiP] Card revealed and ready for PiP');
  };

  const handleWatchAd = async () => {
    setIsAdLoading(true);
    setShowQuotaModal(false);
    try {
      await showInterstitialAd();
      setIsAdWatched(true);
      // Re-run lock logic which will now pass the quota check
      handleDeviceLock(true);
    } catch (err) {
      console.error("Ad failed to show:", err);
      Toast.show({
        type: "error",
        text1: "Ad Error",
        text2: "Failed to load ad. Please try again.",
      });
    } finally {
      setIsAdLoading(false);
    }
  };

  const handleCopy = async () => {
    console.log('Copy button clicked, showNumber:', showNumber);
    if (!showNumber) {
      console.log('Card not revealed, triggering shake animation');
      // Trigger shake animation on reveal button
      revealButtonShake.value = withSpring(1, { damping: 8, stiffness: 100 });
      setTimeout(() => {
        revealButtonShake.value = withSpring(0, { damping: 8, stiffness: 100 });
      }, 300);
      return;
    }
    if (!card?.cardNumber) return;
    try {
      // Copy the masked card number with X's instead of asterisks
      const maskedNumber = card.cardNumber.replace(/\*/g, 'X');
      await Clipboard.setStringAsync(maskedNumber);
      Toast.show({ type: "success", text1: "Masked number copied!", visibilityTime: 1500 });
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    console.log('📱 [PiP] Card Details Screen mounted - cardId:', id);
    return () => {
      console.log('📱 [PiP] Card Details Screen unmounting - cardId:', id);
      if (cooldownTimerRef.current) {
        console.log('🧹 [PiP] Clearing cooldown timer on unmount');
        clearTimeout(cooldownTimerRef.current);
      }
      if (cleanupTimeoutRef.current) {
        console.log('🧹 [PiP] Clearing cleanup timeout on unmount');
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [id]);

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

  const revealButtonAnimatedStyle = useAnimatedStyle(() => {
    // If card is not revealed, add a continuous pulsing animation
    const pulseValue = !showNumber ? interpolate(revealButtonShake.value, [0, 1], [1, 1.15]) : 1;
    return {
      transform: [
        { scale: pulseValue }
      ],
    };
  });

  // Continuous pulsing animation when card is not revealed
  useEffect(() => {
    if (!showNumber) {
      // Start continuous pulsing with interval
      let isAnimatingUp = true;
      const interval = setInterval(() => {
        if (isAnimatingUp) {
          revealButtonShake.value = withSpring(1, { damping: 4, stiffness: 100 });
          isAnimatingUp = false;
        } else {
          revealButtonShake.value = withSpring(0, { damping: 4, stiffness: 100 });
          isAnimatingUp = true;
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      // Stop animation and reset
      revealButtonShake.value = 0;
    }
  }, [showNumber, revealButtonShake]);

  if (!card && hasAttemptedLoad) return <CardNotFound />;

  // Show loading state while card is being loaded
  if (isLoadingCard) {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: palette.surface }]}
      >
        <DecryptLoader 
          text="Loading card details..." 
          subtext="Accessing Secure Vault" 
        />
      </SafeAreaView>
    );
  }

  const cardColor = card.dominantColor || palette.primary;
  const contentColor = getContrastColor(cardColor);
  const isDarkCard = contentColor === "#FFFFFF";

  // timerTick ensures component re-renders for validity updates
  void timerTick; // Mark as used to prevent linter warning


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.surface }]}>
      <Hero title="Card Details" subtitle="Secure View" showBackButton onBack={() => router.replace("/")} />
      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.cardContainerWrapper}>
            <Pressable onPress={toggleFlip}>
              <Animated.View
                ref={(ref) => {
                  visibleCardRef.current = ref;
                  if (ref) {
                    console.log('✅ [PiP] Visible card ref attached - ready for capture');
                  }
                }}
                collapsable={false}
                style={[styles.cardFront, frontAnimatedStyle, { backgroundColor: cardColor }]}
              >
                <View style={styles.cardHeader}>
                  <ThemedText style={[styles.bankName, { color: contentColor, textShadowColor: isDarkCard ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]}>
                    {card.bank}
                  </ThemedText>
                  <View style={styles.cardTypeIcon}>
                    <CardNetworkLogo
                      cardNumber={card.cardNumber}
                      cardNetwork={card.cardNetwork}
                      width={38}
                      height={24}
                      color="#FFFFFF"
                      showTextFallback={true}
                    />
                  </View>
                </View>
                <View style={styles.cardNumberRow}>
                  <ThemedText numberOfLines={1} adjustsFontSizeToFit style={[styles.cardNumber, { color: contentColor }]}>
                    {showNumber ? formatCardNumber(card.cardNumber) : formatCardNumber(card.cardNumber.replace(/\*/g, 'X'))}
                  </ThemedText>
                </View>
                <View style={styles.cardInfoRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.label, { color: isDarkCard ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }]}>Card Holder</ThemedText>
                    <ThemedText numberOfLines={1} style={[styles.info, { color: contentColor }]}>{card.cardHolder}</ThemedText>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 10, minWidth: 60 }}>
                    <ThemedText style={[styles.label, { color: isDarkCard ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }]}>Expiry</ThemedText>
                    <ThemedText numberOfLines={1} style={[styles.info, { color: contentColor }]}>{card.expiry}</ThemedText>
                  </View>
                </View>
              </Animated.View>

              <Animated.View style={[styles.cardBack, backAnimatedStyle, { backgroundColor: card.dominantColor || "#333" }]}>
                <View style={styles.magneticStripe} />
                <View style={styles.signatureRow}>
                  <View style={styles.signatureArea} />
                  {card.cvv ? (
                    <View style={styles.cvvArea}>
                      <ThemedText style={styles.cvvLabel}>CVV</ThemedText>
                      <ThemedText style={styles.cvvText}>
                        {showNumber ? card.cvv : (card.cvv ? "•".repeat(card.cvv.length) : "N/A")}
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={styles.cvvArea}>
                      <ThemedText style={styles.cvvLabel}>CVV</ThemedText>
                      <ThemedText style={styles.cvvText}>N/A</ThemedText>
                    </View>
                  )}
                </View>
                <View style={styles.backInfo}>
                  <ThemedText style={styles.backInfoText}>Authorized Signature • Not Valid Unless Signed</ThemedText>
                </View>
              </Animated.View>
            </Pressable>
            <ThemedText style={styles.flipHint}><Ionicons name="refresh-outline" size={14} color={palette.text} /> Tap card to flip</ThemedText>
          </View>

          <View style={styles.actionRow}>
            <Animated.View style={revealButtonAnimatedStyle}>
              <Pressable style={styles.actionButton} onPress={() => handleDeviceLock()}>
                <View style={[styles.actionIconWrapper, { backgroundColor: palette.primary }]}>
                  <Ionicons name={!showNumber ? "eye-off-outline" : "eye-outline"} size={24} color="white" />
                </View>
                <ThemedText style={styles.actionLabel}>
                  {showNumber ? "Hide" : "Reveal"}
                </ThemedText>
              </Pressable>
            </Animated.View>
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

          <View style={[styles.summaryContainer, { backgroundColor: palette.surface }]}>
            <View style={styles.summaryHeader}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Card Details</ThemedText>
            </View>

            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { backgroundColor: palette.card }]}>
                <View style={[styles.summaryIcon, { backgroundColor: palette.primary + '15' }]}>
                  <Ionicons name="business-outline" size={18} color={palette.primary} />
                </View>
                <View style={styles.summaryContent}>
                  <ThemedText style={styles.summaryLabel}>Bank</ThemedText>
                  <ThemedText style={styles.summaryValue}>{card.bank || "N/A"}</ThemedText>
                </View>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: palette.card }]}>
                <View style={[styles.summaryIcon, { backgroundColor: palette.secondary + '15' }]}>
                  <Ionicons name={card.cardUser === "other" ? "people-outline" : "person-outline"} size={18} color={palette.secondary} />
                </View>
                <View style={styles.summaryContent}>
                  <ThemedText style={styles.summaryLabel}>Owner</ThemedText>
                  <ThemedText style={[styles.summaryValue, { textTransform: 'capitalize' }]}>{card.cardUser || "Self"}</ThemedText>
                </View>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: palette.card }]}>
                <View style={[styles.summaryIcon, { backgroundColor: palette.tint + '15' }]}>
                  <Ionicons name={card.cardKind === "debit" ? "card-outline" : "card"} size={18} color={palette.tint} />
                </View>
                <View style={styles.summaryContent}>
                  <ThemedText style={styles.summaryLabel}>Card Type</ThemedText>
                  <ThemedText style={[styles.summaryValue, { textTransform: 'uppercase' }]}>{card.cardKind || "Credit"}</ThemedText>
                </View>
              </View>

              {card.cobrandName && (
                <View style={[styles.summaryCard, { backgroundColor: palette.card }]}>
                  <View style={[styles.summaryIcon, { backgroundColor: palette.danger + '15' }]}>
                    <Ionicons name="pricetag-outline" size={18} color={palette.danger} />
                  </View>
                  <View style={styles.summaryContent}>
                    <ThemedText style={styles.summaryLabel}>Co-brand</ThemedText>
                    <ThemedText style={styles.summaryValue}>{card.cobrandName}</ThemedText>
                  </View>
                </View>
              )}

              {card.cardUser === "other" && card.cardExpiresAt ? (
                <ExpiryTimerSection cardExpiresAt={card.cardExpiresAt} />
              ) : card.cardUser === "other" ? (
                <View style={[styles.summaryCard, { backgroundColor: palette.card }]}>
                  <View style={[styles.summaryIcon, { backgroundColor: palette.primary + '15' }]}>
                    <Ionicons name="time-outline" size={18} color={palette.primary} />
                  </View>
                  <View style={styles.summaryContent}>
                    <ThemedText style={styles.summaryLabel}>Validity</ThemedText>
                    <ThemedText style={styles.summaryValue}>∞ Forever</ThemedText>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={[styles.cardInsights, { borderTopColor: palette.border }]}>
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

      <UnifiedModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        dismissible={alertConfig.dismissible !== false}
        type={alertConfig.type}
        onRequestClose={() => setAlertVisible(false)}
      />


      {/* Quota Exceeded Modal */}
      <Modal
        visible={showQuotaModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQuotaModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowQuotaModal(false)}
        >
          <Pressable 
            style={[styles.quotaModalContent, { backgroundColor: palette.card }]}
            onPress={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <View style={[styles.quotaIconContainer, { backgroundColor: `${palette.primary}15` }]}>
              <Ionicons name="shield-checkmark" size={40} color={palette.primary} />
            </View>
            
            <ThemedText type="subtitle" style={styles.quotaTitle}>Daily Limit Reached</ThemedText>
            
            <ThemedText style={styles.quotaDescription}>
              You've used your 5 free card reveals for today. To keep Cardy Wall free and secure for everyone, please watch a short video to unlock this view.
            </ThemedText>

            <View style={styles.quotaInfoBox}>
              <Ionicons name="information-circle-outline" size={16} color={palette.icon} />
              <ThemedText style={styles.quotaInfoText}>
                Your data remains encrypted locally. Ads help us maintain the infrastructure.
              </ThemedText>
            </View>

            <View style={styles.quotaActions}>
              <AppButton 
                title={isAdLoading ? "Loading Ad..." : "Watch Video to Unlock"} 
                onPress={handleWatchAd}
                disabled={isAdLoading}
                icon="play-circle-outline"
              />
              
              <Pressable 
                style={styles.premiumButton}
                onPress={() => {
                  Toast.show({
                    type: "info",
                    text1: "Coming Soon!",
                    text2: "Premium for unlimited access is in development.",
                  });
                }}
              >
                <ThemedText style={[styles.premiumText, { color: palette.primary }]}>
                  Go Premium (Coming Soon)
                </ThemedText>
              </Pressable>

              <Pressable 
                style={styles.cancelButton}
                onPress={() => setShowQuotaModal(false)}
              >
                <ThemedText style={styles.cancelText}>Maybe Later</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  info: { fontSize: 15, fontWeight: "bold", letterSpacing: 0.5, fontFamily: Platform.select({ ios: "Courier-Bold", android: "monospace" }) },
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
  summaryContainer: { marginHorizontal: 16, padding: 20, borderRadius: 16, marginBottom: 24 },
  summaryHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "600" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
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
  cardInsights: { marginTop: 20, paddingTop: 16, borderTopWidth: 1 },
  insightRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  insightItem: { flexDirection: "row", alignItems: "center", flex: 0.48 },
  insightText: { fontSize: 11, opacity: 0.7, marginLeft: 6 },
  note: { fontSize: 10, textAlign: "center", marginTop: 32, opacity: 0.3 },
  pipIconButton: { backgroundColor: "rgba(255,255,255, 0.2)", borderRadius: 20, padding: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  quotaModalContent: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  quotaIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  quotaTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  quotaDescription: {
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 20,
  },
  quotaInfoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  quotaInfoText: {
    fontSize: 12,
    flex: 1,
    opacity: 0.6,
  },
  quotaActions: {
    width: '100%',
    gap: 12,
  },
  premiumButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  premiumText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    opacity: 0.5,
  },
});
