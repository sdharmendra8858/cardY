// utils/mask.ts
import { formatCardNumber } from "./formatCardNumber";

/**
 * Masks all digits except the last 4,
 * but uses the same visual grouping as formatCardNumber.
 */
export function maskAndFormatCardNumber(cardNumber: string): string {
  if (!cardNumber || typeof cardNumber !== "string") {
    return "";
  }

  const clean = cardNumber.replace(/\D/g, "");
  const visibleCount = 4;
  const maskedArray = clean
    .split("")
    .map((d, i) => (i < clean.length - visibleCount ? "X" : d));

  const maskedString = maskedArray.join("");
  return formatCardNumber(maskedString);
}
