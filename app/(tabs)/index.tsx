import CardItem from "@/components/CardItem";
import { Link, useRouter } from "expo-router";
import { Button, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const cards = [
    { id: "1", cardNumber: "**** **** **** 1234", cardHolder: "John Doe", expiry: "12/25", cardName: "Dummy Card 1" },
    { id: "2", cardNumber: "**** **** **** 5678", cardHolder: "Jane Smith", expiry: "08/24", cardName: "Dummy Card 2" },
  ];

  const router = useRouter();

  const user = {
    name: "John Doe",
    avatar: "https://i.pravatar.cc/150?img=12",
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Profile Section */}
        <View style={styles.profileContainer}>
        <Pressable
            style={styles.profileContainer}
            onPress={() => router.push("/profile")}
          >
          <Image
            source={{ uri: user.avatar }} // placeholder avatar
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
            cardName={item.cardName}
            cardNumber={item.cardNumber}
            cardHolder={item.cardHolder}
            expiry={item.expiry}
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
});