// utils/cardType.ts
import { CARD_TYPES, CardType } from "@/constants/cardTypes";

export function getCardType(cardNumber: string): CardType | null {
  const digits = cardNumber.replace(/\D/g, "");

  if (/^4/.test(digits)) return CARD_TYPES.VISA;
  if (/^(5[1-5]|2[2-7])/.test(digits)) return CARD_TYPES.MASTERCARD;
  if (/^3[47]/.test(digits)) return CARD_TYPES.AMEX;
  if (/^6(?:011|5|4[4-9]|22)/.test(digits)) return CARD_TYPES.DISCOVER;
  if (/^(50|56|57|58|6[0-9])/.test(digits)) return CARD_TYPES.MAESTRO;
  if (/^(60|65|81|82|508|353)/.test(digits)) return CARD_TYPES.RUPAY;
  if (/^3(?:0[0-5]|[68]\d)/.test(digits)) return CARD_TYPES.DINERS;
  if (/^35(2[89]|[3-8][0-9])/.test(digits)) return CARD_TYPES.JCB;

  return null;
}
