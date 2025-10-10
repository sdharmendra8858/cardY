// components/CardForm.tsx
import AppButton from "@/components/AppButton";
import { generateRandomString } from "@/utils/random";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

interface CardFormProps {
  onSubmit: (card: { id: string, cardNumber: string; cardHolder: string; expiry: string, cvv:string, infoText: string }) => void;
  defaultCardNumber?: string;
  defaultCardHolder?: string;
  defaultExpiry?: string;
  defaultCvv?: string;
  infoText?: string;
}

export default function CardForm({
  onSubmit,
  defaultCardNumber = "",
  defaultCardHolder = "",
  defaultExpiry = "",
  defaultCvv = "",
  infoText,
}: CardFormProps) {
  const id = generateRandomString(5);
  const [cardNumber, setCardNumber] = useState(defaultCardNumber);
  const [cardHolder, setCardHolder] = useState(defaultCardHolder);
  const [expiry, setExpiry] = useState(defaultExpiry);
  const [cvv, setCvv] = useState(defaultCvv);

  const handleSubmit = () => {
    onSubmit({ id, cardNumber, cardHolder, expiry, cvv, infoText: infoText || "" });
  };

  useEffect(() => {
    setCardNumber(defaultCardNumber);
  }, [defaultCardNumber]);
  
  useEffect(() => {
    setCardHolder(defaultCardHolder);
  }, [defaultCardHolder]);
  
  useEffect(() => {
    setExpiry(defaultExpiry);
  }, [defaultExpiry]);
  
  useEffect(() => {
    const numeric = defaultCvv?.replace(/[^0-9]/g, "");
    setCvv(numeric ? String(Number(numeric)) : "");
  }, [defaultCvv]);

  return (
    <View style={styles.form}>
      {infoText ? <Text style={styles.info}>{infoText}</Text> : null}

      <View style={styles.field}>
        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter card number"
          value={cardNumber}
          onChangeText={setCardNumber}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Card Holder</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter card holder name"
          value={cardHolder}
          onChangeText={setCardHolder}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Expiry</Text>
        <TextInput
          style={styles.input}
          placeholder="MM/YY"
          value={expiry}
          onChangeText={setExpiry}
        />
      </View>


      <View style={styles.field}>
        <Text style={styles.label}>CVV</Text>
        <TextInput
          style={styles.input}
          placeholder="CVV"
          value={cvv}
          keyboardType="numeric"
          onChangeText={(text) => {
            const numeric = text.replace(/[^0-9]/g, "");
            setCvv(numeric ? String(Number(numeric)) : "");
          }}
        />
      </View>

      <AppButton 
        title="Add Card" 
        onPress={handleSubmit} 
        fullWidth
        variant="primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 20 },
  info: { marginBottom: 16, color: "#666", fontSize: 14, textAlign: "center" },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
  },
});