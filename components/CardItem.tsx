// components/CardItem.tsx
import { Ionicons } from "@expo/vector-icons"; // ✅ icon library included with Expo
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

type CardItemProps = {
  id: string;
  cardName: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  onDelete?: (id: string) => void; // ✅ new prop
};

export default function CardItem({
  id,
  cardNumber,
  cardName,
  cardHolder,
  expiry,
  onDelete,
}: CardItemProps) {
  const router = useRouter();

  return (
    <View style={styles.cardContainer}>
      {/* 🗑️ Delete button */}
      {onDelete && (
        <Pressable style={styles.deleteButton} onPress={() => onDelete(id)}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </Pressable>
      )}

      {/* Main card pressable */}
      <Pressable
        onPress={() => router.push(`/card-details/${encodeURIComponent(id)}`)}
        style={styles.card}
      >
        <Text style={styles.cardName}>{cardName}</Text>
        <Text style={styles.cardNumber}>{cardNumber}</Text>
        <Text style={styles.cardHolder}>{cardHolder}</Text>
        <Text style={styles.expiry}>Expires: {expiry}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: "relative",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#4b7bec",
    padding: 16,
    borderRadius: 12,
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    borderRadius: 20,
    padding: 6,
  },
  cardName: { color: "white", fontSize: 18, fontWeight: "bold" },
  cardNumber: { color: "white", fontSize: 18, fontWeight: "bold" },
  cardHolder: { color: "white", marginTop: 4 },
  expiry: { color: "white", marginTop: 2, fontSize: 12 },
});