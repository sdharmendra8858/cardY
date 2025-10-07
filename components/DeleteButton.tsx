// components/DeleteButton.tsx
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, StyleSheet } from "react-native";

type DeleteButtonProps = {
  onDelete: () => void;
  size?: number;
  color?: string;
};

export default function DeleteButton({ onDelete, size = 20, color = "red" }: DeleteButtonProps) {
  const handlePress = () => {
    Alert.alert(
      "Delete",
      "Are you sure you want to delete?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <Pressable style={styles.button} onPress={handlePress}>
      <Ionicons name="trash-outline" size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,0,0,0.7)",
  },
});