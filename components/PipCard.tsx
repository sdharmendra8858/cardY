// PipCard.tsx
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { captureRef } from "react-native-view-shot";

export type PipCardHandle = {
  /**
   * Captures the visual contents of the card and returns a file URI string.
   * Example: "file:///data/user/0/.../snapshot.png"
   */
  captureSnapshot: (options?: {
    format?: "png" | "jpg" | "webm";
    quality?: number; // 0..1 (only for jpg)
  }) => Promise<string>;
};

type CardData = {
  bank: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  type?: string;
};

type Props = {
  card?: CardData;
  showNumber?: boolean; // kept for compatibility but ignored (no masking)
  style?: ViewStyle;
};

const PipCard = forwardRef<PipCardHandle, Props>(
  ({ card, showNumber = false, style }, ref) => {
    const containerRef = useRef<View | null>(null);

    // Expose captureSnapshot to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        captureSnapshot: async (options = {}) => {
          if (!containerRef.current) {
            throw new Error("PipCard ref not set");
          }

          // Default options
          const { format = "png", quality = 0.9 } = options;

          // captureRef returns a file:// URI by default on native
          const uri = await captureRef(containerRef.current as View, {
            format,
            quality,
            result: "tmpfile", // returns a file path
          });

          return uri as string;
        },
      }),
      []
    );

    const bank = card?.bank ?? "Bank";
    const cardNumber = card?.cardNumber ?? "0000000000000000"; // no masking
    const cardHolder = card?.cardHolder ?? "CARD HOLDER";
    const expiry = card?.expiry ?? "MM/YY";
    const cardType = card?.type ?? "";

    return (
      <View ref={containerRef} collapsable={false} style={[styles.card, style]}>
        <Text style={styles.bankName}>{bank}</Text>

        <View style={styles.cardNumberRow}>
          <Text style={styles.cardNumber}>{cardNumber}</Text>
        </View>

        <View style={styles.cardInfoRow}>
          <View>
            <Text style={styles.label}>Card Holder</Text>
            <Text style={styles.info}>{cardHolder}</Text>
          </View>
          <View>
            <Text style={styles.label}>Expiry</Text>
            <Text style={styles.info}>{expiry}</Text>
          </View>
        </View>

        {!!cardType && <Text style={styles.cardType}>{cardType}</Text>}
      </View>
    );
  }
);

PipCard.displayName = "PipCard";

export default PipCard;

const styles = StyleSheet.create({
  card: {
    width: 320,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#4b7bec",
    padding: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  bankName: {
    color: "white",
    fontSize: 16,
    marginBottom: 20,
    fontWeight: "600",
  },
  cardNumberRow: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  } as ViewStyle,
  cardNumber: {
    color: "white",
    fontSize: 22,
    letterSpacing: 2,
    lineHeight: 26,
  } as TextStyle,
  cardInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  } as ViewStyle,
  label: { color: "white", fontSize: 12 } as TextStyle,
  info: { color: "white", fontSize: 16, fontWeight: "bold" } as TextStyle,
  cardType: {
    color: "white",
    fontSize: 14,
    textAlign: "right",
    marginTop: 10,
  } as TextStyle,
});
