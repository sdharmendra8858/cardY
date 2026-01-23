import InterstitialAd, { showInterstitialAd } from "@/components/AdInterstitial";
import AlertBox from "@/components/AlertBox";
import AppButton from "@/components/AppButton";
import Hero from "@/components/Hero";
import InfoBox from "@/components/InfoBox";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useCards } from "@/context/CardContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import { getCardType } from "@/utils/CardType";
import { decryptCards, EncryptionResult } from "@/utils/encryption/cardEncryption";
import { getMaskedCards as secureGetCards, setCards, STORAGE_KEY_UNMASKED } from "@/utils/secureStorage";
import { StackActions, useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useLayoutEffect, useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import CardForm from "./components/CardForm";
import ScanButton from "./components/ScanButton";

export default function AddCardScreen() {
  useScreenProtection();
  const router = useRouter();
  const navigation = useNavigation();
  const { addCard } = useCards();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const [isSaving, setIsSaving] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; buttons?: any[] }>({ title: "", message: "" });
  const { from, sessionId, receiverPublicKey, expiresAt } = useLocalSearchParams<{
    from?: string;
    sessionId?: string;
    receiverPublicKey?: string;
    expiresAt?: string;
  }>();

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
          console.warn(`⚠️ Could not process directory ${dirPath}:`, error);
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
      console.warn('⚠️ Failed to clear image dump:', error);
    }
  };

  const {
    defaultCardNumber,
    defaultCardHolder,
    defaultExpiry,
    defaultCvv,
    fromExtract,
    editId,
    fromEdit,
    defaultBank,
    defaultCardType,
    defaultCardKind,
    defaultCobrandName,
    defaultCardUser,
    defaultDominantColor,
  } = useLocalSearchParams<{
    defaultCardNumber?: string;
    defaultCardHolder?: string;
    defaultExpiry?: string;
    defaultCvv?: string;
    fromExtract?: string;
    editId?: string;
    fromEdit?: string;
    defaultBank?: string;
    defaultCardType?: string;
    defaultCardKind?: "credit" | "debit";
    defaultCobrandName?: string;
    defaultCardUser?: "self" | "other";
    defaultDominantColor?: string;
  }>();
  const isEditMode = fromEdit === "true" && !!editId;
  const hideScanButton = fromExtract === "true" || isEditMode;

  // Load existing card data for edit mode
  useEffect(() => {
    if (isEditMode && editId) {
      const loadCardForEdit = async () => {
        try {
          const cards = await secureGetCards();
          const existingCard = cards.find((c: any) => c.id === editId);
          if (existingCard) {
            // The card data will be passed via params, so we don't need to do anything here
            // The form will be prefilled with the default* parameters
          }
        } catch (error) {
          console.error("Failed to load card for editing:", error);
        }
      };
      loadCardForEdit();
    }
  }, [isEditMode, editId]);

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
  }) => {
    try {
      if (__DEV__) console.log("💾 saveCardLocally - Card number received:", card.cardNumber, "(Length:", card.cardNumber.length, ")");
      // Ensure cardUser defaults to "self" if not specified and detect card type
      const detectedCardType = getCardType(card.cardNumber);

      const cardWithDefaults = {
        ...card,
        cardUser: card.cardUser || "self",
        cardType: detectedCardType || undefined // Auto-detect card type
      };

      // Check for duplicate card numbers (excluding current card in edit mode)
      // Get unmasked cards for proper duplicate detection
      const getUnmaskedCards = async () => {
        try {
          const value = await SecureStore.getItemAsync(STORAGE_KEY_UNMASKED, {
            keychainService: STORAGE_KEY_UNMASKED,
          });
          if (!value) return [];

          const encryptionResult: EncryptionResult = JSON.parse(value);
          const decrypted = await decryptCards(encryptionResult);
          return Array.isArray(decrypted) ? decrypted : [];
        } catch (error) {
          console.error("Failed to get unmasked cards for duplicate check:", error);
          return [];
        }
      };

      const existingCards = await getUnmaskedCards();
      const duplicateCard = existingCards.find((existingCard: any) => {
        // In edit mode, exclude the current card being edited
        if (isEditMode && editId && existingCard.id === editId) {
          return false;
        }
        return existingCard.cardNumber === cardWithDefaults.cardNumber;
      });

      if (duplicateCard) {
        throw new Error("A card with this number already exists");
      }

      if (isEditMode && editId) {
        // Update existing card
        const updatedCards = existingCards.map((c: any) =>
          c.id === editId ? { ...c, ...cardWithDefaults, id: editId } : c
        );
        await setCards(updatedCards);
      } else {
        // Add new card
        await addCard(cardWithDefaults);
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
      } else if (from === "share") {
        // Coming from share screen - go back to share screen with new card selected and force card selection mode
        const params: any = { selectedCardId: card.id, showCardSelection: "true" };
        if (sessionId && receiverPublicKey && expiresAt) {
          params.sessionId = sessionId;
          params.receiverPublicKey = receiverPublicKey;
          params.expiresAt = expiresAt;
        }
        router.replace({
          pathname: "/share-card/share",
          params
        });
      } else {
        // Navigate to home screen for new cards and switch to the correct tab
        router.replace({
          pathname: "/",
          params: { redirectToTab: card.cardUser || "self" }
        });
      }

      // 3️⃣ Show interstitial ad after a short delay (non-blocking)
      // This allows the navigation to complete first
      setTimeout(() => {
        showInterstitialAd(
          () => console.log('Interstitial ad closed'),
          () => console.log('Interstitial ad failed or was skipped'),
          2000 // 2 second timeout for faster UX
        ).catch((error) => {
          console.warn("Failed to show interstitial ad:", error);
        });
      }, 300); // Small delay to ensure navigation completes

    } catch (err) {
      console.error("Failed to save card:", err);
      const errorMessage = err instanceof Error && err.message.includes("already exists")
        ? "A card with this number already exists. Please use a different card."
        : "Failed to save card info. Please try again.";
      setAlertConfig({
        title: "Error",
        message: errorMessage,
        buttons: [{ text: "OK", style: "default", onPress: () => setAlertVisible(false) }]
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
        {!hideScanButton && (
          <>
            <ScanButton onPress={handleScan} />

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
  container: { flex: 1, backgroundColor: "#f2f2f2" },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 160, flexGrow: 1 },
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
