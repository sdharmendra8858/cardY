import CardItem from "@/components/CardItem";
import { maskAndFormatCardNumber } from "@/utils/mask";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Link, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Button, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {

  const [cards, setCards] = useState<Array<{
    id: string;
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cardName?: string;
  }>>([]);

  const router = useRouter();

  const user = {
    name: "John Doe",
    avatar: "https://i.pravatar.cc/150?img=12",
  };


  const fetchCards = async () => {
    try {
      const storedCards = await AsyncStorage.getItem("cards");
      if (storedCards) {
        const parsedCards = JSON.parse(storedCards);
        const cardsWithId = parsedCards.map((card: any) => ({
          id: card.id,
          ...card,
        }));

        console.log("Loaded cards:", cardsWithId);

        setCards(cardsWithId);
      }
    } catch (err) {
      console.error("Failed to load cards", err);
    }
  };

    // Load saved cards from AsyncStorage
    useEffect(() => {
      fetchCards();
    }, []);

    const handleRemoveCard = (id: string) => {
      Alert.alert(
        "Remove Card",
        "Are you sure you want to delete this card?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: async () => {
              const updatedCards = cards.filter((card) => card.id !== id);
              setCards(updatedCards);
              await AsyncStorage.setItem("cards", JSON.stringify(updatedCards));
            } 
          },
        ]
      );
    };

    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Profile Section */}
        <View style={styles.profileContainer}>
          <Pressable onPress={() => router.push("/profile")}>
            <Image
              source={{ uri: user.avatar }}
              style={styles.avatar}
            />
          </Pressable>
          <View style={styles.profileText}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user.name}</Text>
          </View>
        </View>
  
        <Text style={styles.title}>Your Cards</Text>
  
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
              onDelete={handleRemoveCard} // ✅ new prop
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        />
  
        {/* Navigate to Add Card */}
        <Link href="/add-card" asChild>
          <Button title="Add New Card" />
        </Link>
      </SafeAreaView>
    );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f2f2f2" },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileText: {
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