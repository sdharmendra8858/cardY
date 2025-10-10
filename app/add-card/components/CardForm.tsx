// components/CardForm.tsx
import AppButton from "@/components/AppButton";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { generateRandomString } from "@/utils/random";
import { Picker } from "@react-native-picker/picker";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { BANK_OPTIONS } from "../../../constants/banks";

function formatCardNumberForDisplay(raw: string): string {
  const digitsOnly = (raw || "").replace(/[^0-9]/g, "");
  return digitsOnly.replace(/(.{4})/g, "$1 ").trim();
}

function normalizeExpiryDigits(raw: string): string {
  const d = (raw || "").replace(/[^0-9]/g, "").slice(0, 4);
  if (d.length === 0) return "";
  // If first digit is greater than '1', prefix with '0'
  if (d[0] > "1") {
    return ("0" + d[0] + d.slice(1)).slice(0, 4);
  }
  // If two digits form a month greater than 12, coerce to '0' + second digit
  if (d.length >= 2) {
    const monthNum = parseInt(d.slice(0, 2), 10);
    if (monthNum > 12) {
      return ("0" + d[1] + d.slice(2)).slice(0, 4);
    }
  }
  return d;
}

function formatExpiryForDisplay(raw: string): string {
  const digitsOnly = normalizeExpiryDigits(raw);
  if (digitsOnly.length < 2) return digitsOnly;
  if (digitsOnly.length === 2) return `${digitsOnly}/`;
  return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
}

function isExpiryNotPast(raw: string): boolean {
  const d = (raw || "").replace(/[^0-9]/g, "");
  if (d.length < 4) return false;
  const mm = parseInt(d.slice(0, 2), 10);
  const yy = parseInt(d.slice(2), 10);
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYearYY = now.getFullYear() % 100; // 00-99
  if (yy > currentYearYY) return true;
  if (yy < currentYearYY) return false;
  return mm >= currentMonth;
}

interface CardFormProps {
  onSubmit: (card: {
    id: string;
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvv: string;
    infoText: string;
    bank?: string;
  }) => void;
  defaultCardNumber?: string;
  defaultCardHolder?: string;
  defaultExpiry?: string;
  defaultCvv?: string;
  infoText?: string;
  onCvvFocus?: () => void;
  setCvvRef?: (ref: TextInput | null) => void;
  onCvvLayout?: (y: number) => void;
}

