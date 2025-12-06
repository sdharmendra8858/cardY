import Hero from "@/components/Hero";
import InfoBox from "@/components/InfoBox";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { addCard as secureAddCard } from "@/utils/secureStorage";
import { StackActions, useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system/legacy";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import CardForm from "./components/CardForm";
import ScanButton from "./components/ScanButton";

export default function AddCardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

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
  } = useLocalSearchParams<{
    defaultCardNumber?: string;
    defaultCardHolder?: string;
    defaultExpiry?: string;
    defaultCvv?: string;
    fromExtract?: string;
  }>();
  const hideScanButton = fromExtract === "true";

  const saveCardLocally = async (card: {
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvv: string;
    infoText: string;
  }) => {
    try {
      // Save card first
      await secureAddCard(card as any);
      // Only clean up images after successful save
      await clearImageDump();
    } catch (error) {
      throw error;
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Add Card" });
  }, [navigation]);

  const handleScan = () => {
    router.push("/add-card/scan");
  };

  const handleManualAdd = (card: {
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvv: string;
    infoText: string;
  }) => {
    // 1️⃣ Save the card info (you can use AsyncStorage, SQLite, or any state/store)
    saveCardLocally(card)
      .then(() => {
        // 2️⃣ Navigate to home screen after saving
        navigation.dispatch(StackActions.popToTop());
      })
      .catch((err) => {
        console.error("Failed to save card:", err);
        alert("Failed to save card info. Please try again.");
      });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.surface }]}
      edges={["top", "bottom"]}
    >
      <Hero title="Add a new Card" subtitle="Scan or enter details manually" showBackButton={true} />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraHeight={120}
        extraScrollHeight={120}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        {!hideScanButton ? (
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
        ) : (
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
        />
      </KeyboardAwareScrollView>
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
