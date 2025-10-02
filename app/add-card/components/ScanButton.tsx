// app/add-card/components/ScanButton.tsx
import { Pressable, StyleSheet, Text } from "react-native";

interface ScanButtonProps {
  onPress: () => void;
  title?: string;
}

export default function ScanButton({ onPress, title = "Scan Card" }: ScanButtonProps) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#4b7bec",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 8,
  },
  text: { color: "white", fontSize: 16, fontWeight: "bold" },
});