import AppButton from "@/components/AppButton";
import CardItem from "@/components/CardItem";
import NoCards from "@/components/NoCards";
import { useAlert } from "@/context/AlertContext";
import { maskAndFormatCardNumber } from "@/utils/mask";
import {
  getCards as secureGetCards,
  removeCard as secureRemoveCards,
} from "@/utils/secureStorage";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { showAlert } = useAlert();
  const [cards, setCards] = useState<
    {
      id: string;
      cardNumber: string;
      cardHolder: string;
      expiry: string;
      cardName?: string;
    }[]
  >([]);

  const router = useRouter();

  const user = {
    name: "John Doe",
    avatar: "https://i.pravatar.cc/150?img=12",
  };

  const fetchCards = async () => {
    try {
      const cardList = await secureGetCards();

      setCards(cardList.map((c: any) => ({ id: c.id, ...c })));
    } catch (err) {
      console.error("Failed to load cards", err);
    }
  };

  // Load saved cards from AsyncStorage
  useFocusEffect(
    useCallback(() => {
      fetchCards();
    }, [])
  );

  const handleRemoveCard = (id: string) => {
    showAlert({
      title: "Remove Card",
      message: "Are you sure you want to delete this card?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await secureRemoveCards(id);
            await fetchCards();
          },
        },
      ],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Settings Section */}
      <View style={styles.settingsContainer}>
        <Pressable onPress={() => router.push("/settings")}>
          <Image
            source={require("@/assets/images/settings.png")} // or use your own icon asset
            style={styles.avatar}
          />
        </Pressable>
        <View style={styles.settingsText}>
          <Text style={styles.greeting}>Settings</Text>
          <Text style={styles.name}>Manage App & Privacy</Text>
        </View>
      </View>

      <Text style={styles.title}>Your Cards</Text>

      {cards.length === 0 ? (
        <NoCards />
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CardItem
              id={item.id}
              cardName={item.cardName || `Unnamed Card`}
              cardNumber={maskAndFormatCardNumber(item.cardNumber)}
              cardHolder={item.cardHolder}
              expiry={item.expiry}
              onDelete={handleRemoveCard}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        />
      )}

      {/* Navigate to Add Card */}
      {cards.length !== 0 && (
        <Link href="/add-card" asChild>
          <AppButton
            title="Add New Card"
            fullWidth
            style={{ marginHorizontal: 16 }}
          />
        </Link>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f2f2f2" },
  settingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 0,
  },
  settingsText: {
    marginLeft: 12,
  },
  greeting: {
    fontSize: 16,
    color: "#666",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },
  deleteButton: {
    marginTop: 8,
    alignSelf: "flex-end",
    backgroundColor: "#ff4d4f",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
