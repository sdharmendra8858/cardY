import Hero from "@/components/Hero";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation, useRouter } from "expo-router";

import React, { useLayoutEffect } from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SupportScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Support" });
  }, [navigation]);

  const openEmail = () => {
    const email = "support@cardy.app";
    const subject = encodeURIComponent("Support request for Cardy");
    const body = encodeURIComponent("Hello Cardy team,\n\n");
    Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  const openWebsite = () => {
    router.push("/website");
  };

  const openFeedback = () => {
    const email = "support@cardy.app";
    const subject = encodeURIComponent("Feedback for Cardy");
    Linking.openURL(`mailto:${email}?subject=${subject}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Hero
        title="Support"
        subtitle="We’re here to help"
        tone="dark"
        surfaceColor="#F2F2F2"
      />
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={openEmail}>
              <View style={styles.left}>
                <MaterialIcons name="email" size={22} color="#111" />
                <Text style={styles.label}>Email: support@cardy.app</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#999" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} onPress={openFeedback}>
              <View style={styles.left}>
                <MaterialIcons name="rate-review" size={22} color="#111" />
                <Text style={styles.label}>Send Feedback</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#999" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.row} onPress={openWebsite}>
              <View style={styles.left}>
                <MaterialIcons name="public" size={22} color="#111" />
                <Text style={styles.label}>Visit Website</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#999" />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.version}>Version 1.0.3</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#f2f2f2",
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subtitle: { fontSize: 14, opacity: 0.7, marginBottom: 16 },
  card: {
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { fontSize: 14 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: "#e5e5e5" },
  footer: { alignItems: "center", marginTop: 10 },
  version: { fontSize: 12, opacity: 0.6 },
});
