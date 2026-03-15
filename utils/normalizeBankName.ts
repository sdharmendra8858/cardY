/**
 * Bank Name Normalization Utility
 * 
 * Ensures consistent capitalization of bank names throughout the app
 * Converts bank names to Title Case for better readability
 */

/**
 * Normalize bank name to Title Case
 * 
 * Examples:
 * - "HDFC BANK" → "Hdfc Bank"
 * - "hdfc bank" → "Hdfc Bank"
 * - "HdFc BaNk" → "Hdfc Bank"
 * - "STATE BANK OF INDIA" → "State Bank Of India"
 * 
 * @param bankName - Bank name in any case
 * @returns Bank name in Title Case, or undefined if input is empty
 */
export function normalizeBankName(bankName?: string): string | undefined {
  if (!bankName || typeof bankName !== "string") {
    return undefined;
  }

  // Trim whitespace
  const trimmed = bankName.trim();
  
  if (trimmed.length === 0) {
    return undefined;
  }

  // Convert to Title Case
  // Split by spaces, capitalize first letter of each word, lowercase the rest
  const titleCase = trimmed
    .toLowerCase()
    .split(/\s+/)
    .map(word => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

  return titleCase;
}

/**
 * Normalize multiple bank names
 * 
 * @param bankNames - Array of bank names
 * @returns Array of normalized bank names (undefined values filtered out)
 */
export function normalizeBankNames(bankNames: (string | undefined)[]): string[] {
  return bankNames
    .map(normalizeBankName)
    .filter((name): name is string => name !== undefined);
}
