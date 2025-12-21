import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";

export default function ShareCardIndexScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Card Sharing",
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginLeft: 8, padding: 4 }}
        >
          <MaterialIcons name="close" size={24} color={palette.text} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, palette.text, router]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.surface }]}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: palette.card }]}>
            <MaterialIcons name="swap-horiz" size={48} color={palette.tint} />
          </View>

          <ThemedText type="title" style={styles.title}>
            Card Sharing
          </ThemedText>

          <ThemedText style={styles.description}>
            Securely share your cards with others or receive cards from them.
            All sharing is end-to-end encrypted and device-bound.
          </ThemedText>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: palette.card }]}
              onPress={() => router.push("/share-card/receive")}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, { backgroundColor: palette.primary }]}>
                <MaterialIcons name="qr-code-scanner" size={24} color={palette.onPrimary} />
              </View>
              <View style={styles.optionContent}>
                <ThemedText style={styles.optionTitle}>Receive Card</ThemedText>
                <ThemedText style={styles.optionDescription}>
                  Generate a session code to receive a card from someone else
                </ThemedText>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={palette.secondary || "#666"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: palette.card }]}
              onPress={() => router.push("/share-card/share")}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, { backgroundColor: palette.primary }]}>
                <MaterialIcons name="share" size={24} color={palette.onPrimary} />
              </View>
              <View style={styles.optionContent}>
                <ThemedText style={styles.optionTitle}>Share Card</ThemedText>
                <ThemedText style={styles.optionDescription}>
                  Enter a session code to share one of your cards
                </ThemedText>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={palette.secondary || "#666"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, { backgroundColor: palette.card }]}
              onPress={() => router.push("/share-card/import")}
              activeOpacity={0.8}
            >
              <View style={[styles.optionIcon, { backgroundColor: palette.primary }]}>
                <MaterialIcons name="download" size={24} color={palette.onPrimary} />
              </View>
              <View style={styles.optionContent}>
                <ThemedText style={styles.optionTitle}>Import Card</ThemedText>
                <ThemedText style={styles.optionDescription}>
                  Scan a QR code to import a shared card
                </ThemedText>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={palette.secondary || "#666"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.securityNotice}>
            <MaterialIcons name="security" size={20} color={palette.secondary || "#666"} />
            <ThemedText style={styles.securityText}>
              All card sharing is end-to-end encrypted. Cards can only be decrypted on the intended device.
            </ThemedText>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    textAlign: "center",
    marginBottom: 12,
    fontSize: 28,
  },
  description: {
    textAlign: "center",
    fontSize: 16,
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: 40,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
});
