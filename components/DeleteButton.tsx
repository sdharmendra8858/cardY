// components/DeleteButton.tsx
import { useAlert } from "@/context/AlertContext";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";

type DeleteButtonProps = {
  onDelete: () => void;
  size?: number;
  color?: string;
};

export default function DeleteButton({
  onDelete,
  size = 20,
  color = "red",
}: DeleteButtonProps) {
  const { showAlert } = useAlert();
  const handlePress = () => {
    showAlert({
      title: "Delete",
      message: "Are you sure you want to delete?",
      buttons: [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onDelete },
      ],
    });
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
