// components/CardNotFound.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { FC } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

const CardNotFound: FC<{ message?: string }> = ({ message = "Card not found." }) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Icon */}
      <Ionicons name="card-outline" size={80} color="#ccc" style={{ marginBottom: 20 }} />

      {/* Message */}
      <Text style={styles.message}>{message}</Text>

      {/* Action buttons */}
      <Pressable style={styles.button} onPress={() => router.push("/")}>
        <Text style={styles.buttonText}>Go to Home</Text>
      </Pressable>

      <Pressable style={[styles.button, styles.secondaryButton]} onPress={() => router.push("/add-card")}>
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>Add a New Card</Text>
      </Pressable>
    </View>
  );
};

export default CardNotFound;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f2f2f2",
  },
  message: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#4b7bec",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#4b7bec",
  },
  secondaryButtonText: {
    color: "#4b7bec",
  },
});