export default function CardForm({
  onSubmit,
  defaultCardNumber = "",
  defaultCardHolder = "",
  defaultExpiry = "",
  defaultCvv = "",
  infoText,
  onCvvFocus,
  setCvvRef,
  onCvvLayout,
}: CardFormProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const id = generateRandomString(5);
  const [cardNumber, setCardNumber] = useState(defaultCardNumber);
  const [cardHolder, setCardHolder] = useState(defaultCardHolder);
  const [expiry, setExpiry] = useState(defaultExpiry);
  const [cvv, setCvv] = useState(defaultCvv);
  const [bank, setBank] = useState<string>("");
  const [customBank, setCustomBank] = useState<string>("");

  const handleSubmit = () => {
    const bankToSave =
      bank === "OTHER" ? customBank.trim() || undefined : bank || undefined;
    onSubmit({
      id,
      cardNumber,
      cardHolder,
      expiry: formatExpiryForDisplay(expiry),
      cvv,
      infoText: infoText || "",
      bank: bankToSave,
    });
  };

  useEffect(() => {
    const normalized = (defaultCardNumber || "")
      .replace(/[^0-9]/g, "")
      .slice(0, 19);
    setCardNumber(normalized);
  }, [defaultCardNumber]);

  useEffect(() => {
    setCardHolder(defaultCardHolder);
  }, [defaultCardHolder]);

  useEffect(() => {
    const sanitized = normalizeExpiryDigits(defaultExpiry || "");
    setExpiry(sanitized);
  }, [defaultExpiry]);

  useEffect(() => {
    const numeric = defaultCvv?.replace(/[^0-9]/g, "");
    setCvv(numeric ? String(Number(numeric)) : "");
  }, [defaultCvv]);

  const isBankFilled =
    bank === "OTHER" ? customBank.trim().length > 0 : bank.length > 0;
  const expiryDigits = expiry.replace(/[^0-9]/g, "");
  const isExpiryValid = expiryDigits.length === 4 && isExpiryNotPast(expiry);
  const isFormComplete =
    isBankFilled &&
    cardNumber.length >= 13 &&
    cardHolder.trim().length > 0 &&
    isExpiryValid &&
    cvv.length > 0;

  return (
    <View style={styles.form}>
      {infoText ? <Text style={styles.info}>{infoText}</Text> : null}

      <View style={styles.field}>
        <Text style={styles.label}>Bank</Text>
        <View
          style={[
            styles.pickerWrapper,
            { borderColor: "#e5e7eb", backgroundColor: theme.background },
          ]}
        >
          <Picker
            selectedValue={bank}
            onValueChange={(v: string) => setBank(v)}
            style={[styles.picker, { color: theme.text }]}
            itemStyle={styles.pickerItem}
            dropdownIconColor={theme.icon}
            prompt="Select bank"
            mode="dropdown"
          >
            <Picker.Item label="Select a bank" value="" />
            {BANK_OPTIONS.slice()
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((b) => (
                <Picker.Item key={b.value} label={b.label} value={b.value} />
              ))}
            <Picker.Item label="Other" value="OTHER" />
          </Picker>
        </View>
      </View>

      {bank === "OTHER" ? (
        <View style={styles.field}>
          <Text style={styles.label}>Bank Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter bank name"
            value={customBank}
            onChangeText={setCustomBank}
          />
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter card number"
          value={formatCardNumberForDisplay(cardNumber)}
          onChangeText={(text) => {
            const digitsOnly = text.replace(/[^0-9]/g, "").slice(0, 19);
            setCardNumber(digitsOnly);
          }}
          maxLength={23}
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
          style={[
            styles.input,
            expiryDigits.length === 4 && !isExpiryValid
              ? styles.inputError
              : null,
          ]}
          placeholder="MM/YY"
          value={formatExpiryForDisplay(expiry)}
          onChangeText={(text) => {
            const prevDisplay = formatExpiryForDisplay(expiry);
            const isDeleting = text.length < prevDisplay.length;
            // If user deleted the '/' right after entering month, remove the second month digit
            if (
              isDeleting &&
              prevDisplay.endsWith("/") &&
              text.length === prevDisplay.length - 1
            ) {
              setExpiry(expiry.slice(0, 1));
              return;
            }
            const normalized = normalizeExpiryDigits(text);
            setExpiry(normalized);
          }}
          maxLength={5}
          keyboardType="number-pad"
        />
        {expiryDigits.length === 4 && !isExpiryValid ? (
          <Text style={styles.errorText}>Expiry date is in the past.</Text>
        ) : null}
      </View>

      <View
        style={styles.field}
        onLayout={(e) => onCvvLayout?.(e.nativeEvent.layout.y)}
      >
        <Text style={styles.label}>CVV</Text>
        <TextInput
          ref={setCvvRef}
          style={styles.input}
          placeholder="CVV"
          value={cvv}
          keyboardType="numeric"
          onChangeText={(text) => {
            const numeric = text.replace(/[^0-9]/g, "").slice(0, 4);
            setCvv(numeric);
          }}
          maxLength={4}
          onFocus={() => onCvvFocus?.()}
        />
      </View>

      <AppButton
        title="Add Card"
        onPress={handleSubmit}
        fullWidth
        variant="primary"
        disabled={!isFormComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { marginTop: 20 },
  info: { marginBottom: 16, color: "#666", fontSize: 14, textAlign: "center" },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
    height: 50,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  picker: {
    height: 50,
    color: "#111",
    width: "100%",
    textAlign: "center",
    paddingTop: 0,
    paddingBottom: 0,
    // Slight upward nudge on Android where text sits a bit low
    marginTop: Platform.select({ android: -2, ios: 0 }) as number,
  },
  pickerItem: {
    textAlign: "center",
    height: 50,
    lineHeight: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 50,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    marginTop: 6,
    color: "#ef4444",
    fontSize: 12,
  },
});
