import AppButton from "@/components/AppButton";
import CardItem from "@/components/CardItem";
import NoCards from "@/components/NoCards";
import { maskAndFormatCardNumber } from "@/utils/mask";
import {
    getCards as secureGetCards,
    removeCard as secureRemoveCards,
} from "@/utils/secureStorage";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
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
      Alert.alert("Remove Card", "Are you sure you want to delete this card?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await secureRemoveCards(id);
            await fetchCards();
          },
        },
      ]);
    };
  
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Profile Section */}
        <View style={styles.profileContainer}>
          <Pressable onPress={() => router.push("/profile")}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          </Pressable>
          <View style={styles.profileText}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user.name}</Text>
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
  