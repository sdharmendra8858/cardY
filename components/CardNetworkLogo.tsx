import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { CARD_TYPES } from '@/constants/cardTypes';
import { getCardType as detectCardType } from '@/utils/CardType';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

import Amex from "@/assets/icons/cards/amex.svg";
import Diners from "@/assets/icons/cards/dinersclub.svg";
import Discover from "@/assets/icons/cards/discover.svg";
import JCB from "@/assets/icons/cards/jcb.svg";
import Maestro from "@/assets/icons/cards/maestro.svg";
import MasterCard from "@/assets/icons/cards/mastercard.svg";
import RuPay from "@/assets/icons/cards/rupay.svg";
import Visa from "@/assets/icons/cards/visa.svg";

interface CardNetworkLogoProps {
  cardNetwork?: string | null;
  cardNumber?: string | null;
  width?: number;
  height?: number;
  color?: string;
  showTextFallback?: boolean;
  style?: ViewStyle;
}

export default function CardNetworkLogo({
  cardNetwork: providedCardNetwork,
  cardNumber,
  width = 32,
  height = 20,
  color: providedColor,
  showTextFallback = true,
  style,
}: CardNetworkLogoProps) {
  const scheme = useColorScheme() ?? 'light';
  const theme = Colors[scheme];
  
  // Use provided color, or fallback to theme text color
  const color = providedColor || theme.text;
  // Use provided cardNetwork or detect it from cardNumber
  const cardNetwork = providedCardNetwork || (cardNumber ? detectCardType(cardNumber) : null);
  
  if (!cardNetwork) return null;

  const iconProps = {
    width,
    height,
    fill: color,
    color,
  };

  const getIcon = () => {
    switch (cardNetwork) {
      case CARD_TYPES.VISA: return <Visa {...iconProps} />;
      case CARD_TYPES.MASTERCARD: return <MasterCard {...iconProps} />;
      case CARD_TYPES.AMEX: return <Amex {...iconProps} />;
      case CARD_TYPES.RUPAY: return <RuPay {...iconProps} />;
      case CARD_TYPES.DISCOVER: return <Discover {...iconProps} />;
      case CARD_TYPES.MAESTRO: return <Maestro {...iconProps} />;
      case CARD_TYPES.JCB: return <JCB {...iconProps} />;
      case CARD_TYPES.DINERS: return <Diners {...iconProps} />;
      default: return null;
    }
  };

  const icon = getIcon();

  if (icon) {
    return <View style={[styles.container, style]}>{icon}</View>;
  }

  if (showTextFallback) {
    return (
      <View style={[styles.container, styles.textFallback, style]}>
        <Text style={[styles.fallbackText, { color }]}>
          {cardNetwork.toUpperCase()}
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  textFallback: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 36,
  },
  fallbackText: {
    fontSize: 10,
    fontWeight: "bold",
    opacity: 0.8,
  },
});
