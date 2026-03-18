import { showInterstitialAd } from "@/components/AdInterstitial";
import NativeAd from "@/components/AdNative";
import AppButton from "@/components/AppButton";
import DecryptLoader from "@/components/DecryptLoader";
import Hero from "@/components/Hero";
import UnifiedModal from "@/components/UnifiedModal";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useAlert } from "@/context/AlertContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useQuota } from "@/hooks/useQuota";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import { IDDocument } from "@/types/id";
import { formatDate } from "@/utils/date";
import { decryptImageToTemp, deleteID, getIDs } from "@/utils/idStorage";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  ViewToken
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Share from "react-native-share";
import Toast from "react-native-toast-message";

export default function IDDetailsScreen() {
  useScreenProtection();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isQuotaExceeded, incrementViews, loading: quotaLoading } = useQuota('id');
  const { showAlert } = useAlert();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  const [idDoc, setIdDoc] = useState<IDDocument | null>(null);
  const [decryptedUris, setDecryptedUris] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();
  // Image container should be slightly smaller than screen width
  const IMAGE_WIDTH = width - 32;

  const viewProcessedRef = React.useRef(false);

  useEffect(() => {
    viewProcessedRef.current = false;
  }, [id]);

  const fetchIDAndDecrypt = useCallback(async () => {
    if (!id) return;
    // Wait for quota to load
    if (quotaLoading || viewProcessedRef.current) return;

    viewProcessedRef.current = true;
    setIsLoading(true);
    try {
      // 0. Check Quota System
      if (isQuotaExceeded) {
        await showInterstitialAd();
      }

      // 1. Authenticate first if needed
      const { authenticateUser } = await import("@/utils/LockScreen");
      const ok = await authenticateUser("id");
      if (!ok) {
        router.back();
        return;
      }
      setIsAuthenticated(true);

      // 2. Fetch and decrypt
      const allIDs = await getIDs();
      const doc = allIDs.find(d => d.id === id);

      if (!doc) {
        setError("ID document not found.");
        return;
      }

      setIdDoc(doc);

      // Decrypt all assets to temp files
      const uris = await Promise.all(
        doc.assets.map(asset => decryptImageToTemp(asset.uri))
      );

      const successfulUris = uris.filter((uri): uri is string => uri !== null);

      if (successfulUris.length === 0 && doc.assets.length > 0) {
        setError("This ID document was stored using an older version of the app and is no longer available. Please delete and re-add it.");
      } else {
        setDecryptedUris(successfulUris);
        await incrementViews();
      }
    } catch (err) {
      console.error("Failed to fetch/decrypt ID:", err);
      setError("Failed to securely load ID document.");
    } finally {
      setIsLoading(false);
    }
  }, [id, router, quotaLoading, isQuotaExceeded, incrementViews]);

  useEffect(() => {
    fetchIDAndDecrypt();
  }, [fetchIDAndDecrypt]);

  const copyToClipboard = async () => {
    if (idDoc?.idNumber) {
      await Clipboard.setStringAsync(idDoc.idNumber);
      Toast.show({
        type: "success",
        text1: "Copied!",
        text2: "ID number copied to clipboard",
        position: "bottom",
      });
    }
  };

  const handleShare = async () => {
    if (!decryptedUris.length) return;
    try {
      const playStoreLink = "https://play.google.com/store/apps/details?id=com.redonelabs.cardywall";
      const message = `Securely shared via Cardy Wall. Get the app to store your IDs safely!\nDownload here: ${playStoreLink}`;
      await Share.open({
        url: decryptedUris[activeIndex],
        message: message,
        title: "Share ID Document",
        failOnCancel: false,
      });
    } catch (err) {
      console.log("Share skipped/failed", err);
    }
  };

  const handleDownload = async () => {
    console.log("📥 handleDownload triggered, activeIndex:", activeIndex);

    if (!decryptedUris.length) {
      console.warn("⚠️ No decrypted URIs available");
      Alert.alert("Error", "No Image available to download.");
      return;
    }

    try {
      const sourceUri = decryptedUris[activeIndex];

      // 1. Request permissions (MediaLibrary)
      const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
      if (mediaStatus !== 'granted') {
        Alert.alert("Permission Required", "Gallery access is required to save the image. Please enable it in settings.");
        return;
      }

      // 2. Request permissions (Notifications)
      const { status: notifyStatus } = await Notifications.requestPermissionsAsync();

      // 3. Save to Gallery
      const asset = await MediaLibrary.createAssetAsync(sourceUri);

      // 4. Trigger OS Notification (Android drawer)
      if (notifyStatus === 'granted') {
        await Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Download Complete",
            body: "The ID document has been saved to your gallery.",
            data: { id, assetId: asset.id },
          },
          trigger: null, // immediate
        });
      }

      Toast.show({
        type: "success",
        text1: "Saved to Gallery",
        text2: "The image has been saved to your device.",
        position: "bottom",
      });
    } catch (err) {
      console.error("❌ Download Error:", err);
      Alert.alert("Download Error", err instanceof Error ? err.message : "An unexpected error occurred while saving.");
    }
  };

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index);
    }
  }, []);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const handleDelete = () => {
    showAlert({
      title: "Delete ID",
      message: "Are you sure you want to permanently delete this ID document?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteID(id as string);
              router.back();
            } catch (err) {
              setError("Failed to delete ID document.");
            }
          }
        }
      ]
    });
  };

  if (isLoading) {
    return <DecryptLoader />;
  }

  if (error || !idDoc) {
    return (
      <View style={[styles.center, { backgroundColor: palette.surface }]}>
        <ThemedText style={{ textAlign: "center", color: palette.danger, marginBottom: 20 }}>
          {error || "Something went wrong"}
        </ThemedText>
        <View style={{ gap: 12, width: '100%' }}>
          <AppButton title="Go Back" onPress={() => router.back()} />
          {idDoc && (
            <AppButton
              title="Delete Broken ID"
              variant="secondary"
              onPress={handleDelete}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.surface }]}>
      <Hero
        title="ID Details"
        subtitle="Secure View"
        showBackButton
        onBack={() => router.replace("/")}
      />

      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* 1. Document Title Section */}
          <View style={[styles.headerSection, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" style={styles.docLabel}>
                {idDoc.label || idDoc.type}
              </ThemedText>
              {idDoc.idNumber && (
                <View style={styles.idNumberContainer}>
                  <ThemedText style={styles.docNumber}>
                    ID: {idDoc.idNumber}
                  </ThemedText>
                  <Pressable
                    onPress={copyToClipboard}
                    style={({ pressed }) => [
                      styles.copyButton,
                      pressed && { opacity: 0.5 },
                    ]}
                    hitSlop={10}
                  >
                    <MaterialIcons name="content-copy" size={16} color={palette.primary} />
                  </Pressable>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={handleDownload}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <MaterialIcons name="download" size={20} color={palette.primary} />
              </Pressable>

              <Pressable
                onPress={handleShare}
                style={({ pressed }) => [
                  styles.iconButton,
                  { backgroundColor: palette.card, borderColor: palette.border },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <MaterialIcons name="share" size={20} color={palette.primary} />
              </Pressable>
            </View>
          </View>

          {/* 2. Document Preview Section */}
          <View style={styles.cardContainerWrapper}>
            <View style={styles.imageSection}>
              <FlatList
                data={decryptedUris}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                snapToInterval={width} // Snap to full screen width (handles padding natively)
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                renderItem={({ item: uri }) => (
                  <View style={{ width: width, paddingHorizontal: 16, alignItems: 'center' }}>
                    <Pressable
                      onPress={() => setSelectedImage(uri)}
                      style={({ pressed }) => [
                        styles.imageContainer,
                        { width: IMAGE_WIDTH },
                        { borderColor: palette.border, shadowColor: "#000" },
                        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
                      ]}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.image}
                        contentFit="contain"
                        transition={200}
                      />
                      <View style={[styles.scanOverlay, { borderTopColor: palette.primary }]} />
                      <View style={styles.zoomIconOverlay}>
                        <MaterialIcons name="zoom-out-map" size={20} color="white" />
                      </View>
                    </Pressable>
                  </View>
                )}
              />
              {/* Pagination Dots */}
              {decryptedUris.length > 1 && (
                <View style={styles.paginationContainer}>
                  {decryptedUris.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.dot,
                        activeIndex === i
                          ? [styles.activeDot, { backgroundColor: palette.primary }]
                          : [styles.inactiveDot, { backgroundColor: palette.icon }]
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>
            <ThemedText style={styles.flipHint}>
              <MaterialIcons name="security" size={14} color={palette.text} /> Securely Decrypted for View
            </ThemedText>
          </View>

          {/* 3. Info Section (Date & Metadata) */}
          <View style={[styles.summaryContainer, { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 }]}>
            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <MaterialIcons name="calendar-today" size={18} color={palette.icon} />
                <View style={styles.metadataText}>
                  <ThemedText style={styles.metadataLabel}>Date Added</ThemedText>
                  <ThemedText style={styles.metadataValue}>
                    {formatDate(idDoc.createdAt)}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.metadataItem}>
                <MaterialIcons name="lock-outline" size={18} color={palette.icon} />
                <View style={styles.metadataText}>
                  <ThemedText style={styles.metadataLabel}>Encryption</ThemedText>
                  <ThemedText style={styles.metadataValue}>AES-256</ThemedText>
                </View>
              </View>
            </View>

            <View style={[styles.metadataDivider, { backgroundColor: palette.border }]} />

            <View style={styles.metadataRow}>
              <View style={styles.metadataItem}>
                <MaterialIcons name="sd-storage" size={18} color={palette.icon} />
                <View style={styles.metadataText}>
                  <ThemedText style={styles.metadataLabel}>Storage</ThemedText>
                  <ThemedText style={styles.metadataValue}>Local Only</ThemedText>
                </View>
              </View>
              <View style={styles.metadataItem}>
                <MaterialIcons name="fingerprint" size={18} color={palette.icon} />
                <View style={styles.metadataText}>
                  <ThemedText style={styles.metadataLabel}>Security</ThemedText>
                  <ThemedText style={styles.metadataValue}>Biometric</ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* 4. Actions: Full-width dashed delete button */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.deleteButton, { borderColor: `${palette.danger}40` }]}
              onPress={handleDelete}
            >
              <MaterialIcons name="delete-outline" size={22} color={palette.danger} />
              <ThemedText style={[styles.deleteText, { color: palette.danger }]}>Remove from Vault</ThemedText>
            </Pressable>
          </View>

          <ThemedText style={styles.note}>Unique Document ID: {id}</ThemedText>
          <NativeAd />
        </ScrollView>
      </View>

      <UnifiedModal
        visible={!!error}
        title="Error"
        message={error || ""}
        buttons={[
          { text: "OK", onPress: () => setError(null) }
        ]}
        onRequestClose={() => setError(null)}
      />

      {/* Full Screen Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.fullScreenContainer}>
          <Pressable
            style={styles.fullScreenClose}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close-circle" size={40} color="white" />
          </Pressable>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullScreenImage}
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  contentContainer: { flex: 1 },
  // Remove horizontal padding from ScrollView so FlatList can stretch full width
  scrollContent: { paddingTop: 16, paddingBottom: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  loadingText: { marginTop: 12, fontSize: 16 },
  cardContainerWrapper: { marginBottom: 32, alignItems: "center" },
  imageSection: { width: '100%' },
  imageGrid: { gap: 20 },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
  },
  inactiveDot: {
    width: 8,
    opacity: 0.3,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    elevation: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  image: { width: "100%", height: "100%" },
  zoomIconOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 6,
  },
  scanOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    borderTopWidth: 2,
    opacity: 0.3,
  },
  flipHint: { marginTop: 12, fontSize: 12, opacity: 0.5, textAlign: "center" },
  headerSection: {
    marginBottom: 24,
    paddingHorizontal: 20 // Added back padding since it was removed from scrollContent
  },
  docLabel: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4
  },
  idNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  docNumber: {
    fontSize: 16,
    opacity: 0.7,
  },
  copyButton: {
    marginLeft: 8,
    padding: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryContainer: {
    marginHorizontal: 16, // Adjusted from 4 to 16 since ScrollView padding removed
    padding: 20,
    borderRadius: 16,
    marginBottom: 24
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  metadataItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  metadataText: {
    flex: 1
  },
  metadataLabel: {
    fontSize: 10,
    opacity: 0.6,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: '700'
  },
  metadataDivider: {
    height: 1,
    marginVertical: 16,
    opacity: 0.5
  },
  actions: {
    marginTop: 8,
    paddingBottom: 40,
    paddingHorizontal: 16 // Added padding since ScrollView padding was removed
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: 10,
  },
  deleteText: {
    fontWeight: "700",
    fontSize: 15
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 50,
    right: 30,
    zIndex: 10,
  },
  note: { fontSize: 10, textAlign: "center", marginTop: 32, opacity: 0.3 },
});
