/**
 * Secure Card Storage
 * Implements spec 7: Card Storage Flow
 *
 * Encrypts entire card array as single payload using AES-256-GCM
 * - No plaintext persisted at any point
 * - Encrypted blob stored in SecureStore
 */

import * as SecureStore from "expo-secure-store";
import {
    decryptCards,
    encryptCards,
    EncryptionResult,
} from "./encryption/cardEncryption";

const STORAGE_KEY_MASKED = "cards_masked";
const STORAGE_KEY_UNMASKED = "cards_unmasked";

// Export storage keys for use in other modules
export { STORAGE_KEY_MASKED, STORAGE_KEY_UNMASKED };

type Card = {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv?: string;
  cardName?: string;
  cardKind?: "credit" | "debit";
  cobrandName?: string;
  cardUser?: "self" | "other";
  dominantColor?: string;
  bank?: string;
  cardExpiresAt?: number;
};

/**
 * Get masked cards for list display
 *
 * @returns Array of masked cards
 */
export async function getMaskedCards(): Promise<Card[]> {
  try {
    if (__DEV__)
      console.log("🔓 Retrieving masked cards from secure storage...");

    const value = await SecureStore.getItemAsync(STORAGE_KEY_MASKED, {
      keychainService: STORAGE_KEY_MASKED,
    });

    if (!value) {
      if (__DEV__) console.log("ℹ️ No masked cards found in storage");
      return [];
    }

    // Parse the stored encryption result
    const encryptionResult: EncryptionResult = JSON.parse(value);

    // Decrypt the masked card data
    const decrypted = await decryptCards(encryptionResult);

    if (Array.isArray(decrypted)) {
      if (__DEV__) {
        console.log(
          `✅ Retrieved and decrypted ${decrypted.length} masked card(s)`
        );
        console.log(
          "💳 Masked cards info:",
          decrypted.map((card) => ({
            id: card.id,
            cardNumber: card.cardNumber, // This is the raw masked number as saved
            expiry: card.expiry, // Should be undefined in masked storage
            cardUser: card.cardUser, // "self" or "other"
            cardExpiresAt: card.cardExpiresAt, // Unix timestamp for validity
          }))
        );
      }
      return decrypted as Card[];
    }
    return [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to retrieve masked cards:", message);
    return [];
  }
}

/**
 * Get unmasked cards (for internal operations like add/remove)
 *
 * @returns Array of full cards
 */
export async function getUnmaskedCards(): Promise<Card[]> {
  try {
    const value = await SecureStore.getItemAsync(STORAGE_KEY_UNMASKED, {
      keychainService: STORAGE_KEY_UNMASKED,
    });

    if (!value) {
      return [];
    }

    const encryptionResult: EncryptionResult = JSON.parse(value);
    const decrypted = await decryptCards(encryptionResult);

    if (Array.isArray(decrypted)) {
      return decrypted as Card[];
    }
    return [];
  } catch (error) {
    console.error("❌ Failed to retrieve unmasked cards:", error);
    return [];
  }
}

/**
 * Reveal a specific card by decrypting its full data from unmasked storage
 *
 * @param cardId ID of the card to reveal
 * @returns The revealed card with full data, or null if not found
 */
export async function revealCard(cardId: string): Promise<Card | null> {
  try {
    if (__DEV__) console.log(`🔓 Revealing card: ${cardId}`);

    const cards = await getUnmaskedCards();
    const card = cards.find((c: Card) => c.id === cardId);

    if (card) {
      if (__DEV__) console.log(`✅ Revealed card: ${cardId}`);
      return card;
    }
    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to reveal card:", message);
    return null;
  }
}

/**
 * Save cards to secure storage (both masked and unmasked versions)
 *
 * Spec 7: Saving Cards
 * 1. Serialize card array to JSON
 * 2. Encrypt using AES-256-CBC
 * 3. Store encrypted blob in SecureStore
 * 4. No plaintext persisted at any point
 *
 * @param cards Array of cards to save
 * @throws Error if storage fails
 */
export async function setCards(cards: Card[]): Promise<void> {
  try {
    if (__DEV__) console.log(`🔒 Storing ${cards.length} card(s)...`);

    // Create masked version for list display
    // Keep cardUser and cardExpiresAt for categorization and validity tracking
    // Remove expiry (MM/YY) and CVV for security
    const maskedCards = cards.map((card) => ({
      ...card,
      cardNumber: maskCardNumber(card.cardNumber),
      cvv: undefined, // Remove CVV for masked storage
      expiry: undefined, // Remove expiry date (MM/YY) for masked storage
      // cardUser is kept for categorization (self vs other)
      // cardExpiresAt is kept for validity badges and auto-cleanup
    }));

    // Encrypt both versions
    const unmaskedEncryption = await encryptCards(cards);
    const maskedEncryption = await encryptCards(maskedCards);

    // Store both versions
    const unmaskedData = JSON.stringify(unmaskedEncryption);
    const maskedData = JSON.stringify(maskedEncryption);

    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEY_UNMASKED, unmaskedData, {
        keychainService: STORAGE_KEY_UNMASKED,
      }),
      SecureStore.setItemAsync(STORAGE_KEY_MASKED, maskedData, {
        keychainService: STORAGE_KEY_MASKED,
      }),
    ]);

    if (__DEV__)
      console.log(
        `✅ Cards encrypted and stored securely (masked + unmasked). Stored ${cards.length} cards.`
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to store cards:", message);
    throw new Error(`Card storage failed: ${message}`);
  }
}

