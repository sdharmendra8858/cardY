import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useLayoutEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  const [name, setName] = useState<string>(DEFAULT_PROFILE.name);
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    AVATARS[0]?.id
  );
  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    // Set header title if navigator shows it
  }, []);

  useEffect(() => {
    (async () => {
      const profile = await getProfile();
      setName(profile.name);
      if (profile.avatarId && AVATARS.some((a) => a.id === profile.avatarId)) {
        setSelectedAvatarId(profile.avatarId);
      } else if (profile.avatarUrl) {
        const found = AVATARS.find((a) => a.source === profile.avatarUrl);
        setSelectedAvatarId(found?.id ?? AVATARS[0]?.id);
      } else {
        setSelectedAvatarId(AVATARS[0]?.id);
      }
    })();
  }, []);

  async function onSave() {
    if (saving) return;
    setSaving(true);
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
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const selectedSource =
    AVATARS.find((a) => a.id === selectedAvatarId)?.source ??
    AVATARS[0]?.source;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <View style={styles.previewAvatarWrap}>
            <Image
              source={selectedSource}
              style={styles.previewAvatar}
              contentFit="cover"
            />
          </View>
          <Text style={styles.previewName}>{name || "Your name"}</Text>
        </View>

        <Text style={styles.label}>Display name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Enter your name"
          style={styles.input}
          maxLength={40}
        />

        <Text style={[styles.label, { marginTop: 16 }]}>
          Choose your avatar
        </Text>
        <FlatList
          data={AVATARS}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={{ gap: 12 }}
          renderItem={({ item }: { item: { id: string; source: any } }) => {
            const isSelected = item.id === selectedAvatarId;
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedAvatarId(item.id)}
                style={[
                  styles.avatarWrap,
                  isSelected && styles.avatarWrapSelected,
                ]}
              >
                <Image
                  source={item.source}
                  style={styles.avatar}
                  contentFit="cover"
                />
                {isSelected ? (
                  <View style={styles.check}>
                    <MaterialIcons name="check" size={16} color="#fff" />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.footer}>
          <AppButton
            title={saving ? "Saving..." : "Save"}
            onPress={onSave}
            fullWidth
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f2f2f2" },
  container: { flex: 1, backgroundColor: "#f2f2f2", padding: 16 },
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
    color: "#11181C",
  },
  label: { fontSize: 14, color: "#374151", marginBottom: 8 },
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
