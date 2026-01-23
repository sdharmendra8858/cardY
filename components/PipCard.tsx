import Amex from "@/assets/icons/cards/amex.svg";
import Diners from "@/assets/icons/cards/dinersclub.svg";
import Discover from "@/assets/icons/cards/discover.svg";
import JCB from "@/assets/icons/cards/jcb.svg";
import Maestro from "@/assets/icons/cards/maestro.svg";
import MasterCard from "@/assets/icons/cards/mastercard.svg";
import RuPay from "@/assets/icons/cards/rupay.svg";
import Visa from "@/assets/icons/cards/visa.svg";
import { CARD_TYPES } from "@/constants/cardTypes";
import { getCardType } from "@/utils/CardType";
import { formatCardNumber } from "@/utils/formatCardNumber";
import { maskAndFormatCardNumber } from "@/utils/mask";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { captureRef } from "react-native-view-shot";

export type PipCardHandle = {
  captureSnapshot: (options?: {
    format?: "png" | "jpg" | "webm";
    quality?: number;
  }) => Promise<string>;
};

type CardData = {
  bank: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv?: string;
  type?: string;
  dominantColor?: string;
};

type Props = {
  card?: CardData;
  showNumber?: boolean;
  style?: ViewStyle;
};

const PipCard = forwardRef<PipCardHandle, Props>(
  ({ card, showNumber = false, style }, ref) => {
    const containerRef = useRef<View | null>(null);

    useImperativeHandle(
      ref,
      () => ({
        captureSnapshot: async (options = {}) => {
          if (!containerRef.current) throw new Error("PipCard ref not set");
          const { format = "png", quality = 0.9 } = options;

          const uri = await captureRef(containerRef.current as View, {
            format,
            quality,
            result: "tmpfile",
          });

          return uri as string;
        },
      }),
      []
    );

    const bank = card?.bank ?? "Bank";
    const cardNumber = card?.cardNumber ?? "0000000000000000";
    const cardHolder = card?.cardHolder ?? "CARD HOLDER";
    const expiry = card?.expiry ?? "MM/YY";
    const cardColor = card?.dominantColor || "#4b7bec"; // Use card's color or fallback to blue
    const contentColor = "#FFFFFF"; // White text for PiP card
    const isDarkCard = false; // PiP card uses dark background

    return (
      <View ref={containerRef} collapsable={false} style={[styles.card, style]}>
        <Animated.View style={[styles.cardFront, { backgroundColor: cardColor }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.bankName, { color: contentColor, textShadowColor: isDarkCard ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }]}>
              {bank}
            </Text>
            <View style={styles.cardTypeIcon}>
              {(() => {
                const detectedCardType = getCardType(cardNumber);
                const iconProps = {
                  width: 32,
                  height: 20,
                  fill: contentColor,
                  color: contentColor,
                };

                if (detectedCardType === CARD_TYPES.VISA) {
                  return <Visa {...iconProps} />;
                }
                if (detectedCardType === CARD_TYPES.MASTERCARD) {
                  return <MasterCard {...iconProps} />;
                }
                if (detectedCardType === CARD_TYPES.AMEX) {
                  return <Amex {...iconProps} />;
                }
                if (detectedCardType === CARD_TYPES.DISCOVER) {
                  return <Discover {...iconProps} />;
                }
                if (detectedCardType === CARD_TYPES.RUPAY) {
                  return <RuPay {...iconProps} />;
                }
                if (detectedCardType === CARD_TYPES.MAESTRO) {
                  return <Maestro {...iconProps} />;
                }
                if (detectedCardType === CARD_TYPES.JCB) {
                  return <JCB {...iconProps} />;
                }
                if (detectedCardType === CARD_TYPES.DINERS) {
                  return <Diners {...iconProps} />;
                }
                return detectedCardType ? (
                  <Text style={[styles.cardTypeLabel, { color: contentColor, opacity: 0.7, fontSize: 10, fontWeight: 'bold' }]}>
                    {(detectedCardType as string).toUpperCase()}
                  </Text>
                ) : null;
              })()}
            </View>
          </View>

          <View style={styles.cardNumberRow}>
            <Text style={[styles.cardNumber, { color: contentColor }]}>
              {showNumber ? formatCardNumber(cardNumber) : maskAndFormatCardNumber(cardNumber)}
            </Text>
          </View>

          <View style={styles.cardInfoRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: isDarkCard ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }]}>Card Holder</Text>
              <Text numberOfLines={1} style={[styles.info, { color: contentColor }]}>{cardHolder}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
              <Text style={[styles.label, { color: isDarkCard ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)" }]}>Expiry</Text>
              <Text style={[styles.info, { color: contentColor }]}>{showNumber ? expiry : "•• / ••"}</Text>
            </View>
          </View>
        </Animated.View>
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
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  } as ViewStyle,

  cardFront: {
    width: 320,
    height: 200,
    borderRadius: 16,
    padding: 24,
    justifyContent: "space-between",
    overflow: "hidden",
  } as ViewStyle,

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  } as ViewStyle,

  cardTypeIcon: {
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  bankName: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 0.5,
  } as TextStyle,

  cardNumberRow: {
    marginBottom: 20,
  } as ViewStyle,

  cardNumber: {
    fontSize: 22,
    letterSpacing: 1.5,
    fontWeight: "700",
    lineHeight: 26,
  } as TextStyle,

  cardInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  } as ViewStyle,

  label: {
    fontSize: 12,
    marginBottom: 4,
  } as TextStyle,

  info: {
    fontSize: 16,
    fontWeight: "600",
  } as TextStyle,

  cardTypeLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "900",
    fontStyle: "italic",
  } as TextStyle,
});