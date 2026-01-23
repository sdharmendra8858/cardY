import AppButton from "@/components/AppButton";
import { ThemedText } from "@/components/themed-text";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getCardType } from "@/utils/CardType";
import { generateRandomString } from "@/utils/random";
import { useEffect, useState } from "react";
import {
  StyleSheet, Text, TextInput,
  TouchableOpacity,
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

// Constants for new dropdown options
const CARD_KIND_OPTIONS = [
  { label: "Credit Card", value: "credit" },
  { label: "Debit Card", value: "debit" },
];

const CARD_USER_OPTIONS = [
  { label: "Self", value: "self" },
  { label: "Other (Family/Friend)", value: "other" },
];

const COLOR_PALETTE = [
  "#2563eb", // Blue
  "#dc2626", // Red
  "#16a34a", // Green
  "#ca8a04", // Yellow
  "#9333ea", // Purple
  "#c2410c", // Orange
  "#0891b2", // Cyan
  "#be185d", // Pink
  "#374151", // Gray
  "#000000", // Black
];

interface CardFormProps {
  onSubmit: (card: {
    id: string;
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvv: string;
    infoText: string;
    bank?: string;
    cardKind?: "credit" | "debit";
    cobrandName?: string;
    cardUser?: "self" | "other";
    dominantColor?: string;
  }) => void;
  defaultCardNumber?: string;
  defaultCardHolder?: string;
  defaultExpiry?: string;
  defaultCvv?: string;
  defaultBank?: string;
  defaultCardKind?: "credit" | "debit";
  defaultCobrandName?: string;
  defaultCardUser?: "self" | "other";
  defaultDominantColor?: string;
  infoText?: string;
  onCvvFocus?: () => void;
  setCvvRef?: (ref: TextInput | null) => void;
  onCvvLayout?: (y: number) => void;
  disabled?: boolean;
  isEditMode?: boolean;
  fromShare?: boolean;
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


export default function CardForm({
  onSubmit,
  defaultCardNumber = "",
  defaultCardHolder = "",
  defaultExpiry = "",
  defaultCvv = "",
  defaultBank = "",
  defaultCardKind,
  defaultCobrandName = "",
  defaultCardUser,
  defaultDominantColor,
  infoText,
  onCvvFocus,
  setCvvRef,
  onCvvLayout,
  disabled = false,
  isEditMode = false,
  fromShare = false,
}: CardFormProps) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const id = generateRandomString(5);

  const [cardNumber, setCardNumber] = useState(defaultCardNumber);
  const [cardHolder, setCardHolder] = useState(defaultCardHolder);
  const [expiry, setExpiry] = useState(defaultExpiry);
  const [cvv, setCvv] = useState(defaultCvv);
  const [bank, setBank] = useState(defaultBank);
  const [customBank, setCustomBank] = useState("");
  const [bankOpen, setBankOpen] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [cardType, setCardType] = useState<string | null>(() => getCardType(defaultCardNumber.replace(/\D/g, "")));

  // New fields for enhanced categorization
  const [cardKind, setCardKind] = useState<"credit" | "debit">(defaultCardKind || "credit"); // Credit or Debit
  const [cobrandName, setCobrandName] = useState(defaultCobrandName); // Amazon Pay, Flipkart, Swiggy, etc.
  const [cardUser, setCardUser] = useState<"self" | "other">(fromShare ? "self" : (defaultCardUser || "self")); // Self or Other
  const [dominantColor, setDominantColor] = useState(defaultDominantColor || "#2563eb"); // Default blue color

  // Dropdown states
  const [cardKindOpen, setCardKindOpen] = useState(false);
  const [cardUserOpen, setCardUserOpen] = useState(false);

  // validation flags
  const cardNumberDigits = cardNumber.replace(/\D/g, "");
  const cardNumberValid = luhnCheck(cardNumberDigits);
  const holderValid = cardHolder.trim().length > 2;
  const expiryDigits = expiry.replace(/[^0-9]/g, "");
  const expiryRes = validateExpiry(expiry);
  const expiryValid = expiryRes.valid;
  const expiryError = expiryRes.message;
  const cvvValid = cvv.length >= 3 && cvv.length <= 4;
  const bankValid =
    bank === "OTHER"
      ? customBank.trim().length > 0
      : bank.length > 0;

  const alphanumericRegex = /^[a-zA-Z0-9 ]*$/;
  const holderHasSpecialChars = !alphanumericRegex.test(cardHolder);
  const cobrandHasSpecialChars = !alphanumericRegex.test(cobrandName);

  const isFormComplete =
    cardNumberValid &&
    holderValid &&
    expiryValid &&
    cvvValid &&
    bankValid &&
    !containsProfanity(cardHolder) &&
    !containsProfanity(cobrandName) &&
    !holderHasSpecialChars &&
    !cobrandHasSpecialChars;

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
      cardKind,
      cobrandName: cobrandName.trim() || undefined,
      cardUser,
      dominantColor,
    });
  };



  // Ensure only one dropdown is open at a time
  useEffect(() => {
    if (bankOpen) {
      setCardKindOpen(false);
      setCardUserOpen(false);
    }
  }, [bankOpen]);

  useEffect(() => {
    if (cardKindOpen) {
      setBankOpen(false);
      setCardUserOpen(false);
    }
  }, [cardKindOpen]);

  useEffect(() => {
    if (cardUserOpen) {
      setBankOpen(false);
      setCardKindOpen(false);
    }
  }, [cardUserOpen]);



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
    if (d.length === 0) return { valid: false }; // Silent fail for empty
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

    // 🔸 Card expired
    if (yy < currentYearYY || (yy === currentYearYY && mm < currentMonth)) {
      return { valid: false, message: "Card has expired." };
    }

    // 🔸 Year too far in the future
    if (yy > maxYearYY) {
      return { valid: false, message: "Expiry year too far in the future." };
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
          setValue={setBank}
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
            maxHeight: 200,
          }}
          textStyle={{ color: theme.text }}
          placeholderStyle={{ color: theme.icon }}
          labelStyle={{ color: theme.text }}
          listItemLabelStyle={{ color: theme.text }}
          selectedItemLabelStyle={{ color: theme.tint }}
          listItemContainerStyle={{ backgroundColor: theme.card }}
          listMode="SCROLLVIEW"
          scrollViewProps={{
            nestedScrollEnabled: true,
          }}
          zIndex={3000}
          zIndexInverse={1000}
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


      {/* Card Kind */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Card Type</ThemedText>
        <DropDownPicker
          open={cardKindOpen}
          setOpen={setCardKindOpen}
          value={cardKind}
          setValue={setCardKind}
          items={CARD_KIND_OPTIONS}
          placeholder="Select card type"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.card,
            minHeight: 50,
          }}
          dropDownContainerStyle={{
            borderColor: theme.border,
            backgroundColor: theme.card,
            maxHeight: 150,
          }}
          textStyle={{ color: theme.text }}
          placeholderStyle={{ color: theme.icon }}
          labelStyle={{ color: theme.text }}
          listItemLabelStyle={{ color: theme.text }}
          selectedItemLabelStyle={{ color: theme.tint }}
          listItemContainerStyle={{ backgroundColor: theme.card }}
          listMode="SCROLLVIEW"
          scrollViewProps={{
            nestedScrollEnabled: true,
          }}
          zIndex={2000}
          zIndexInverse={2000}
        />
      </View>

      {/* Cobrand Name */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Cobrand Name (Optional)</ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              borderColor:
                focused === "cobrand" ? theme.primary : theme.border,
              color: theme.text,
            },
          ]}
          placeholder="e.g., Amazon Pay, Flipkart, Swiggy"
          placeholderTextColor={theme.icon}
          value={cobrandName}
          onFocus={() => setFocused("cobrand")}
          onBlur={() => setFocused(null)}
          onChangeText={setCobrandName}
          maxLength={20}
        />
        {/* Profanity warning */}
        {containsProfanity(cobrandName) && (
          <Text style={styles.errorText}>
            Please remove inappropriate words.
          </Text>
        )}
        {/* Special characters warning */}
        {cobrandHasSpecialChars && (
          <Text style={styles.errorText}>
            Special characters are not allowed.
          </Text>
        )}
      </View>

      {/* Card User - Disabled when coming from share screen */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Card User</ThemedText>
        <DropDownPicker
          open={cardUserOpen}
          setOpen={setCardUserOpen}
          value={cardUser}
          setValue={setCardUser}
          items={CARD_USER_OPTIONS}
          placeholder="Select card user"
          disabled={fromShare}
          style={{
            borderColor: theme.border,
            backgroundColor: theme.card,
            minHeight: 50,
          }}
          dropDownContainerStyle={{
            borderColor: theme.border,
            backgroundColor: theme.card,
            maxHeight: 150,
          }}
          textStyle={{ color: theme.text }}
          placeholderStyle={{ color: theme.icon }}
          labelStyle={{ color: theme.text }}
          listItemLabelStyle={{ color: theme.text }}
          selectedItemLabelStyle={{ color: theme.tint }}
          listItemContainerStyle={{ backgroundColor: theme.card }}
          listMode="SCROLLVIEW"
          scrollViewProps={{
            nestedScrollEnabled: true,
          }}
          zIndex={1000}
          zIndexInverse={3000}
        />
      </View>

      {/* Dominant Color Picker */}
      <View style={styles.field}>
        <ThemedText style={styles.label}>Card Theme Color</ThemedText>
        <View style={styles.colorPalette}>
          {COLOR_PALETTE.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                dominantColor === color && styles.selectedColor,
              ]}
              onPress={() => setDominantColor(color)}
            >
              {dominantColor === color && (
                <View style={styles.colorCheckmark}>
                  <ThemedText style={styles.checkmarkText}>✓</ThemedText>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
                  <CardIcon
                    width={32}
                    height={22}
                    fill={theme.text}
                    color={theme.text}
                  />
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
          <Text style={styles.errorText}>
            Invalid card number.
          </Text>
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
          <Text style={styles.errorText}>
            Enter a valid name (at least 3 letters).
          </Text>
        )}
        {/* Profanity warning */}
        {containsProfanity(cardHolder) && (
          <Text style={styles.errorText}>
            Please remove inappropriate words.
          </Text>
        )}
        {/* Special characters warning */}
        {holderHasSpecialChars && (
          <Text style={styles.errorText}>
            Special characters are not allowed.
          </Text>
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
          <Text style={styles.errorText}>
            {expiryError || "Invalid expiry date."}
          </Text>
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
          <Text style={styles.errorText}>
            Invalid CVV.
          </Text>
        )}
      </View>

      <AppButton
        title={isEditMode ? "Update Card" : "Add Card"}
        onPress={handleSubmit}
        fullWidth
        variant="primary"
        disabled={!isFormComplete || disabled}
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

  // Color picker styles
  colorPalette: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedColor: {
    borderColor: "#000",
    transform: [{ scale: 1.1 }],
  },
  colorCheckmark: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmarkText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
});