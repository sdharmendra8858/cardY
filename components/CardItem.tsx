// components/CardItem.tsx
import { useRouter } from "expo-router";
import React from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { formatCardNumber } from "../utils/formatCardNumber";
import ExpiryBadge from "./ExpiryBadge";

type CardItemProps = {
  id: string;
  cardName: string;
  cardNumber: string;
  cardHolder: string;
  onDelete?: (id: string) => void;
  onReveal?: (id: string) => void;
  cardKind?: "credit" | "debit";
  cobrandName?: string;
  cardUser?: "self" | "other";
  dominantColor?: string;
  cardExpiresAt?: number;
  expiry?: string;
  isExpiring?: boolean;
};

export default function CardItem({
  id,
  cardNumber,
  cardName,
  cardHolder,
  onDelete,
  onReveal,
  cardKind,
  cobrandName,
  cardUser,
  dominantColor = "#4b7bec",
  cardExpiresAt,
  expiry,
  isExpiring = false,
}: CardItemProps) {
  const router = useRouter();
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  // Calculate expiry status
  const isExpired = cardExpiresAt ? Math.floor(Date.now() / 1000) > cardExpiresAt : false;
  const isInfinite = !cardExpiresAt && cardUser === "other";

  // Animate card removal when expiring
  React.useEffect(() => {
    if (isExpiring) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isExpiring, fadeAnim]);

  // Format card number properly with spaces and X's
  const displayCardNumber = formatCardNumber(cardNumber.replace(/\*/g, 'X'));


  return (
    <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
      {/* Main card pressable */}
      <Pressable
        onPress={() => router.push(`/card-details/${encodeURIComponent(id)}`)}
        style={[styles.card, { backgroundColor: dominantColor, opacity: isExpired ? 0.5 : 1 }]}
      >
        {/* Top Section - Bank name and badges */}
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
            {cardExpiresAt && (
              <ExpiryBadge cardExpiresAt={cardExpiresAt} />
            )}
            {isInfinite && (
              <View style={[styles.badge, { backgroundColor: "rgba(76, 175, 80, 0.8)" }]}>
                <Text style={styles.badgeText}>∞ Forever</Text>
              </View>
            )}
          </View>
        </View>

        {/* Middle Section - Card number and cobrand */}
        <View style={styles.cardMiddle}>
          <Text style={[styles.cardNumber, { opacity: isExpired ? 0.6 : 1 }]}>{displayCardNumber}</Text>
          {cobrandName && (
            <Text style={[styles.cobrandName, { opacity: isExpired ? 0.6 : 1 }]}>{cobrandName}</Text>
          )}
        </View>

        {/* Bottom Section - Cardholder name */}
        <View style={styles.cardFooter}>
          <Text style={styles.cardHolder}>{cardHolder}</Text>
        </View>

        {isExpired && (
          <View style={styles.expiredOverlay}>
            <Text style={styles.expiredText}>This card has expired</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: "relative",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#4b7bec",
    padding: 12,
    borderRadius: 12,
    minHeight: 140,
    justifyContent: "space-between",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  cardMiddle: {
    flex: 1,
    justifyContent: "center",
    marginVertical: 8,
  },
  cardNumber: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
    flexShrink: 1
  },
  cobrandName: {
    color: "white",
    fontSize: 14,
    fontStyle: "italic",
    opacity: 0.9,
  },
  cardFooter: {
    justifyContent: "flex-end",
  },
  cardHolder: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
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
