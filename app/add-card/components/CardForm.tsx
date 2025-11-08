import AppButton from "@/components/AppButton";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getCardType } from "@/utils/CardType";
import { generateRandomString } from "@/utils/random";
import { useEffect, useState } from "react";
import {
  LayoutAnimation,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { BANK_OPTIONS } from "../../../constants/banks";

import Amex from "@/assets/icons/cards/amex.svg";
import Diners from "@/assets/icons/cards/dinersclub.svg";
import Discover from "@/assets/icons/cards/discover.svg";
import JCB from "@/assets/icons/cards/jcb.svg";
import Maestro from "@/assets/icons/cards/maestro.svg";
import MasterCard from "@/assets/icons/cards/mastercard.svg";
import RuPay from "@/assets/icons/cards/rupay.svg";
import Visa from "@/assets/icons/cards/visa.svg";
import { CARD_TYPES } from "@/constants/cardTypes";
import { containsProfanity } from "@/utils/profanityFilter";

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

function formatCardNumberForDisplay(raw: string): string {
  const digitsOnly = (raw || "").replace(/[^0-9]/g, "");
  return digitsOnly.replace(/(.{4})/g, "$1 ").trim();
}

function luhnCheck(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");

  if (digits.length < 13 || digits.length > 19) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function normalizeExpiryDigits(raw: string): string {
  const d = (raw || "").replace(/[^0-9]/g, "").slice(0, 4);
  if (d.length === 0) return "";
  if (d[0] > "1") return ("0" + d[0] + d.slice(1)).slice(0, 4);
  if (d.length >= 2) {
    const monthNum = parseInt(d.slice(0, 2), 10);
    if (monthNum > 12) return ("0" + d[1] + d.slice(2)).slice(0, 4);
  }
  return d;
}

function formatExpiryForDisplay(raw: string): string {
  const digitsOnly = normalizeExpiryDigits(raw);
  if (digitsOnly.length < 2) return digitsOnly;
  if (digitsOnly.length === 2) return `${digitsOnly}/`;
  return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
}

// function isExpiryNotPast(raw: string): boolean {
//   const d = (raw || "").replace(/[^0-9]/g, "");
//   if (d.length < 4) return false;

//   const mm = parseInt(d.slice(0, 2), 10);
//   const yy = parseInt(d.slice(2), 10);
//   const now = new Date();

//   const currentMonth = now.getMonth() + 1;
//   const currentYearYY = now.getFullYear() % 100;
//   const maxYearYY = (now.getFullYear() + 10) % 100; // 🔹 Upper limit (+10 years)

//   // 🔸 Reject invalid months (e.g., 00 or 15)
//   if (mm < 1 || mm > 12) return false;

//   // 🔸 Reject years too far in the future
//   if (yy > maxYearYY) return false;

//   // 🔸 Reject past years
//   if (yy < currentYearYY) return false;

//   // 🔸 For the current year, ensure month isn't in the past
//   if (yy === currentYearYY && mm < currentMonth) return false;

//   return true;
// }

function isExpiryValid(raw: string): boolean {
  const d = (raw || "").replace(/[^0-9]/g, "");
  if (d.length < 4) return false;

  const mm = parseInt(d.slice(0, 2), 10);
  const yy = parseInt(d.slice(2), 10);
  if (mm < 1 || mm > 12) return false;

  const now = new Date();
  const currentYearYY = now.getFullYear() % 100;
  const maxYearYY = (now.getFullYear() + 10) % 100;

  // ✅ Reject years in the past or too far in future
  if (yy < currentYearYY || yy > maxYearYY) return false;

  // ✅ If same year, check month
  if (yy === currentYearYY && mm < now.getMonth() + 1) return false;

  return true;
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
  const [bank, setBank] = useState("");
  const [customBank, setCustomBank] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [cardType, setCardType] = useState<string | null>(null);

  // validation flags
  const cardNumberDigits = cardNumber.replace(/\D/g, "");
  const cardNumberValid = luhnCheck(cardNumberDigits);
  const holderValid = cardHolder.trim().length > 2;
  const expiryDigits = expiry.replace(/[^0-9]/g, "");
  const { valid: expiryValid, message: expiryError } =
    expiryDigits.length === 4 ? validateExpiry(expiry) : { valid: true, message: undefined };
  const cvvValid = cvv.length >= 3 && cvv.length <= 4;
  const bankValid =
    bank === "OTHER"
      ? customBank.trim().length > 0
      : bank.length > 0;

  const isFormComplete =
    cardNumberValid && holderValid && expiryValid && cvvValid && bankValid;

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
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [bank]);


  function getCardIcon(type: string | null) {
    switch (type) {
      case CARD_TYPES.VISA:
        return Visa;
      case CARD_TYPES.MASTERCARD:
        return MasterCard;
      case CARD_TYPES.AMEX:
        return Amex;
      case CARD_TYPES.RUPAY:
        return RuPay;
      case CARD_TYPES.DISCOVER:
        return Discover;
      case CARD_TYPES.MAESTRO:
        return Maestro;
      case CARD_TYPES.JCB:
        return JCB;
      case CARD_TYPES.DINERS:
        return Diners;
      default:
        return null;
    }
  }

  function validateExpiry(raw: string): { valid: boolean; message?: string } {
    const d = (raw || "").replace(/[^0-9]/g, "");
    if (d.length < 4) return { valid: false, message: "Incomplete expiry date." };
  
    const mm = parseInt(d.slice(0, 2), 10);
    const yy = parseInt(d.slice(2), 10);
  
    // 🔸 Invalid month (00, 13, etc.)
    if (mm < 1 || mm > 12) {
      return { valid: false, message: "Invalid month (01–12)." };
    }
  
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYearYY = now.getFullYear() % 100;
    const maxYearYY = (now.getFullYear() + 10) % 100; // +10 years upper limit
  
    // 🔸 Year too far in the future
    if (yy > maxYearYY) {
      return { valid: false, message: "Expiry year too far in the future." };
    }
  
    // 🔸 Card expired
    if (yy < currentYearYY || (yy === currentYearYY && mm < currentMonth)) {
      return { valid: false, message: "Card has expired." };
    }
  
    return { valid: true };
  }

  return (
    <View style={styles.form}>
      {infoText && (
        <ThemedText style={styles.info}>{infoText}</ThemedText>
      )}

      {/* Bank Picker */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Bank</ThemedText>
        <DropDownPicker
          open={bankOpen}
          setOpen={setBankOpen}
          value={bank}
          setValue={(cb) => setBank(cb(bank) || "")}
          items={[
            ...BANK_OPTIONS.sort((a, b) =>
              a.label.localeCompare(b.label)
            ),
            { label: "Other", value: "OTHER" },
          ]}
          placeholder="Select a Bank"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.card,
            minHeight: 50,
          }}
          dropDownContainerStyle={{
            borderColor: theme.border,
            backgroundColor: theme.card,
          }}
          textStyle={{ color: theme.text }}
          placeholderStyle={{ color: theme.icon }}
          labelStyle={{ color: theme.text }}
          listItemLabelStyle={{ color: theme.text }}
          selectedItemLabelStyle={{ color: theme.tint }}
          listItemContainerStyle={{ backgroundColor: theme.card }}
          listMode="SCROLLVIEW"
        />
      </View>

      {bank === "OTHER" && (
        <View style={styles.field}>
          <ThemedText style={styles.label}>Bank Name</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.card,
                borderColor:
                  focused === "bank" ? theme.primary : theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Enter bank name"
            placeholderTextColor={theme.icon}
            value={customBank}
            onFocus={() => setFocused("bank")}
            onBlur={() => setFocused(null)}
            onChangeText={setCustomBank}
          />
        </View>
      )}

      {/* Card Number */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Card Number</ThemedText>

        {/* Unified styled input with inline icon */}
        <View
          style={[
            styles.inputRow,
            {
              borderColor:
                focused === "cardNumber" ? theme.primary : theme.border,
              backgroundColor: theme.card,
            },
            !cardNumberValid && cardNumberDigits.length >= 13
              ? styles.inputError
              : null,
          ]}
        >
          <TextInput
            style={[
              styles.inputField,
              { color: theme.text, backgroundColor: "transparent" }, // 👈 no gray patch
            ]}
            placeholder="Enter card number"
            placeholderTextColor={theme.icon}
            value={formatCardNumberForDisplay(cardNumber)}
            onFocus={() => setFocused("cardNumber")}
            onBlur={() => setFocused(null)}
            onChangeText={(text) => {
              const digitsOnly = text.replace(/[^0-9]/g, "").slice(0, 19);
              setCardNumber(digitsOnly);
              const detectedType = getCardType(digitsOnly);
              setCardType(detectedType);
            }}
            maxLength={23}
            keyboardType="number-pad"
          />

          {(() => {
            const CardIcon = getCardIcon(cardType);
            if (CardIcon) {
              return (
                <View style={styles.iconHolder}>
                  <CardIcon width={32} height={22} />
                </View>
              );
            }
            if (cardType) {
              return (
                <View style={styles.iconHolder}>
                  <ThemedText style={styles.cardTypeText}>{cardType}</ThemedText>
                </View>
              );
            }
            return null;
          })()}
        </View>

        {cardNumberDigits.length >= 13 && !cardNumberValid && (
          <ThemedText style={styles.errorText}>
            Invalid card number.
          </ThemedText>
        )}
      </View>

      {/* Card Holder */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Card Holder</ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              borderColor:
                focused === "holder" ? theme.primary : theme.border,
              color: theme.text,
            },
            !holderValid && cardHolder.length > 0
              ? styles.inputError
              : null,
          ]}
          placeholder="Enter card holder name"
          placeholderTextColor={theme.icon}
          value={cardHolder}
          onFocus={() => setFocused("holder")}
          onBlur={() => setFocused(null)}
          onChangeText={setCardHolder}
        />
        {!holderValid && cardHolder.length > 0 && (
          <ThemedText style={styles.errorText}>
            Enter a valid name (at least 3 letters).
          </ThemedText>
        )}
        {/* Profanity warning */}
        {containsProfanity(cardHolder) && (
          <ThemedText style={styles.errorText}>
            Please remove inappropriate words.
          </ThemedText>
        )}
      </View>

      {/* Expiry */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Expiry</ThemedText>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              borderColor:
                focused === "expiry" ? theme.primary : theme.border,
              color: theme.text,
            },
            expiryDigits.length === 4 && !expiryValid
              ? styles.inputError
              : null,
          ]}
          placeholder="MM/YY"
          placeholderTextColor={theme.icon}
          value={formatExpiryForDisplay(expiry)}
          onFocus={() => setFocused("expiry")}
          onBlur={() => setFocused(null)}
          onChangeText={(text) => {
            const prevDisplay = formatExpiryForDisplay(expiry);
            const isDeleting = text.length < prevDisplay.length;

            // Handle deleting '/' correctly
            if (
              isDeleting &&
              prevDisplay.endsWith("/") &&
              text.length === prevDisplay.length - 1
            ) {
              setExpiry(expiry.slice(0, -1));
              return;
            }

            const normalized = normalizeExpiryDigits(text);
            setExpiry(normalized);
          }}
          maxLength={5}
          keyboardType="number-pad"
          inputMode="numeric"
        />

        {/* Dynamic error messages */}
        {expiryDigits.length === 4 && !expiryValid && (
          <ThemedText style={styles.errorText}>
            {expiryError || "Invalid expiry date."}
          </ThemedText>
        )}
      </View>

      {/* CVV */}
      <View
        style={styles.field}
        onLayout={(e) => onCvvLayout?.(e.nativeEvent.layout.y)}
      >
        <ThemedText style={styles.label}>CVV</ThemedText>
        <TextInput
          ref={setCvvRef}
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              borderColor:
                focused === "cvv" ? theme.primary : theme.border,
              color: theme.text,
            },
            !cvvValid && cvv.length > 0 ? styles.inputError : null,
          ]}
          placeholder="CVV"
          placeholderTextColor={theme.icon}
          value={cvv}
          keyboardType="number-pad"
          secureTextEntry
          onFocus={() => {
            setFocused("cvv");
            onCvvFocus?.();
          }}
          onBlur={() => setFocused(null)}
          onChangeText={(text) =>
            setCvv(text.replace(/[^0-9]/g, "").slice(0, 4))
          }
          maxLength={4}
        />
        {!cvvValid && cvv.length > 0 && (
          <ThemedText style={styles.errorText}>
            Invalid CVV.
          </ThemedText>
        )}
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
  form: { marginTop: 8 },
  info: { marginBottom: 16, fontSize: 14, textAlign: "center" },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
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
  cardIcon: {
    position: "absolute",
    right: 10,
    top: 13,
    width: 28,
    height: 20,
  },
  cardIconWrapper: {
    position: "absolute",
    right: 10,
    top: 13,
    width: 32,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  cardIconFallback: {
    position: "absolute",
    right: 10,
    top: 14,
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 10,
  },
  
  // inputField: {
  //   flex: 1,
  //   fontSize: 16,
  //   height: "100%",
  //   paddingVertical: 0,
  // },
  
  inputIcon: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  
  // cardTypeText: {
  //   fontSize: 12,
  //   fontWeight: "600",
  //   color: "#888",
  // },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 10,
  },
  
  inputField: {
    flex: 1,
    fontSize: 16,
    height: "100%",
    paddingVertical: 0,
    paddingHorizontal: 0, // 👈 removes any grey inset padding
  },
  
  iconHolder: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent", // 👈 removes gray patch
  },
  
  cardTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
});