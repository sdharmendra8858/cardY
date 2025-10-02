// app/add-card/manual.tsx
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import CardForm from "./components/CardForm";

export default function ManualAddScreen() {
  const router = useRouter();

  const handleAdd = (card: { cardNumber: string; cardHolder: string; expiry: string }) => {
    console.log("Card added manually:", card);
    router.back(); // Go back after adding
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Card Manually</Text>
      <CardForm onSubmit={handleAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f2f2f2" },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 24 },
});