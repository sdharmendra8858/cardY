import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";
import ImportCardScreen from "./import";
import ReceiveCardScreen from "./receive";
import ShareCardScreen from "./share";

type TabType = "receive" | "share" | "import";

export default function ShareCardIndexScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("receive");

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
        {/* Tab Navigation */}
        <View style={[styles.tabBar, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "receive" && [styles.activeTab, { borderBottomColor: palette.primary }]
            ]}
            onPress={() => setActiveTab("receive")}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="qr-code-scanner"
              size={20}
              color={activeTab === "receive" ? palette.primary : palette.secondary || "#666"}
            />
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === "receive" ? palette.primary : palette.secondary || "#666" }
              ]}
            >
              Receive
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "share" && [styles.activeTab, { borderBottomColor: palette.primary }]
            ]}
            onPress={() => setActiveTab("share")}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="share"
              size={20}
              color={activeTab === "share" ? palette.primary : palette.secondary || "#666"}
            />
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === "share" ? palette.primary : palette.secondary || "#666" }
              ]}
            >
              Share
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "import" && [styles.activeTab, { borderBottomColor: palette.primary }]
            ]}
            onPress={() => setActiveTab("import")}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="download"
              size={20}
              color={activeTab === "import" ? palette.primary : palette.secondary || "#666"}
            />
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === "import" ? palette.primary : palette.secondary || "#666" }
              ]}
            >
              Import
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={styles.content}>
          {activeTab === "receive" && <ReceiveCardScreen />}
          {activeTab === "share" && <ShareCardScreen />}
          {activeTab === "import" && <ImportCardScreen />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomWidth: 3,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
});
