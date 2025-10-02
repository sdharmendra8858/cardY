// app/add-card/components/CardForm.tsx
import { useState } from "react";
import { Button, StyleSheet, TextInput, View } from "react-native";

interface CardFormProps {
  onSubmit: (card: { cardNumber: string; cardHolder: string; expiry: string }) => void;
}

export default function CardForm({ onSubmit }: CardFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expiry, setExpiry] = useState("");

  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Card Number"
        placeholderTextColor="#888"
        value={cardNumber}
        onChangeText={setCardNumber}
        style={styles.input}
        keyboardType="numeric"
      />
      <TextInput
        placeholder="Card Holder Name"
        placeholderTextColor="#888"
        value={cardHolder}
        onChangeText={setCardHolder}
        style={styles.input}
      />
      <TextInput
        placeholder="Expiry (MM/YY)"
        placeholderTextColor="#888"
        value={expiry}
        onChangeText={setExpiry}
        style={styles.input}
      />
      <Button title="Add Card" onPress={() => onSubmit({ cardNumber, cardHolder, expiry })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    color: "#000", // ensure input text is black
  },
});