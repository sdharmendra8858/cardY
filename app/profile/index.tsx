// app/profile/index.tsx
import AdBanner from "@/components/AdBanner";
import { ThemedText } from "@/components/themed-text";
import { useThemeController } from "@/context/ThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAvatarById } from "../../constants/avatars";
import { Colors } from "../../constants/theme";
import { DEFAULT_PROFILE, getProfile } from "../../utils/profileStorage";

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const { override, setOverride } = useThemeController();
  const [name, setName] = useState<string>(DEFAULT_PROFILE.name);
  const [avatarSource, setAvatarSource] = useState<any>(
    (DEFAULT_PROFILE.avatarId && getAvatarById(DEFAULT_PROFILE.avatarId)) ||
    DEFAULT_PROFILE.avatarUrl
  );

  const navigation = useNavigation();
  const router = useRouter();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Profile" });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        const profile = await getProfile();
        if (isActive) {
          setName(profile.name);
          const resolved = profile.avatarId
            ? getAvatarById(profile.avatarId)
            : undefined;
          setAvatarSource(
            resolved || profile.avatarUrl || DEFAULT_PROFILE.avatarUrl
          );
        }
      })();
      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <View style={{ flex: 1 }}>
        <View style={styles.profileHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="chevron-left" size={32} color={palette.text} />
          </TouchableOpacity>
          <View style={styles.avatarContainer}>
            <Image
              source={avatarSource}
              style={styles.avatar}
              contentFit="cover"
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: "/profile/edit" })}
              style={[styles.editIcon, { backgroundColor: palette.tint }]}
            >
              <MaterialIcons name="edit" size={18} color={palette.onPrimary} />
            </TouchableOpacity>
          </View>
          <ThemedText type="title" style={styles.name}>
            {name}
          </ThemedText>
        </View>

        <View style={[styles.menuCard, { backgroundColor: palette.card }]}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push("/settings")}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="settings" size={22} color={palette.tint} />
              <ThemedText style={styles.menuText}>Settings</ThemedText>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={scheme === "dark" ? "#666" : "#bbb"}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity
            style={styles.menuRow}
            activeOpacity={0.7}
            onPress={() => router.push("/support")}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons
                name="support-agent"
                size={22}
                color={palette.tint}
              />
              <ThemedText style={styles.menuText}>Support</ThemedText>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={scheme === "dark" ? "#666" : "#bbb"}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push({ pathname: "/settings/TermsScreen" })}
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="description" size={22} color={palette.tint} />
              <ThemedText style={styles.menuText}>Terms & Conditions</ThemedText>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={scheme === "dark" ? "#666" : "#bbb"}
            />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() =>
              router.push({ pathname: "/settings/PrivacyPolicyScreen" })
            }
          >
            <View style={styles.menuLeft}>
              <MaterialIcons name="gavel" size={22} color={palette.tint} />
              <ThemedText style={styles.menuText}>Legal & Privacy</ThemedText>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={scheme === "dark" ? "#666" : "#bbb"}
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.menuCard, { backgroundColor: palette.card }]}>
          <ThemedText style={{ fontSize: 16, fontWeight: "700" }}>
            Appearance
          </ThemedText>
          <ThemedText style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
            Choose how Cardy Wall looks
          </ThemedText>
          <View style={[styles.themeRow, { marginTop: 12 }]}>
            {[
              {
                id: "system",
                label: "System",
                value: null,
                icon: "phone-android",
              },
              {
                id: "light",
                label: "Light",
                value: "light",
                icon: "brightness-7",
              },
              {
                id: "dark",
                label: "Dark",
                value: "dark",
                icon: "brightness-4",
              }
            ].map((opt) => {
              const selected = (override ?? "system") === (opt.value ?? "system");
              const iconColor = selected ? palette.onPrimary : palette.tint;
              return (
                <TouchableOpacity
                  key={opt.id}
                  accessibilityRole="button"
                  onPress={() => setOverride(opt.value as any)}
                  activeOpacity={0.85}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: selected
                        ? palette.primary
                        : palette.surface,
                      borderColor: selected ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <View style={styles.themeOptionInner}>
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: selected
                          ? "rgba(255,255,255,0.2)"
                          : scheme === "dark"
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.06)",
                        marginBottom: 6,
                      }}
                    >
                      <MaterialIcons
                        name={opt.icon as any}
                        size={18}
                        color={iconColor}
                      />
                    </View>
                    <ThemedText
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: selected ? palette.onPrimary : palette.text,
                      }}
                    >
                      {opt.label}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f2f2f2" },
  profileHeader: {
    alignItems: "center",
    marginVertical: 16,
    padding: 0,
    backgroundColor: "transparent",
    borderRadius: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
  },
  avatarContainer: {
    width: 128,
    height: 128,
    marginBottom: 16,
    position: "relative",
    backgroundColor: "#eaf6ff",
    borderRadius: 64,
    padding: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  editIcon: {
    position: "absolute",
    right: 6,
    bottom: 6,
    backgroundColor: Colors.light.tint,
    borderRadius: 14,
    padding: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  name: { fontSize: 24, fontWeight: "bold" },
  menuCard: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuText: { fontSize: 16 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#e5e5e5" },
  themeRow: {
    flexDirection: "row",
    gap: 10,
    paddingBottom: 8,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
  },
  themeOptionInner: { alignItems: "center", justifyContent: "center" },
  backButton: {
    position: "absolute",
    top: 0,
    left: 8,
    zIndex: 10,
    padding: 4,
  },
});
