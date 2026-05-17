import { ThemedText } from "@/components/themed-text";
import { useBilling } from "@/context/BillingContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../../constants/theme";

export default function SubscriptionScreen() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const navigation = useNavigation();
  const router = useRouter();
  const { isPremium, subscriptions, requestPurchase, restorePurchases, loading: billingLoading } = useBilling();

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Subscription & Billing" });
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.surface }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="chevron-left" size={32} color={palette.text} />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>
          Premium
        </ThemedText>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: isPremium ? palette.primary : "transparent", borderWidth: isPremium ? 1 : 0 }]}>
          <View style={[styles.row, { marginBottom: 16 }]}>
            <ThemedText style={{ fontSize: 18, fontWeight: "700" }}>
              Your Plan
            </ThemedText>
            {isPremium && (
              <View style={{ backgroundColor: palette.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <ThemedText style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>ACTIVE</ThemedText>
              </View>
            )}
          </View>

          {billingLoading ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator color={palette.primary} size="large" />
              <ThemedText style={{ marginTop: 12, fontSize: 14, opacity: 0.6 }}>Loading secure plans...</ThemedText>
            </View>
          ) : isPremium ? (
            <View>
              <ThemedText style={{ fontSize: 15, opacity: 0.8, marginBottom: 24, lineHeight: 22 }}>
                You currently have unlimited ad-free access to Cardy Wall. Thank you for supporting our mission to provide secure, offline-first digital wallets!
              </ThemedText>
              <TouchableOpacity
                onPress={() => {
                  const url = Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions';
                  Linking.openURL(url);
                }}
                style={{ backgroundColor: palette.primary + '15', borderRadius: 12, padding: 16, alignItems: 'center' }}
              >
                <ThemedText style={{ color: palette.primary, fontWeight: 'bold', fontSize: 16 }}>Manage Subscription</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <ThemedText style={{ fontSize: 15, opacity: 0.8, marginBottom: 24, lineHeight: 22 }}>
                Upgrade to Premium to permanently bypass all advertisements and daily view limits across the entire app.
              </ThemedText>
              
              {subscriptions.length > 0 ? (subscriptions as any[]).map((sub: any, index: number) => (
                <TouchableOpacity
                  key={sub.productId}
                  onPress={() => requestPurchase(sub.productId)}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: palette.surface,
                    padding: 16,
                    borderRadius: 16,
                    marginBottom: index === subscriptions.length - 1 ? 0 : 12,
                    borderWidth: 2,
                    borderColor: palette.primary + '30'
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 16 }}>
                    <ThemedText style={{ fontWeight: '700', fontSize: 16 }}>{sub.title.replace(/\([^()]*\)/g, '') || (sub.productId.includes('monthly') ? 'Monthly Plan' : 'Half-Yearly Plan')}</ThemedText>
                    <ThemedText style={{ fontSize: 13, opacity: 0.6, marginTop: 4 }}>{sub.description || 'Unlimited ad-free access'}</ThemedText>
                  </View>
                  <ThemedText style={{ fontWeight: '900', fontSize: 18, color: palette.primary }}>
                    {sub.localizedPrice}
                  </ThemedText>
                </TouchableOpacity>
              )) : (
                <View style={{ padding: 24, backgroundColor: palette.surface, borderRadius: 16, alignItems: 'center' }}>
                  <MaterialIcons name="cloud-off" size={32} color={palette.tint} style={{ opacity: 0.5, marginBottom: 12 }} />
                  <ThemedText style={{ fontSize: 14, opacity: 0.5, textAlign: 'center' }}>Plans are currently unavailable. Please check your internet connection and try again.</ThemedText>
                </View>
              )}

              <TouchableOpacity onPress={restorePurchases} style={{ marginTop: 24, alignItems: 'center', padding: 12 }}>
                <ThemedText style={{ fontSize: 14, color: palette.tint, textDecorationLine: 'underline', fontWeight: '500' }}>Restore Previous Purchases</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: "bold" },
  card: {
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
