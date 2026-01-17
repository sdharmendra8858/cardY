// app/profile/index.tsx
import { ThemedText } from "@/components/themed-text";
import { useThemeController } from "@/context/ThemeContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
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
  const [showSharingInfo, setShowSharingInfo] = useState(false);
  const [sharingTab, setSharingTab] = useState<'receive' | 'share'>('share');

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

        <View style={[styles.menuCard, { backgroundColor: palette.card }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontSize: 16, fontWeight: "700" }}>
                Card Sharing
              </ThemedText>
              <ThemedText style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                Securely share cards with others
              </ThemedText>
            </View>
            <TouchableOpacity
              onPress={() => setShowSharingInfo(true)}
              activeOpacity={0.7}
              style={{
                padding: 8,
              }}
            >
              <MaterialIcons name="info" size={24} color={palette.primary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.themeRow, { marginTop: 12 }]}>
            {([
              {
                id: "receive",
                label: "Receive Card",
                icon: "qr-code-scanner",
                route: "/share-card/receive",
              },
              {
                id: "share",
                label: "Share Card",
                icon: "share",
                route: "/share-card/share",
              },
              {
                id: "import",
                label: "Import Card",
                icon: "download",
                route: "/share-card/import",
              }
            ] as const).map((option) => (
              <TouchableOpacity
                key={option.id}
                accessibilityRole="button"
                onPress={() => router.push(option.route)}
                activeOpacity={0.85}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
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
                      backgroundColor: scheme === "dark"
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(0,0,0,0.06)",
                      marginBottom: 6,
                    }}
                  >
                    <MaterialIcons
                      name={option.icon as any}
                      size={18}
                      color={palette.tint}
                    />
                  </View>
                  <ThemedText
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: palette.text,
                    }}
                  >
                    {option.label}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Modal
        visible={showSharingInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSharingInfo(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Dismiss on outside tap */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowSharingInfo(false)}
          />

          {/* Modal Content */}
          <View
            style={[
              styles.modalContent,
              { backgroundColor: palette.surface }
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Card Sharing Guide</ThemedText>
              <TouchableOpacity
                onPress={() => setShowSharingInfo(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color={palette.text} />
              </TouchableOpacity>
            </View>

            {/* Tab Navigation */}
            <View style={[styles.tabContainer, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
              {(['receive', 'share'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setSharingTab(tab)}
                  style={[
                    styles.tab,
                    sharingTab === tab && { borderBottomColor: palette.primary, borderBottomWidth: 3 }
                  ]}
                >
                  <MaterialIcons
                    name={tab === 'receive' ? 'qr-code-scanner' : 'share'}
                    size={18}
                    color={sharingTab === tab ? palette.primary : palette.secondary}
                  />
                  <ThemedText style={[styles.tabLabel, { color: sharingTab === tab ? palette.primary : palette.secondary }]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {sharingTab === 'receive' && (
                <View>
                  <ThemedText style={styles.flowTitle}>Receive a Card</ThemedText>
                  <ThemedText style={styles.flowSubtitle}>Complete 3-step process to securely receive a card</ThemedText>

                  <View style={styles.flowDiagram}>
                    {/* Step 1 */}
                    <View style={[styles.flowStepContainer, { backgroundColor: palette.primary + '15', borderColor: palette.primary }]}>
                      <View style={[styles.flowStepNumber, { backgroundColor: palette.primary }]}>
                        <ThemedText style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>1</ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.flowStepTitle}>Generate Your QR Code</ThemedText>
                        <ThemedText style={styles.flowStepDesc}>Tap "Receive Card" to create your unique session QR code. This code expires in 5 minutes.</ThemedText>
                      </View>
                    </View>

                    <View style={[styles.flowConnector, { backgroundColor: palette.primary }]} />

                    {/* Step 2 */}
                    <View style={[styles.flowStepContainer, { backgroundColor: palette.primary + '15', borderColor: palette.primary }]}>
                      <View style={[styles.flowStepNumber, { backgroundColor: palette.primary }]}>
                        <ThemedText style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>2</ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.flowStepTitle}>Share Your QR Code</ThemedText>
                        <ThemedText style={styles.flowStepDesc}>Show your QR code to the person who wants to share their card with you.</ThemedText>
                      </View>
                    </View>

                    <View style={[styles.flowConnector, { backgroundColor: palette.primary }]} />

                    {/* Step 3 */}
                    <View style={[styles.flowStepContainer, { backgroundColor: palette.primary + '15', borderColor: palette.primary }]}>
                      <View style={[styles.flowStepNumber, { backgroundColor: palette.primary }]}>
                        <ThemedText style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>3</ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.flowStepTitle}>Scan Their Card QR</ThemedText>
                        <ThemedText style={styles.flowStepDesc}>Once they generate their encrypted card QR, tap "Scan Sender's QR Code" to import their card.</ThemedText>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setShowSharingInfo(false);
                      router.push('/share-card/receive');
                    }}
                    style={[styles.redirectButton, { backgroundColor: palette.primary }]}
                  >
                    <MaterialIcons name="qr-code" size={20} color="#ffffff" />
                    <ThemedText style={{ color: '#ffffff', fontWeight: '600', fontSize: 14, marginLeft: 8 }}>
                      Start Receiving
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              {sharingTab === 'share' && (
                <View>
                  <ThemedText style={styles.flowTitle}>Share a Card</ThemedText>
                  <ThemedText style={styles.flowSubtitle}>Complete 4-step process to securely share your card</ThemedText>

                  <View style={styles.flowDiagram}>
                    {/* Step 1 */}
                    <View style={[styles.flowStepContainer, { backgroundColor: palette.primary + '15', borderColor: palette.primary }]}>
                      <View style={[styles.flowStepNumber, { backgroundColor: palette.primary }]}>
                        <ThemedText style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>1</ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.flowStepTitle}>Scan Receiver's QR</ThemedText>
                        <ThemedText style={styles.flowStepDesc}>Tap "Share Card" and scan the receiver's session QR code to establish a secure connection.</ThemedText>
                      </View>
                    </View>

                    <View style={[styles.flowConnector, { backgroundColor: palette.primary }]} />

                    {/* Step 2 */}
                    <View style={[styles.flowStepContainer, { backgroundColor: palette.primary + '15', borderColor: palette.primary }]}>
                      <View style={[styles.flowStepNumber, { backgroundColor: palette.primary }]}>
                        <ThemedText style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>2</ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.flowStepTitle}>Select Your Card</ThemedText>
                        <ThemedText style={styles.flowStepDesc}>Choose which card you want to share from your collection.</ThemedText>
                      </View>
                    </View>

                    <View style={[styles.flowConnector, { backgroundColor: palette.primary }]} />

                    {/* Step 3 */}
                    <View style={[styles.flowStepContainer, { backgroundColor: palette.primary + '15', borderColor: palette.primary }]}>
                      <View style={[styles.flowStepNumber, { backgroundColor: palette.primary }]}>
                        <ThemedText style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>3</ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.flowStepTitle}>Set Expiry Time</ThemedText>
                        <ThemedText style={styles.flowStepDesc}>Choose how long the card will stay on their device (15m, 1h, 1d, or forever).</ThemedText>
                      </View>
                    </View>

                    <View style={[styles.flowConnector, { backgroundColor: palette.primary }]} />

                    {/* Step 4 */}
                    <View style={[styles.flowStepContainer, { backgroundColor: palette.primary + '15', borderColor: palette.primary }]}>
                      <View style={[styles.flowStepNumber, { backgroundColor: palette.primary }]}>
                        <ThemedText style={{ color: '#ffffff', fontWeight: '700', fontSize: 16 }}>4</ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.flowStepTitle}>Generate & Share QR</ThemedText>
                        <ThemedText style={styles.flowStepDesc}>Tap "Generate Secure QR" and show the encrypted QR code to the receiver to import your card.</ThemedText>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => {
                      setShowSharingInfo(false);
                      router.push('/share-card/share');
                    }}
                    style={[styles.redirectButton, { backgroundColor: palette.primary }]}
                  >
                    <MaterialIcons name="share" size={20} color="#ffffff" />
                    <ThemedText style={{ color: '#ffffff', fontWeight: '600', fontSize: 14, marginLeft: 8 }}>
                      Start Sharing
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.infoBox, { backgroundColor: palette.primary + '15', borderColor: palette.primary, marginBottom: 24 }]}>
                <MaterialIcons name="security" size={20} color={palette.primary} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <ThemedText style={{ fontWeight: '600', marginBottom: 4 }}>Security</ThemedText>
                  <ThemedText style={{ fontSize: 12, opacity: 0.8 }}>
                    All card data is encrypted end-to-end. CVV is never shared. Cards auto-expire based on your settings.
                  </ThemedText>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={() => setShowSharingInfo(false)}
              style={[styles.closeModalButton, { backgroundColor: palette.primary }]}
            >
              <ThemedText style={{ color: palette.onPrimary, fontWeight: '600', fontSize: 16 }}>
                Got it
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    maxHeight: "85%",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
    flexShrink: 0,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    opacity: 0.7,
    lineHeight: 18,
  },
  infoBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 16,
  },
  closeModalButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 0,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  flowTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  flowSubtitle: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 20,
  },
  flowDiagram: {
    marginBottom: 24,
  },
  flowStepContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 12,
  },
  flowStepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  flowConnector: {
    height: 24,
    width: 2,
    alignSelf: 'center',
    marginVertical: 4,
    marginBottom: 8,
  },
  flowStep: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  flowIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  flowStepTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  flowStepDesc: {
    fontSize: 12,
    opacity: 0.7,
    lineHeight: 16,
  },
  flowArrow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  redirectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 16,
  },
});
