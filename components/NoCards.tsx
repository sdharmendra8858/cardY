// components/NoCards.tsx
import { useRouter } from "expo-router";
import { FC } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

const NoCards: FC<{ message?: string }> = ({ message = "No cards listed yet." }) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* SVG Illustration */}
      <Svg width={200} height={200} viewBox="0 0 64 64" style={{ marginBottom: 24 }}>
        {/* Background rectangle with rounded corners */}
        <Rect
            x={2}
            y={12}
            width={60}
            height={40}
            fill="#4b7bec"
            stroke="#fff"
            strokeWidth={2}
            rx={4} // rounded corners
        />
        
        {/* Card lines */}
        <Path d="M12 22h40v4H12zm0 30h40v4H12z" fill="#fff" />
      </Svg>

      <Text style={styles.message}>{message}</Text>

      <Pressable style={styles.button} onPress={() => router.push("/add-card")}>
        <Text style={styles.buttonText}>Add Your First Card</Text>
      </Pressable>
    </View>
  );
};

export default NoCards;

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
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});