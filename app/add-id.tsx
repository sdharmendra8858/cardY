import { showInterstitialAd } from "@/components/AdInterstitial";
import AppButton from "@/components/AppButton";
import Hero from "@/components/Hero";
import UnifiedModal from "@/components/UnifiedModal";
import { ThemedText } from "@/components/themed-text";
import { ID_TYPES } from "@/types/id";
import { ADMOB_CONFIG } from "@/constants/admob";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { processIDImage } from "@/utils/imageProcessor";
import { saveEncryptedImage, saveThumbnail } from "@/utils/idStorage";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import ImageCropPicker from 'react-native-image-crop-picker';
import { useIDs } from "@/context/IDContext";
import { useScreenProtection } from "@/hooks/useScreenProtection";
import { ignoreNextAppOpenAd, setGlobalAdSuppression } from "@/utils/adControl";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState, useEffect } from "react";
import { 
  ActivityIndicator, 
  Image, 
  Pressable, 
  ScrollView, 
  StyleSheet, 
  View,
  TextInput
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AddIDScreen() {
  useScreenProtection();
  const router = useRouter();
  const { addID: contextAddID } = useIDs();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [images, setImages] = useState<{ front: string | null; back: string | null }>({
    front: null,
    back: null,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [activeSlot, setActiveSlot] = useState<'front' | 'back' | null>(null);
  const [customName, setCustomName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const params = useLocalSearchParams<{ recovered?: string }>();

  // Suppress App Open Ads while in this flow
  useEffect(() => {
    setGlobalAdSuppression(true);
    return () => {
      setGlobalAdSuppression(false);
      // Also clear active_flow if we unmount normally (e.g. back button)
      AsyncStorage.removeItem("active_flow").catch(() => {});
    }
  }, []);

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setShowTypePicker(false);
  };

  // Recovery logic for Android process death
  useEffect(() => {
    const recoverState = async () => {
      try {
        const [savedType, savedName, savedNumber, savedSlot, savedImages] = await Promise.all([
          AsyncStorage.getItem("add_id_type"),
          AsyncStorage.getItem("add_id_name"),
          AsyncStorage.getItem("add_id_number"),
          AsyncStorage.getItem("add_id_active_slot"),
          AsyncStorage.getItem("add_id_images"),
        ]);

        if (savedType) setSelectedType(savedType);
        if (savedName) setCustomName(savedName);
        if (savedNumber) setIdNumber(savedNumber);
        if (savedImages) {
          try {
            setImages(JSON.parse(savedImages));
          } catch (e) {
            // Invalid JSON, ignore
          }
        }

        // Get the photo from the pending result
        const result = await ImagePicker.getPendingResultAsync();
        if (result) {
          const results = Array.isArray(result) ? result : [result];
          if (results.length > 0) {
            const lastResult = results[results.length - 1];
            if (!lastResult.canceled && lastResult.assets && lastResult.assets[0]) {
              const slot = (savedSlot as 'front' | 'back') || 'front';
              setImages(prev => ({ ...prev, [slot]: lastResult.assets[0].uri }));
            }
          }
        }
      } catch (err) {
        // Silent recovery fail
      } finally {
        // Clean up recovery storage - BUT DONT CLEAN active_flow yet as it's used by _layout
        AsyncStorage.multiRemove([
          "add_id_type", "add_id_name", "add_id_number", "add_id_active_slot", "add_id_images"
        ]).catch(() => {});
      }
    };

    if (params?.recovered === "true") {
      recoverState();
      // Clear flow marker since we are safely back
      AsyncStorage.removeItem("active_flow").catch(() => {});
    }
  }, [params.recovered]);

  const pickImage = async (useCamera: boolean, slot: 'front' | 'back') => {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        setError(`Permission to access ${useCamera ? "camera" : "gallery"} is required.`);
        return;
      }

      // Suppress App Open Ad when returning from system picker/camera
      ignoreNextAppOpenAd();

      // Save current state to survive process death (mostly for Android)
      await Promise.all([
        AsyncStorage.setItem("add_id_type", selectedType || ""),
        AsyncStorage.setItem("add_id_name", customName),
        AsyncStorage.setItem("add_id_number", idNumber),
        AsyncStorage.setItem("add_id_active_slot", slot),
        AsyncStorage.setItem("add_id_images", JSON.stringify(images)),
        AsyncStorage.setItem("active_flow", "add-id"),
      ]).catch(() => {});

      const pickerOptions = {
        cropping: true,
        width: 1200,
        height: 800,
        freeStyleCropEnabled: true,
        mediaType: 'photo' as const,
        includeBase64: false,
        compressImageQuality: 0.8,
      };

      let image;
      if (useCamera) {
        image = await ImageCropPicker.openCamera(pickerOptions);
      } else {
        image = await ImageCropPicker.openPicker(pickerOptions);
      }

      if (image && image.path) {
        // Ensure the path has the file:// prefix for Expo libraries
        const uri = image.path.startsWith('file://') ? image.path : `file://${image.path}`;
        setImages(prev => ({ ...prev, [slot]: uri }));
        setActiveSlot(null);
      }
      
      // Clear flow marker since we returned normally
      AsyncStorage.removeItem("active_flow").catch(() => {});
    } catch (err) {
      if (err instanceof Error && err.message.includes("User cancelled")) {
        return;
      }
      console.error("Failed to pick image:", err);
      setError("Failed to capture image. Please try again.");
    }
  };

  const handleSave = async () => {
    if (!selectedType || !images.front) return;

    const trimmedIdNumber = idNumber.trim();
    if (trimmedIdNumber.length > 30) {
      setError("ID number cannot exceed 30 characters.");
      setIsProcessing(false);
      return;
    }

    try {
      const docId = Math.random().toString(36).substr(2, 9);
      const assets = [];

      // Process Front image
      const frontProcessed = await processIDImage(images.front);
      const frontEncrypted = await saveEncryptedImage(frontProcessed.original.uri, docId, 'front');
      const frontThumb = await saveThumbnail(frontProcessed.thumbnail.uri, `${docId}_front`);
      
      assets.push({
        id: Math.random().toString(36).substr(2, 9),
        uri: frontEncrypted,
        thumbnailUri: frontThumb,
        width: frontProcessed.original.width,
        height: frontProcessed.original.height,
        size: frontProcessed.original.size || 0,
        createdAt: Date.now(),
      });

      // Process Back image if exists
      if (images.back) {
        const backProcessed = await processIDImage(images.back);
        const backEncrypted = await saveEncryptedImage(backProcessed.original.uri, docId, 'back');
        const backThumb = await saveThumbnail(backProcessed.thumbnail.uri, `${docId}_back`);
        
        assets.push({
          id: Math.random().toString(36).substr(2, 9),
          uri: backEncrypted,
          thumbnailUri: backThumb,
          width: backProcessed.original.width,
          height: backProcessed.original.height,
          size: backProcessed.original.size || 0,
          createdAt: Date.now(),
        });
      }

      // 3. Save to context (which handles storage + state)
      await contextAddID({
        id: docId,
        type: selectedType as any,
        label: selectedType === "Other" && customName.trim() ? customName.trim() : `${selectedType} document`,
        idNumber: idNumber.trim() ? idNumber.trim() : undefined,
        assets,
        createdAt: Date.now(),
      });

      router.dismissAll();
      router.replace({ pathname: "/", params: { viewMode: "ids" } as any });

      // Show interstitial ad after a short delay
      setTimeout(() => {
        showInterstitialAd(
          () => {},
          () => {},
          1500,
          ADMOB_CONFIG.addIdInterstitialUnitId
        ).catch(() => {});
      }, 300);
    } catch (err) {
      console.error("Failed to save ID:", err);
      setError("Failed to securely save ID document. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const ImageSlot = ({ slot, label, isOptional = false }: { slot: 'front' | 'back', label: string, isOptional?: boolean }) => (
    <View style={styles.formSection}>
      <View style={styles.labelRow}>
        <ThemedText type="defaultSemiBold" style={styles.label}>{label}</ThemedText>
        {isOptional && <ThemedText style={styles.optionalLabel}>(Optional)</ThemedText>}
      </View>
      
      {images[slot] ? (
        <View style={styles.previewContainer}>
          <View style={[styles.imageFrame, { borderColor: palette.border }]}>
            <Image source={{ uri: images[slot]! }} style={styles.previewImage} resizeMode="contain" />
            <Pressable 
              style={[styles.removeImageButton, { backgroundColor: palette.danger }]}
              onPress={() => setImages(prev => ({ ...prev, [slot]: null }))}
            >
              <MaterialIcons name="close" size={20} color="white" />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <Pressable 
            style={[styles.actionButton, { backgroundColor: palette.primary }]}
            onPress={() => pickImage(true, slot)}
          >
            <MaterialIcons name="photo-camera" size={24} color="white" />
            <ThemedText style={styles.actionButtonText}>Capture</ThemedText>
          </Pressable>
          
          <Pressable 
            style={[styles.actionButton, { backgroundColor: palette.surface, borderColor: palette.primary, borderWidth: 1 }]}
            onPress={() => pickImage(false, slot)}
          >
            <MaterialIcons name="photo-library" size={24} color={palette.primary} />
            <ThemedText style={[styles.actionButtonText, { color: palette.primary }]}>Upload</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.surface }]} edges={["top", "bottom"]}>
      <Hero 
        title="Add ID Document" 
        subtitle="Securely upload your identification"
        showBackButton={true}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.formSection}>
          <ThemedText type="defaultSemiBold" style={styles.label}>ID Type</ThemedText>
          <Pressable 
            style={[styles.dropdown, { backgroundColor: palette.card, borderColor: palette.border }]}
            onPress={() => setShowTypePicker(true)}
          >
            <ThemedText style={{ color: selectedType ? palette.text : palette.icon }}>
              {selectedType || "Select ID Type"}
            </ThemedText>
            <MaterialIcons name="arrow-drop-down" size={24} color={palette.icon} />
          </Pressable>
        </View>

        {selectedType === "Other" && (
          <View style={styles.formSection}>
            <ThemedText type="defaultSemiBold" style={styles.label}>Custom Name</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: palette.card, borderColor: palette.border, color: palette.text }]}
              placeholder="e.g., Library Card"
              placeholderTextColor={palette.icon}
              value={customName}
              onChangeText={setCustomName}
            />
          </View>
        )}

        <View style={styles.formSection}>
          <View style={styles.labelRow}>
            <ThemedText type="defaultSemiBold" style={styles.label}>ID Number</ThemedText>
            <ThemedText style={styles.optionalLabel}>(Optional)</ThemedText>
          </View>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: palette.card, borderColor: palette.border, color: palette.text },
                idNumber.trim().length > 30 && { borderColor: palette.danger }
              ]}
              placeholder="Enter document number"
              placeholderTextColor={palette.icon}
              value={idNumber}
              onChangeText={setIdNumber}
            />
            <View style={styles.inputFooter}>
              {idNumber.trim().length > 30 && (
                <ThemedText style={[styles.errorText, { color: palette.danger }]}>
                  Maximum 30 characters allowed
                </ThemedText>
              )}
              <ThemedText style={[styles.counter, { color: idNumber.trim().length > 30 ? palette.danger : palette.icon }]}>
                {idNumber.trim().length}/30
              </ThemedText>
            </View>
        </View>

        <ImageSlot slot="front" label="Front Side" />
        <ImageSlot slot="back" label="Back Side" isOptional />

        <View style={styles.footer}>
          <AppButton 
            title={isProcessing ? "Saving..." : "Save Securely"} 
            onPress={handleSave}
            disabled={!selectedType || !images.front || isProcessing}
            fullWidth
          />
        </View>
      </ScrollView>

      {/* ID Type Modal Picker */}
      <UnifiedModal
        visible={showTypePicker}
        title="Select ID Type"
        onRequestClose={() => setShowTypePicker(false)}
        buttons={[{ text: "Cancel", onPress: () => setShowTypePicker(false) }]}
      >
        <ScrollView style={{ maxHeight: 300 }}>
          {ID_TYPES.map((type) => (
            <Pressable 
              key={type}
              style={[styles.modalItem, { borderBottomColor: palette.border }]}
              onPress={() => handleTypeSelect(type)}
            >
              <ThemedText style={styles.modalItemText}>{type}</ThemedText>
              {selectedType === type && <MaterialIcons name="check" size={24} color={palette.primary} />}
            </Pressable>
          ))}
        </ScrollView>
      </UnifiedModal>

      {isProcessing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={palette.primary} />
          <ThemedText style={styles.overlayText}>Encrypting...</ThemedText>
        </View>
      )}

      <UnifiedModal
        visible={!!error}
        title="Error"
        message={error || ""}
        buttons={[{ text: "OK", onPress: () => setError(null) }]}
        onRequestClose={() => setError(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, flexGrow: 1 },
  formSection: { marginBottom: 24 },
  label: { fontSize: 16, marginBottom: 8, color: "#666" },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
  },
  counter: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  dropdown: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  actionButtonText: { fontWeight: "600", fontSize: 14, color: "white" },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  optionalLabel: { fontSize: 12, opacity: 0.5, fontStyle: 'italic' },
  previewContainer: { marginTop: 4 },
  imageFrame: {
    width: "100%",
    aspectRatio: 1.5,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  previewImage: { width: "100%", height: "100%" },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  footer: { marginTop: "auto", paddingBottom: 20 },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalItemText: { fontSize: 17 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  overlayText: { color: "white", marginTop: 16, fontSize: 18, fontWeight: "600" },
});
