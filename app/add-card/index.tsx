import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect } from "react";
import { StyleSheet, Text, View, } from "react-native";
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
      const existing = await AsyncStorage.getItem("cards");
      const cards = existing ? JSON.parse(existing) : [];
      cards.push(card);
      await AsyncStorage.setItem("cards", JSON.stringify(cards));
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
    <View style={styles.container}>
      <Text style={styles.title}>Add a New Card</Text>

      <ScanButton onPress={handleScan} />

      <CardForm
        onSubmit={handleManualAdd}
        defaultCardNumber={defaultCardNumber}
        defaultCardHolder={defaultCardHolder}
        defaultExpiry={defaultExpiry}
        defaultCvv={defaultCvv}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f2f2f2" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
});