// app/card-details/[cardName].tsx
import AppButton from "@/components/AppButton";
import CardNotFound from "@/components/CardNotFound";
import Hero from "@/components/Hero";
import { maskAndFormatCardNumber } from "@/utils/mask";
import {
  getCards as secureGetCards,
  removeCard as secureRemoveCard
} from "@/utils/secureStorage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, NativeModules, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


const { PipModule } = NativeModules;

export default function CardDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [card, setCard] = useState<any>(null);
  const [showNumber, setShowNumber] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();

  const openPip = useCallback(() => {
    console.log("Opening PiP with card:", card);
  
    if (card) { 
      PipModule.openPip(JSON.stringify(card)); // pass data as JSON
    }
  }, [card]);

  useEffect(() => {
    navigation.setOptions({
      title: "Card Details",
      headerRight: () =>
        card ? (
          <Pressable onPress={openPip} style={{ marginRight: 16 }}>
            <Ionicons name="caret-forward-circle-outline" size={28} color="#4b7bec" />
          </Pressable>
        ) : null,
    });
  }, [navigation, card, openPip]); // include card here!

  useEffect(() => {
    const loadCard = async () => {
      try {
        const list = await secureGetCards()
        const found = list.find((c) => c.id === id)
        if(found) setCard(found);
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
              await secureRemoveCard(id)
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
    return <CardNotFound />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Hero 
        title="Card Details"
        subtitle="View and manage this card"
        tone="dark"
        surfaceColor="#F2F2F2"
      />
      <View style={styles.contentContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Card Front */}
          <View style={styles.cardFront}>
            <Text style={styles.bankName}>{card.bank}</Text>
            <Pressable
              onPress={openPip}
              style={styles.pipIconButton}
              hitSlop={10}
            >
              <Ionicons name="contract-outline" size={22} color="#FFF"/>
            </Pressable>

            {/* Card Number with Eye Icon */}
            <View style={styles.cardNumberRow}>
              <Text style={styles.cardNumber}>
                {showNumber ? card.cardNumber : maskAndFormatCardNumber(card.cardNumber)}
              </Text>
              <Pressable onPress={() => setShowNumber(!showNumber)} hitSlop={10}>
                <Ionicons
                  name={showNumber ? "eye-off" : "eye"}
                  size={22}
                  color="#fff"
                  style={{ marginTop: 2 }}
                />
              </Pressable>
            </View>

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
          <AppButton title="Delete Card" variant="danger" onPress={handleDelete} />
          <View style={{ height: 10 }} />
          <AppButton title="Back to Home" variant="secondary" onPress={() => router.push("/")} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f2f2f2" },
  contentContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 80 },
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
  },
  cardNumberRow: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardNumber: {
    color: "white",
    fontSize: 22,
    letterSpacing: 2,
    lineHeight: 26,
  },
  pipIconButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255, 0.2",
    borderRadius: 16,
    padding: 8
  }
});