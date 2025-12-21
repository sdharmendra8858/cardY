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
  onDelete?: (id: string) => void;
  cardKind?: "credit" | "debit";
  cobrandName?: string;
  cardUser?: "self" | "other";
  dominantColor?: string;
};

export default function CardItem({
  id,
  cardNumber,
  cardName,
  cardHolder,
  expiry,
  onDelete,
  cardKind,
  cobrandName,
  cardUser,
  dominantColor = "#4b7bec",
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
        style={[styles.card, { backgroundColor: dominantColor }]}
      >
        {/* Card type and kind badges */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{cardName}</Text>
          <View style={styles.badges}>
            {cardKind && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {cardKind === "credit" ? "💳" : "💵"} {cardKind.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Text numberOfLines={1} adjustsFontSizeToFit style={styles.cardNumber}>{cardNumber}</Text>

        {/* Cobrand name if present */}
        {cobrandName && (
          <Text style={styles.cobrandName}>{cobrandName}</Text>
        )}

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
    bottom: 8,
    right: 8,
    zIndex: 2,
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    borderRadius: 20,
    padding: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardName: { color: "white", fontSize: 18, fontWeight: "bold" },
  badges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  cardNumber: { color: "white", fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  cobrandName: {
    color: "white",
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 4,
    opacity: 0.9,
  },
  cardHolder: { color: "white", marginTop: 4 },
  expiry: { color: "white", marginTop: 2, fontSize: 12 },
});