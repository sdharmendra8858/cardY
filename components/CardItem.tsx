// components/CardItem.tsx
import { useCards } from "@/context/CardContext";
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
  cardExpiresAt?: number; // Unix timestamp - when imported card expires
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
  cardExpiresAt,
}: CardItemProps) {
  const router = useRouter();
  const { timerTick } = useCards(); // Use global timer for real-time updates

  // Calculate time remaining for imported cards
  const getTimeRemaining = () => {
    if (!cardExpiresAt) return null;
    const now = Math.floor(Date.now() / 1000);
    const remaining = cardExpiresAt - now;

    if (remaining <= 0) return "Expired";
    if (remaining < 60) return `${remaining}s`;
    if (remaining < 3600) return `${Math.floor(remaining / 60)}m`;
    if (remaining < 86400) return `${Math.floor(remaining / 3600)}h`;
    return `${Math.floor(remaining / 86400)}d`;
  };

  const now = Math.floor(Date.now() / 1000);
  const timeRemaining = getTimeRemaining();
  const isExpired = cardExpiresAt ? now > cardExpiresAt : false;
  const isExpiringSoon = cardExpiresAt ? now > (cardExpiresAt - 300) : false; // 5 minutes
  const isInfinite = !cardExpiresAt && cardUser === "other"; // Imported card with no expiry

  // Use timerTick to trigger re-renders (this ensures real-time updates)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = timerTick;

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
        style={[styles.card, { backgroundColor: dominantColor, opacity: isExpired ? 0.5 : 1 }]}
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
            {timeRemaining && (
              <View style={[styles.badge, { backgroundColor: isExpired ? "rgba(255, 59, 48, 0.8)" : isExpiringSoon ? "rgba(255, 193, 7, 0.8)" : "rgba(76, 175, 80, 0.8)" }]}>
                <Text style={styles.badgeText}>
                  {isExpired ? "⏰ Expired" : `⏱️ ${timeRemaining}`}
                </Text>
              </View>
            )}
            {isInfinite && (
              <View style={[styles.badge, { backgroundColor: "rgba(76, 175, 80, 0.8)" }]}>
                <Text style={styles.badgeText}>∞ Forever</Text>
              </View>
            )}
          </View>
        </View>

        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.cardNumber, { opacity: isExpired ? 0.6 : 1 }]}>{cardNumber}</Text>

        {/* Cobrand name if present */}
        {cobrandName && (
          <Text style={[styles.cobrandName, { opacity: isExpired ? 0.6 : 1 }]}>{cobrandName}</Text>
        )}

        <Text style={[styles.cardHolder, { opacity: isExpired ? 0.6 : 1 }]}>{cardHolder}</Text>
        <Text style={[styles.expiry, { opacity: isExpired ? 0.6 : 1 }]}>Expires: {expiry}</Text>

        {isExpired && (
          <View style={styles.expiredOverlay}>
            <Text style={styles.expiredText}>This card has expired</Text>
          </View>
        )}
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
  expiredOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  expiredText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
});
