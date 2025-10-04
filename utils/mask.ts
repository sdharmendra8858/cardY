export function maskAndFormatCardNumber(cardNumber: string) {
  if (!cardNumber || typeof cardNumber !== "string") {
    throw new Error("Invalid card number");
  }

  const lastFour = cardNumber.slice(-4); // Get the last 4 digits
  let masked = "";

  if (cardNumber.length === 16) {
    // Mask and format for 16-digit card
    masked = "xxxx xxxx xxxx " + lastFour;
  } else if (cardNumber.length === 14) {
    // Mask and format for 14-digit card
    masked = "xxxx xxxxxx " + lastFour;
  } else {
    masked = "xxxx xxxx xxxx " + lastFour; // Default to 16-digit format
    // throw new Error("Unsupported card number length");
  }

  return masked;
}
