// utils/formatCardNumber.ts

/**
 * Format card number into grouped blocks (supports masked symbols like • or x)
 */
export function formatCardNumber(cardNumber: string): string {
  if (!cardNumber) return "";

  // Allow digits and masking chars (• or x)
  const clean = cardNumber.replace(/[^0-9x]/g, "");
  const len = clean.length;
  let groups: number[] = [];

  // Define grouping pattern by length
  if (len === 16) groups = [4, 4, 4, 4];
  else if (len === 15) groups = [4, 6, 5];
  else if (len === 14) groups = [4, 6, 4];
  else if (len === 13) groups = [4, 4, 5];
  else groups = [4, 4, 4, 4]; // fallback

  const parts: string[] = [];
  let index = 0;

  for (const size of groups) {
    const chunk = clean.slice(index, index + size);
    if (chunk) parts.push(chunk);
    index += size;
  }

  return parts.join(" ");
}
