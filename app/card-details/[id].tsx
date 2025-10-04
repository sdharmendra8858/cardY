// app/card-details/[cardName].tsx
import CardNotFound from "@/components/CardNotFound";
import { maskAndFormatCardNumber } from "@/utils/mask";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Button, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CardDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<any>(null);
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: "Card Details" });
  }, [navigation]);

  useEffect(() => {
    const loadCard = async () => {
      try {
        const storedCards = await AsyncStorage.getItem("cards");
        if (storedCards) {
          const parsed = JSON.parse(storedCards);
          const found = parsed.find((c: any) => c.id === id);
          if (found) setCard(found);
        }
      } catch (err) {
        console.error("Error loading card details", err);
      }
    };

    loadCard();
  }, [id]);

  const handleDelete = async () => {
    Alert.alert(
      "Delete Card",
      "Are you sure you want to delete this card?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const storedCards = await AsyncStorage.getItem("cards");
              if (storedCards) {
                const parsed = JSON.parse(storedCards);
                const updated = parsed.filter((c: any) => c.id !== id);
                await AsyncStorage.setItem("cards", JSON.stringify(updated));
              }
              router.replace("/"); // go back to home
            } catch (err) {
              console.error("Error deleting card:", err);
              Alert.alert("Error", "Failed to delete the card. Please try again.");
            }
          },
        },
      ]
    );
  };

  if (!card) {
    if (!card) {
      return <CardNotFound />;
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Card Front */}
          <View style={styles.cardFront}>
            <Text style={styles.bankName}>{card.bank}</Text>
            <Text style={styles.cardNumber}>{maskAndFormatCardNumber(card.cardNumber)}</Text>
            <View style={styles.cardInfoRow}>
              <View>
                <Text style={styles.label}>Card Holder</Text>
                <Text style={styles.info}>{card.cardHolder}</Text>
              </View>
              <View>
                <Text style={styles.label}>Expiry</Text>
                <Text style={styles.info}>{card.expiry}</Text>
              </View>
            </View>
            <Text style={styles.cardType}>{card.type}</Text>
          </View>

          {/* Card Back */}
          <View style={styles.cardBack}>
            <Text style={styles.label}>CVV</Text>
            <Text style={styles.info}>{card.cvv}</Text>
          </View>

          <Text style={styles.note}>Card ID: {id}</Text>
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={styles.footer}>
          <Button title="Delete Card" color="red" onPress={handleDelete} />
          <View style={{ height: 10 }} />
          <Button title="Back to Home" onPress={() => router.push("/")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f2f2f2" },
  contentContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 }, // extra space above button
  cardFront: {
    backgroundColor: "#4b7bec",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  bankName: { color: "white", fontSize: 16, marginBottom: 20, fontWeight: "600" },
  cardNumber: { color: "white", fontSize: 22, letterSpacing: 2, marginBottom: 20 },
  cardInfoRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { color: "white", fontSize: 12 },
  info: { color: "white", fontSize: 16, fontWeight: "bold" },
  cardType: { color: "white", fontSize: 14, textAlign: "right", marginTop: 10 },

  cardBack: {
    backgroundColor: "#333",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },

  note: { fontSize: 12, color: "#666", textAlign: "center", marginTop: 12 },
  error: { fontSize: 18, textAlign: "center", marginTop: 20, color: "red" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
});