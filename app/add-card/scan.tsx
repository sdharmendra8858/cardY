// app/add-card/scan.tsx
import { useRouter } from "expo-router";
import { Alert, Button, StyleSheet, Text, View } from "react-native";

export default function ScanCardScreen() {
  const router = useRouter();

  const handleScan = () => {
    // Placeholder for camera scanning logic
    Alert.alert("Scan Card", "Camera scanning will be implemented here.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Card</Text>
      <Text style={styles.note}>
        This screen will open the camera to scan your credit/debit card.
      </Text>

      <View style={styles.buttonContainer}>
        <Button title="Start Scan" onPress={handleScan} />
      </View>

      <View style={styles.buttonContainer}>
        <Button title="Back" onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: "center", backgroundColor: "#f2f2f2" },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 24 },
  note: { textAlign: "center", color: "#666", marginBottom: 24 },
  buttonContainer: { marginVertical: 8 },
});