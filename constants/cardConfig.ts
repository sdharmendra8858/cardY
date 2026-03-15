// constants/cardConfig.ts

export const SUPPORTED_CARD_LENGTHS = [14, 15, 16, 19] as const;

export type SupportedCardLength = typeof SUPPORTED_CARD_LENGTHS[number];

export const CARD_GROUPING_PATTERNS: Record<number, number[]> = {
  14: [4, 6, 4], // Diners
  15: [4, 6, 5], // Amex
  16: [4, 4, 4, 4], // Visa/Mastercard
  19: [4, 4, 4, 4, 3], // Maestro/RuPay/etc
};
