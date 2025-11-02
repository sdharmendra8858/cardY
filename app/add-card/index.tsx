import Hero from "@/components/Hero";
import InfoBox from "@/components/InfoBox";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { addCard as secureAddCard } from "@/utils/secureStorage";
import { StackActions, useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { SafeAreaView } from "react-native-safe-area-context";
import CardForm from "./components/CardForm";
import ScanButton from "./components/ScanButton";

export default function AddCardScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  useEffect(() => {
    const unsubscribe = navigation.addListener("state", () => {
      console.log(
        "Current navigation stack:",
        JSON.stringify(navigation.getState(), null, 2)
      );
    });

    // Optional: log immediately
    console.log(
      "Initial navigation state:",
      JSON.stringify(navigation.getState(), null, 2)
    );

    return unsubscribe;
  }, [navigation]);

  const {
    defaultCardNumber,
    defaultCardHolder,
    defaultExpiry,
    defaultCvv,
    fromExtract,
  } = useLocalSearchParams<{
    defaultCardNumber?: string;
    defaultCardHolder?: string;
    defaultExpiry?: string;
    defaultCvv?: string;
    fromExtract?: string;
  }>();
  const hideScanButton = fromExtract === "true";

  const saveCardLocally = async (card: {
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvv: string;
    infoText: string;
  }) => {
    try {
      await secureAddCard(card as any);
    } catch (error) {
      throw error;
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({ title: "Add Card" });
  }, [navigation]);

  const handleScan = () => {
    router.push("/add-card/scan");
  };

  const handleManualAdd = (card: {
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvv: string;
    infoText: string;
  }) => {
    console.log("New card added:", card);

    // 1️⃣ Save the card info (you can use AsyncStorage, SQLite, or any state/store)
    saveCardLocally(card)
      .then(() => {
        // 2️⃣ Navigate to home screen after saving
        navigation.dispatch(StackActions.popToTop());
      })
      .catch((err) => {
        console.error("Failed to save card:", err);
        alert("Failed to save card info. Please try again.");
      });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.surface }]}
      edges={["top", "bottom"]}
    >
      <Hero title="Add a new Card" subtitle="Scan or enter details manually" />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        enableAutomaticScroll
        extraHeight={120}
        extraScrollHeight={120}
        showsVerticalScrollIndicator={false}
      >
        {!hideScanButton ? (
          <>
            <ScanButton onPress={handleScan} />

            <View style={styles.orSeparatorContainer}>
              <View
                style={[styles.line, { backgroundColor: palette.border }]}
              />
              <ThemedText style={styles.orText}>OR</ThemedText>
              <View
                style={[styles.line, { backgroundColor: palette.border }]}
              />
            </View>
          </>
        ) : (
          <InfoBox
            message="⚠️ Please review all details carefully before saving. The scanned information might contain errors."
            type="warning"
            style={{ marginHorizontal: 0 }}
          />
        )}

        <CardForm
          onSubmit={handleManualAdd}
          defaultCardNumber={defaultCardNumber}
          defaultCardHolder={defaultCardHolder}
          defaultExpiry={defaultExpiry}
          defaultCvv={defaultCvv}
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f2" },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 160, flexGrow: 1 },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
  },
  orSeparatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },
  orText: {
    marginHorizontal: 8,
    fontWeight: "bold",
    color: "#666",
  },
});
