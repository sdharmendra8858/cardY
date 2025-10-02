import { useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, } from "react";
import { StyleSheet, Text, View, } from "react-native";
import CardForm from "./components/CardForm";
import ScanButton from "./components/ScanButton";

export default function AddCardScreen() {
  const router = useRouter();

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Add Card" });
  }, [navigation]);

  const handleScan = () => {
    router.push("/add-card/scan");
  };


  const handleManualAdd = (card: { cardNumber: string; cardHolder: string; expiry: string }) => {
    console.log("New card added:", card);
    router.back(); // Go back to previous screen after adding
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add a New Card</Text>

      <ScanButton onPress={handleScan} />

      <CardForm onSubmit={handleManualAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f2f2f2" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
});