// app/card-details/[cardName].tsx
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useLayoutEffect } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function CardDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();

  // Dummy data for now — you can replace with real data lookup by cardName
  const card = {
    id: id,
    cardName: "Dummy Card",
    cardNumber: "**** **** **** 1234",
    cardHolder: "John Doe", // using the name from URL
    expiry: "12/25",
    cvv: "***",
    bank: "Awesome Bank",
    type: "Visa",
  };

  useLayoutEffect(() => {
    navigation.setOptions({ title: card.cardName });
  }, [navigation, card.cardName]);


  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.screenTitle}>Card Details</Text>

      {/* Card Front */}
      <View style={styles.cardFront}>
        <Text style={styles.bankName}>{card.bank}</Text>
        <Text style={styles.cardNumber}>{card.cardNumber}</Text>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f2" },
  screenTitle: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },

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
});