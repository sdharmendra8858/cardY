// components/CardItem.tsx
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";

type CardItemProps = {
  id: string;
  cardName: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
};

export default function CardItem({ id, cardNumber, cardName, cardHolder, expiry }: CardItemProps) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/card-details/${encodeURIComponent(id)}`)}
      style={styles.card}
    >
      <Text style={styles.cardName}>{cardName}</Text>
      <Text style={styles.cardNumber}>{cardNumber}</Text>
      <Text style={styles.cardHolder}>{cardHolder}</Text>
      <Text style={styles.expiry}>Expires: {expiry}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#4b7bec",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardName: { color: "white", fontSize: 18, fontWeight: "bold" },
  cardNumber: { color: "white", fontSize: 18, fontWeight: "bold" },
  cardHolder: { color: "white", marginTop: 4 },
  expiry: { color: "white", marginTop: 2, fontSize: 12 },
});