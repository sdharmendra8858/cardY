// utils/mask.ts
import { formatCardNumber, getCardGroups } from "./formatCardNumber";

/**
 * Masks all digits except the last group,
 * but uses the same visual grouping as formatCardNumber.
 */
export function maskAndFormatCardNumber(cardNumber: string): string {
  if (!cardNumber || typeof cardNumber !== "string") {
    return "";
  }

  const clean = cardNumber.replace(/\D/g, "");

  // SAFEGUARD: If the input already looks masked (contains 'x' and only a few digits),
  // don't try to mask it again, as we'll lose the original suffix.
  if (cardNumber.toLowerCase().includes('x') && clean.length <= 5) {
    return formatCardNumber(cardNumber);
  }

  // Get grouping for this card length
  const groups = getCardGroups(clean.length);
  // Unmask only the last group (e.g., 5 for Amex, 3 for 19-digit, 4 for standard)
  const visibleCount = groups.length > 0 ? groups[groups.length - 1] : 4;
  
  const maskedArray = clean
    .split("")
    .map((d, i) => (i < clean.length - visibleCount ? "x" : d));

  const maskedString = maskedArray.join("");
  return formatCardNumber(maskedString);
}

/**
 * Masks expiry date to "xx/xx"
 */
export function maskExpiry(expiry?: string): string {
  if (!expiry) return "xx/xx";
  return "xx/xx";
}
