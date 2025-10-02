// app/profile.tsx
import { useNavigation } from "expo-router";
import { useLayoutEffect, } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  // Dummy profile data
  const user = {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+1 234 567 890",
    avatar: "https://i.pravatar.cc/150?img=12", // placeholder image
  };

  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "Profile" });
  }, [navigation]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.profileHeader}>
        <Image source={{ uri: user.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.phone}>{user.phone}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f2f2" },
  profileHeader: {
    alignItems: "center",
    marginVertical: 32,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 5,
  },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  name: { fontSize: 24, fontWeight: "bold" },
  email: { fontSize: 16, color: "#666", marginTop: 4 },
  phone: { fontSize: 16, color: "#666", marginTop: 2 },
});