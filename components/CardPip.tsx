// app/components/CardPiP.tsx
import { maskAndFormatCardNumber } from "@/utils/mask";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface CardPiPProps {
  card: {
    cardNumber: string;
    expiry: string;
    cvv: string;
    cardHolder?: string;
    type?: string;
  };
}

export default function CardPiP({ card }: CardPiPProps) {
  return (
    <View style={styles.container}>
      {/* Card Number */}
      <Text style={styles.cardNumber}>{maskAndFormatCardNumber(card.cardNumber)}</Text>

      {/* Expiry and CVV */}
      <View style={styles.infoRow}>
        <View>
          <Text style={styles.label}>Expiry</Text>
          <Text style={styles.info}>{card.expiry}</Text>
        </View>
        <View>
          <Text style={styles.label}>CVV</Text>
          <Text style={styles.info}>{card.cvv}</Text>
        </View>
      </View>

      {card.cardHolder && <Text style={styles.cardHolder}>{card.cardHolder}</Text>}
      {card.type && <Text style={styles.cardType}>{card.type}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#4b7bec",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cardNumber: {
    color: "#fff",
    fontSize: 20,
    letterSpacing: 2,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  label: { color: "#ddd", fontSize: 12 },
  info: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  cardHolder: { color: "#fff", fontSize: 14, marginTop: 8 },
  cardType: { color: "#fff", fontSize: 12, marginTop: 4 },
});