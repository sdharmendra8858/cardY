/**
 * Shared card validation utilities
 */

/**
 * Performs a Luhn algorithm check on a numeric string to verify card number validity.
 * @param raw The raw card number string (should be digits only)
 * @returns boolean True if the number passes the Luhn check
 */
export function luhnCheck(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");

  // Basic length validation (most cards are between 13 and 19 digits)
  if (digits.length < 13 || digits.length > 19) return false;
  
  // Basic sanity check: not all same digits
  if (/^(\d)\1+$/.test(digits)) return false;

  let sum = 0;
  let shouldDouble = false;

  // Luhn algorithm implementation
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}
