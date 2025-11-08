// constants/cardTypes.ts
export const CARD_TYPES = {
  VISA: "Visa",
  MASTERCARD: "MasterCard",
  AMEX: "American Express",
  RUPAY: "RuPay",
  DISCOVER: "Discover",
  MAESTRO: "Maestro",
  JCB: "JCB",
  DINERS: "Diners Club",
} as const;

export type CardType = (typeof CARD_TYPES)[keyof typeof CARD_TYPES];
