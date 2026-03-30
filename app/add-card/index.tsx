import InterstitialAd, { showInterstitialAd } from "@/components/AdInterstitial";
import AppButton from "@/components/AppButton";
import Hero from "@/components/Hero";
import InfoBox from "@/components/InfoBox";
import UnifiedModal, { UnifiedModalButton } from "@/components/UnifiedModal";
import { ThemedText } from "@/components/themed-text";
import { ADMOB_CONFIG } from "@/constants/admob";
import { Colors } from "@/constants/theme";
import { useCardsWithMigration as useCards } from "@/context/CardContextWithMigration";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCountdown } from "@/hooks/use-countdown";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import { getCardType } from "@/utils/CardType";
import { setGlobalAdSuppression } from "@/utils/adControl";
import { getUnmaskedCards, getMaskedCards as secureGetCards } from "@/utils/secureStorage";
import { MaterialIcons } from "@expo/vector-icons";
import { StackActions, useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Keyboard, Platform, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import NfcManager from "react-native-nfc-manager";
import { SafeAreaView } from "react-native-safe-area-context";
import CardForm from "./components/CardForm";
import NfcScanButton from "./components/NfcScanButton";
import ScanButton from "./components/ScanButton";

export default function AddCardScreen() {
  useScreenProtection();
  const router = useRouter();
  const navigation = useNavigation();
  const { addCard, updateCard } = useCards();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const [isSaving, setIsSaving] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    buttons?: UnifiedModalButton[];
    dismissible?: boolean;
    type?: "default" | "error" | "warning" | "success";
  }>({ title: "", message: "" });
  const expiryModalShownRef = useRef(false);
  const isMountedRef = useRef(true);
  const [isNfcSupported, setIsNfcSupported] = useState(false);
  const [isScanSupported, setIsScanSupported] = useState(true);

  const {
    from,
    redirectTo,
    sessionId,
    receiverPublicKey,
    expiresAt,
    defaultCardNumber,
    defaultCardHolder,
    defaultExpiry,
    defaultCvv,
    fromExtract,
    editId,
    fromEdit,
    defaultBank,
    defaultCardKind,
    defaultCobrandName,
    defaultCardUser,
    defaultDominantColor,
    cardExpiresAt,
    defaultCardNetwork
  } = useLocalSearchParams<{
    from?: string;
    redirectTo?: string;
    sessionId?: string;
    receiverPublicKey?: string;
    expiresAt?: string;
    defaultCardNumber?: string;
    defaultCardHolder?: string;
    defaultExpiry?: string;
    defaultCvv?: string;
    fromExtract?: string;
    editId?: string;
    fromEdit?: string;
    defaultBank?: string;
    defaultCardKind?: "credit" | "debit";
    defaultCobrandName?: string;
    defaultCardUser?: "self" | "other";
    defaultDominantColor?: string;
    cardExpiresAt?: string;
    defaultCardNetwork?: string;
  }>();

  // Countdown timer for imported cards (other's cards) that are about to expire
  const cardExpiresAtNum = cardExpiresAt ? parseInt(cardExpiresAt) : null;
  // Ensure we're working with seconds (Unix timestamp), not milliseconds
  // If the value is > 10 billion, it's likely in milliseconds, so convert to seconds
  const normalizedCardExpiresAt = cardExpiresAtNum && cardExpiresAtNum > 10000000000
    ? Math.floor(cardExpiresAtNum / 1000)
    : cardExpiresAtNum;

  const { timeLeft: cardTimeLeft, isExpired: cardIsExpired, formatTime } = useCountdown(normalizedCardExpiresAt);
  const showExpiryWarning = normalizedCardExpiresAt && cardTimeLeft > 0 && cardTimeLeft < 300; // Less than 5 minutes

  // Suppress App Open Ads while in this flow
  useEffect(() => {
    setGlobalAdSuppression(true);
    return () => setGlobalAdSuppression(false);
  }, []);

  const clearImageDump = async () => {
    try {

      // Helper function to recursively delete image files in a directory
      const deleteImagesInDir = async (dirPath: string) => {
        try {
          // Ensure directory path ends with /
          const normalizedDir = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
          const info = await FileSystem.getInfoAsync(normalizedDir);
          if (!info.exists || !info.isDirectory) {
            return;
          }

          const items = await FileSystem.readDirectoryAsync(normalizedDir);

          for (const item of items) {
            const itemPath = `${normalizedDir}${item}`;
            const itemInfo = await FileSystem.getInfoAsync(itemPath);

            if (itemInfo.exists) {
              if (itemInfo.isDirectory) {
                // Recursively check subdirectories
                await deleteImagesInDir(itemPath);
              } else {
                // Check if it's an image file by extension
                const lowerItem = item.toLowerCase();
                const isImageExtension =
                  lowerItem.endsWith('.jpg') ||
                  lowerItem.endsWith('.jpeg') ||
                  lowerItem.endsWith('.png') ||
                  lowerItem.endsWith('.heic') ||
                  lowerItem.endsWith('.webp') ||
                  lowerItem.endsWith('.heif');

                // Also check files without extensions, but only if they're in cache directory
                // and are reasonably sized (likely image files, not system files)
                const hasNoExtension = !lowerItem.includes('.');
                const isInCache = normalizedDir.includes('Cache') || normalizedDir.includes('cache');
                const isLikelyImage = hasNoExtension && isInCache && itemInfo.size && itemInfo.size > 10000; // > 10KB

                if (isImageExtension || isLikelyImage) {
                  await FileSystem.deleteAsync(itemPath, { idempotent: true });
                }
              }
            }
          }
        } catch (error) {
          // Silently continue if directory doesn't exist or can't be read
        }
      };

      // Clean cache directory (where expo-camera and expo-image-manipulator save files)
      if (FileSystem.cacheDirectory) {
        await deleteImagesInDir(FileSystem.cacheDirectory);
      }

      // Also check document directory for any image subdirectories
      if (FileSystem.documentDirectory) {
        await deleteImagesInDir(FileSystem.documentDirectory);
      }
    } catch (error) {
      // Failed to clear image dump
    }
  };

  const isEditMode = fromEdit === "true" && !!editId;
  const hideScanButton = fromExtract === "true" || isEditMode;
  const hideActionButtons = hideScanButton || (!isScanSupported && !isNfcSupported);

  // Load existing card data for edit mode
  useEffect(() => {
    if (isEditMode && editId) {
      const loadCardForEdit = async () => {
        try {
          await secureGetCards();
          // The card data will be passed via params, so we don't need to do anything here
          // The form will be prefilled with the default* parameters
        } catch (error) {
          console.error("Failed to load card for editing:", error);
        }
      };
      loadCardForEdit();
    }
  }, [isEditMode, editId]);

  // Check NFC support
  useEffect(() => {
    const checkNfcSupport = async () => {
      if (Platform.OS === 'ios') {
        // Direct EMV scanning is generally not supported on iOS for 3rd party apps
        setIsNfcSupported(false);
        return;
      }
      try {
        const supported = await NfcManager.isSupported();
        setIsNfcSupported(!!supported);
      } catch (e) {
        setIsNfcSupported(false);
      }
    };
    checkNfcSupport();
  }, []);

  // Check Scan (ML Kit) support
  useEffect(() => {
    const checkScanSupport = () => {
      const version = Platform.Version;
      if (Platform.OS === 'ios') {
        const majorVersion = parseFloat(String(version));
        // Requirement is 15.5+
        setIsScanSupported(majorVersion >= 15.5);
      } else if (Platform.OS === 'android') {
        // Platform.Version on Android is the API level (number)
        setIsScanSupported(Number(version) >= 21);
      }
    };
    checkScanSupport();
  }, []);

  // Trigger alert when card expiry timer reaches zero (only in edit mode for other's cards)
  useEffect(() => {
    if (cardIsExpired && !expiryModalShownRef.current) {
      expiryModalShownRef.current = true;
      setAlertConfig({
        title: "Card Expired",
        message: "This card has expired and is no longer available",
        type: "error",
        dismissible: false,
        buttons: [
          {
            text: "Go to Home",
            onPress: () => {
              if (isMountedRef.current) {
                setAlertVisible(false);
              }
              router.dismissAll();
              router.push("/");
            },
          },
        ],
      });
      if (isMountedRef.current) {
        setAlertVisible(true);
      }
    }
  }, [cardIsExpired, router]);

  // Cleanup mounted ref on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const saveCardLocally = async (card: {
    id: string;
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvv: string;
    infoText: string;
    bank?: string;
    cardKind?: "credit" | "debit";
    cobrandName?: string;
    cardUser?: "self" | "other";
    dominantColor?: string;
    cardNetwork?: string;
  }) => {
    try {
      if (__DEV__) console.log("💾 saveCardLocally - Card number received:", card.cardNumber, "(Length:", card.cardNumber.length, ")");
      // Ensure cardUser defaults to "self" if not specified and detect card type
      const detectedCardNetwork = getCardType(card.cardNumber);

      const cardWithDefaults = {
        ...card,
        cardUser: card.cardUser || "self",
        cardNetwork: card.cardNetwork || detectedCardNetwork || undefined // Auto-detect card network
      };

      // Check for duplicate card numbers (excluding current card in edit mode)
      // Allow same card number if it belongs to a different owner (self vs other)
      const existingCards = await getUnmaskedCards();
      const duplicateCard = existingCards.find((existingCard: any) => {
        // In edit mode, exclude the current card being edited
        if (isEditMode && editId && existingCard.id === editId) {
          return false;
        }
        // Allow same card number if it belongs to a different owner
        if (existingCard.cardUser !== cardWithDefaults.cardUser) {
          return false;
        }
        return existingCard.cardNumber === cardWithDefaults.cardNumber;
      });

      if (duplicateCard) {
        throw new Error("A card with this number already exists");
      }

      if (isEditMode && editId) {
        // Update existing card via context to ensure UI stays in sync
        await updateCard(editId, cardWithDefaults as any);
      } else {
        // Add new card
        await addCard(cardWithDefaults as any);
      }
      // Only clean up images after successful save
      await clearImageDump();
    } catch (error) {
      throw error;
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEditMode ? "Edit Card" : "Add Card" });
  }, [navigation, isEditMode]);

  const handleScan = () => {
    router.push("/add-card/scan");
  };

  const handleNfcScan = () => {
    router.push("/add-card/nfc");
  };

  const handleManualAdd = async (card: {
    id: string;
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvv: string;
    infoText: string;
    bank?: string;
    cardKind?: "credit" | "debit";
    cobrandName?: string;
    cardUser?: "self" | "other";
    dominantColor?: string;
    cardNetwork?: string;
  }) => {
    if (__DEV__) console.log("📝 handleManualAdd - Card number from form:", card.cardNumber, "(Length:", card.cardNumber.length, ")");
    if (isSaving) return; // Prevent double submission

    setIsSaving(true);

    try {
      // 1️⃣ Save the card info
      await saveCardLocally(card);

      // 2️⃣ Navigate based on mode with smart tab redirection
      if (isEditMode) {
        // Go back to card details page
        router.back();
      } else if (redirectTo) {
        // Custom redirect path provided (e.g., from select-card screen)
        // If it's the select-card screen, we should go back instead of replace
        // as the screen is already in the stack and will refresh on focus.
        if (redirectTo === "/share-card/select-card") {
          router.back();
        } else {
          const params: any = {};
          if (sessionId && receiverPublicKey && expiresAt) {
            params.sessionId = sessionId;
            params.receiverPublicKey = receiverPublicKey;
            params.expiresAt = expiresAt;
          }
          router.replace({
            pathname: redirectTo as any,
            params
          });
        }
      } else if (from === "share") {
        // Coming from share screen - go back to share screen with new card selected and force card selection mode
        const params: any = { selectedCardId: card.id, showCardSelection: "true" };
        if (sessionId && receiverPublicKey && expiresAt) {
          params.sessionId = sessionId;
          params.receiverPublicKey = receiverPublicKey;
          params.expiresAt = expiresAt;
        }
        router.navigate({
          pathname: "/share-card/share" as any,
          params
        });
      } else {
        // Navigate back to home screen for new cards and switch to the correct tab.
        // dismissAll() ensures the stack is emptied so home becomes the root.
        router.dismissAll();
        router.replace({
          pathname: "/" as any,
          params: { redirectToTab: card.cardUser || "self" }
        });
      }

      // 3️⃣ Show interstitial ad after a short delay (non-blocking)
      // This allows the navigation to complete first
      setTimeout(() => {
        showInterstitialAd(
          () => { },
          () => { },
          1500,
          ADMOB_CONFIG.addCardInterstitialUnitId
        ).catch(() => { });
      }, 300); // Small delay to ensure navigation completes

    } catch (err) {
      console.error("Failed to save card:", err);
      const errorMessage = err instanceof Error && err.message.includes("already exists")
        ? "A card with this number already exists. Please use a different card."
        : "Failed to save card info. Please try again.";
      setAlertConfig({
        title: "Error",
        message: errorMessage,
        type: "error",
        buttons: [{ text: "OK", style: "cancel", onPress: () => setAlertVisible(false) }]
      });
      setAlertVisible(true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.surface }]}
      edges={["top", "bottom"]}
    >
      <Hero
        title={isEditMode ? "Edit Card" : "Add a new Card"}
        subtitle={isEditMode ? "Update card details" : "Scan or enter details manually"}
        showBackButton={true}
      />
      {showExpiryWarning && (
        <View style={[styles.expiryWarningBar, { backgroundColor: palette.danger + '15', borderBottomColor: palette.danger }]}>
          <MaterialIcons name="schedule" size={16} color={palette.danger} />
          <ThemedText style={[styles.expiryWarningText, { color: palette.danger }]}>
            Card expires in {formatTime(cardTimeLeft)}
          </ThemedText>
        </View>
      )}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraHeight={120}
        extraScrollHeight={120}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        nestedScrollEnabled={true}
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        {!hideActionButtons && (
          <>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {isScanSupported && (
                <View style={{ flex: 1 }}>
                  <ScanButton onPress={handleScan} />
                </View>
              )}
              {isNfcSupported && (
                <View style={{ flex: 1 }}>
                  <NfcScanButton onPress={handleNfcScan} />
                </View>
              )}
            </View>

            <View style={styles.orSeparatorContainer}>
              <View
                style={[styles.line, { backgroundColor: palette.border }]}
              />
              <ThemedText style={styles.orText}>OR</ThemedText>
              <View
                style={[styles.line, { backgroundColor: palette.border }]}
              />
            </View>
          </>
        )}

        {fromExtract === "true" && (
          <InfoBox
            message="⚠️ Please review all details carefully before saving. The scanned information might contain errors."
            type="warning"
            style={{ marginHorizontal: 0 }}
          />
        )}

        <CardForm
          onSubmit={handleManualAdd}
          defaultCardNumber={defaultCardNumber}
          defaultCardHolder={defaultCardHolder}
          defaultExpiry={defaultExpiry}
          defaultCvv={defaultCvv}
          defaultBank={defaultBank}
          defaultCardKind={defaultCardKind}
          defaultCobrandName={defaultCobrandName}
          defaultCardUser={defaultCardUser}
          defaultDominantColor={defaultDominantColor}
          defaultCardNetwork={defaultCardNetwork}
          disabled={isSaving}
          isEditMode={isEditMode}
          fromShare={from === "share"}
        />

        {hideScanButton && (
          <>
            <View style={{ height: 16 }} />
            <AppButton
              title="Back to Home"
              variant="secondary"
              onPress={() => navigation.dispatch(StackActions.popToTop())}
              fullWidth
            />
          </>
        )}
      </KeyboardAwareScrollView>

      {/* Preload interstitial ad for faster loading */}
      <InterstitialAd />

      <UnifiedModal
        visible={alertVisible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        dismissible={alertConfig.dismissible !== false}
        type={alertConfig.type}
        onRequestClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f2" },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 160, flexGrow: 1 },
  expiryWarningBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  expiryWarningText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  orSeparatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },
  orText: {
    marginHorizontal: 8,
    fontWeight: "bold",
    color: "#666",
  },
});
