import { CARD_GROUPING_PATTERNS } from "@/constants/cardConfig";

/**
 * Get the grouping pattern for a card number based on its length
 */
export function getCardGroups(length: number): number[] {
  if (CARD_GROUPING_PATTERNS[length]) {
    return CARD_GROUPING_PATTERNS[length];
  }
  
  // Default: Groups of 4
  const groups: number[] = [];
  for (let i = 0; i < length; i += 4) {
    groups.push(Math.min(4, length - i));
  }
  return groups;
}

/**
 * Format card number into grouped blocks (supports masked symbols like • or x)
 */
export function formatCardNumber(cardNumber: string): string {
  if (!cardNumber) return "";

  // Allow digits and masking chars (• or x or X)
  const clean = cardNumber.replace(/[^0-9xX]/gi, "");
  const groups = getCardGroups(clean.length);

  const parts: string[] = [];
  let index = 0;

  for (const size of groups) {
    const chunk = clean.slice(index, index + size);
    if (chunk) parts.push(chunk);
    index += size;
  }

  return parts.join(" ");
}