/**
 * Mask a card number by showing only last 4 digits
 */
function maskCardNumber(cardNumber: string): string {
  if (!cardNumber || cardNumber.length < 4) return cardNumber;

  const clean = cardNumber.replace(/\D/g, "");
  if (clean.length <= 4) return clean;

  const masked = "X".repeat(clean.length - 4) + clean.slice(-4);

  // Add spaces every 4 characters for better readability
  return masked.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Add a new card to storage
 *
 * @param card Card to add
 * @throws Error if operation fails
 */
export async function addCard(card: Card): Promise<void> {
  try {
    if (__DEV__) console.log(`➕ Adding card: ${card.id}`);

    const existing = await getUnmaskedCards();
    if (__DEV__)
      console.log(`📊 Found ${existing.length} existing cards, adding 1 more`);

    const updatedCards = [...existing, card];
    await setCards(updatedCards);

    if (__DEV__)
      console.log(
        `✅ Card added successfully. Total cards: ${updatedCards.length}`
      );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to add card:", message);
    throw new Error(`Failed to add card: ${message}`);
  }
}

/**
 * Remove a card from storage
 *
 * @param cardId ID of card to remove
 * @throws Error if operation fails
 */
export async function removeCard(cardId: string): Promise<void> {
  try {
    if (__DEV__) console.log(`🗑️ Removing card: ${cardId}`);

    const existing = await getUnmaskedCards();
    const filtered = existing.filter((c: Card) => c.id !== cardId);

    await setCards(filtered);

    if (__DEV__) console.log("✅ Card removed successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to remove card:", message);
    throw new Error(`Failed to remove card: ${message}`);
  }
}

/**
 * Update an existing card in storage
 *
 * @param cardId ID of the card to update
 * @param updatedCard Updated card data
 * @throws Error if operation fails
 */
export async function updateCard(
  cardId: string,
  updatedCard: Card
): Promise<void> {
  try {
    if (__DEV__) console.log(`✏️ Updating card: ${cardId}`);

    const existing = await getUnmaskedCards();
    const updatedCards = existing.map((c: Card) =>
      c.id === cardId ? { ...c, ...updatedCard, id: cardId } : c
    );

    await setCards(updatedCards);

    if (__DEV__) console.log("✅ Card updated successfully");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to update card:", message);
    throw new Error(`Failed to update card: ${message}`);
  }
}

/**
 * Clear all cards from storage
 * Also deletes the master encryption key since it's no longer needed
 *
 * @returns true if successful
 */
export async function clearCards(): Promise<boolean> {
  try {
    if (__DEV__) console.log("🗑️ Clearing all cards from storage...");

    // Delete both masked and unmasked encrypted cards
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEY_MASKED, {
        keychainService: STORAGE_KEY_MASKED,
      }),
      SecureStore.deleteItemAsync(STORAGE_KEY_UNMASKED, {
        keychainService: STORAGE_KEY_UNMASKED,
      }),
    ]);

    // Also delete the master key since no cards remain
    const { deleteMasterKey } = await import("./encryption/masterKeyManager");
    await deleteMasterKey();

    if (__DEV__) console.log("✅ All cards and master key cleared");
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to clear cards:", message);
    return false;
  }
}

/**
 * Check if any cards are stored
 *
 * @returns true if cards exist
 */
export async function hasCards(): Promise<boolean> {
  try {
    const cards = await getMaskedCards();
    return cards.length > 0;
  } catch {
    return false;
  }
}
