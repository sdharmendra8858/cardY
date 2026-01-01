import AdBanner from "@/components/AdBanner";
import InterstitialAd, { showInterstitialAd } from "@/components/InterstitialAd";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  FlatList,
  Keyboard,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppButton from "../../components/AppButton";
import { AVATAR_CATALOG } from "../../constants/avatars";
import { Colors } from "../../constants/theme";
import {
  DEFAULT_PROFILE,
  getProfile,
  setProfile,
} from "../../utils/profileStorage";

const AVATARS = AVATAR_CATALOG;

export default function EditProfileScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const [name, setName] = useState<string>(DEFAULT_PROFILE.name);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    AVATARS[0]?.id
  );
  const [originalAvatarId, setOriginalAvatarId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    // Set header title if navigator shows it
  }, []);

  useEffect(() => {
    (async () => {
      const profile = await getProfile();
      setName(profile.name);
      let avatarId = AVATARS[0]?.id;
      if (profile.avatarId && AVATARS.some((a) => a.id === profile.avatarId)) {
        avatarId = profile.avatarId;
      } else if (profile.avatarUrl) {
        const found = AVATARS.find((a) => a.source === profile.avatarUrl);
        avatarId = found?.id ?? AVATARS[0]?.id;
      }
      setSelectedAvatarId(avatarId);
      setOriginalAvatarId(avatarId); // Store original for comparison
    })();
  }, []);

  // Handle avatar selection - ad is already preloaded on screen mount
  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatarId(avatarId);
    console.log('Avatar selected:', avatarId);
  };

  async function onSave() {
    if (saving) return;
    setSaving(true);

    const avatarChanged = selectedAvatarId !== originalAvatarId;

    try {
      const selected =
        AVATARS.find((a) => a.id === selectedAvatarId) ?? AVATARS[0];
      const avatarUrl =
        typeof selected.source === "string" ? selected.source : undefined;
      await setProfile({
        name: name.trim() || DEFAULT_PROFILE.name,
        avatarId: selected.id,
        avatarUrl,
      });

      // Only show ad if avatar actually changed
      if (avatarChanged) {
        try {
          // Show ad before navigation (blocking)
          await showInterstitialAd(
            () => {
              console.log('Avatar update: Interstitial ad closed, navigating back');
              router.back();
            },
            () => {
              console.log('Avatar update: Interstitial ad failed, navigating back anyway');
              router.back();
            },
            3000 // 3 second timeout for ad loading
          );
        } catch (error) {
          console.warn("Failed to show interstitial ad:", error);
          // Still navigate back even if ad fails
          router.back();
        }
      } else {
        // No avatar change, just navigate back
        router.back();
      }
    } finally {
      setSaving(false);
    }
  }

  const selectedSource =
    AVATARS.find((a) => a.id === selectedAvatarId)?.source ??
    AVATARS[0]?.source;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={[styles.container, { backgroundColor: palette.surface }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="chevron-left" size={32} color={palette.text} />
          </TouchableOpacity>
          <View style={styles.previewContainer}>
            <View style={[styles.previewAvatarWrap, {
              backgroundColor: palette.card,
              borderColor: palette.tint,
              shadowColor: palette.tint
            }]}>
              <Image
                source={selectedSource}
                style={styles.previewAvatar}
                contentFit="cover"
              />
            </View>
            <ThemedText style={styles.previewName}>
              {name || "Your name"}
            </ThemedText>
          </View>

          <ThemedText style={styles.label}>Display name</ThemedText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            style={[
              styles.input,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text
              },
            ]}
            placeholderTextColor={palette.icon}
            maxLength={30}
          />
          <ThemedText style={[styles.characterCount, { color: palette.icon }]}>
            {name.length}/30 characters
          </ThemedText>

          <ThemedText style={[styles.label, { marginTop: 16 }]}>
            Choose your avatar
          </ThemedText>
          <FlatList
            data={AVATARS}
            keyExtractor={(item) => item.id}
            numColumns={3}
            columnWrapperStyle={{ gap: 12 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            renderItem={({ item }: { item: { id: string; source: any } }) => {
              const isSelected = item.id === selectedAvatarId;
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleAvatarSelect(item.id)}
                  style={[
                    styles.avatarWrap,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                    },
                    isSelected && [
                      styles.avatarWrapSelected,
                      { borderColor: palette.tint, shadowColor: palette.tint }
                    ],
                  ]}
                >
                  <Image
                    source={item.source}
                    style={styles.avatar}
                    contentFit="cover"
                  />
                  {isSelected ? (
                    <View style={[styles.check, { backgroundColor: palette.primary }]}>
                      <MaterialIcons
                        name="check"
                        size={16}
                        color={palette.onPrimary}
                      />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />

          <AdBanner />

          <View style={styles.footer}>
            <AppButton
              title={saving ? "Saving..." : "Save"}
              onPress={onSave}
              fullWidth
            />
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Preload interstitial ad on screen mount for faster display */}
      <InterstitialAd />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f2f2f2" },
  container: { flex: 1, backgroundColor: "#f2f2f2", padding: 16 },
  backButton: {
    position: "absolute",
    top: 8,
    left: 8,
    zIndex: 10,
    padding: 4,
  },
  previewContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  previewAvatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  previewAvatar: { width: 112, height: 112, borderRadius: 56 },
  previewName: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "600",
  },
  label: { fontSize: 14, marginBottom: 8 },
  characterCount: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
  },
  avatarWrap: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#e5e7eb",
    position: "relative",
    marginBottom: 12,
  },
  avatarWrapSelected: {
    borderColor: Colors.light.tint,
    shadowColor: Colors.light.tint,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    resizeMode: "cover",
  },
  check: {
    position: "absolute",
    right: 10,
    top: 10,
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    padding: 4,
  },
  footer: { marginTop: "auto" },
});
