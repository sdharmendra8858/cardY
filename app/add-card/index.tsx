import Hero from "@/components/Hero";
import {
  addCard as secureAddCard
} from "@/utils/secureStorage";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CardForm from "./components/CardForm";
import ScanButton from "./components/ScanButton";

export default function AddCardScreen() {
  const router = useRouter();
  const { defaultCardNumber, defaultCardHolder, defaultExpiry, defaultCvv } = useLocalSearchParams<{
    defaultCardNumber?: string;
    defaultCardHolder?: string;
    defaultExpiry?: string;
    defaultCvv?: string;
  }>();

  const saveCardLocally = async (card: { cardNumber: string; cardHolder: string; expiry: string; cvv: string; infoText: string }) => {
    try {
      await secureAddCard(card as any)
    } catch (error) {
      throw error;
    }
  };

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Add Card" });
  }, [navigation]);

  const handleScan = () => {
    router.push("/add-card/scan");
  };


  const handleManualAdd = (card: { cardNumber: string; cardHolder: string; expiry: string; cvv: string; infoText: string }) => {
    console.log("New card added:", card);
  
    // 1️⃣ Save the card info (you can use AsyncStorage, SQLite, or any state/store)
    saveCardLocally(card)
      .then(() => {
        // 2️⃣ Navigate to home screen after saving
        router.replace("/"); // or router.push("/") if you want back button
      })
      .catch((err) => {
        console.error("Failed to save card:", err);
        alert("Failed to save card info. Please try again.");
      });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Hero 
        title="Add a new Card"
        subtitle="Scan or enter details manually"
        tone="dark"
        surfaceColor="#F2F2F2"
        />
      <View style={styles.content}>
        <ScanButton onPress={handleScan} />

        <CardForm
          onSubmit={handleManualAdd}
          defaultCardNumber={defaultCardNumber}
          defaultCardHolder={defaultCardHolder}
          defaultExpiry={defaultExpiry}
          defaultCvv={defaultCvv}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f2" },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
});