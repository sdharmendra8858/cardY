/**
 * Fallback Storage System
 * 
 * Provides read-only access to old storage if new storage fails
 * Ensures users never lose access to their cards
 */

import * as SecureStore from "expo-secure-store";
import { Card } from "../secureStorage";

/* -------------------------------------------------------------------------- */
/*                              OLD STORAGE KEYS                               */
/* -------------------------------------------------------------------------- */

const OLD_STORAGE_KEYS = {
  ENCRYPTED: "cards_encrypted",
  MASKED: "cards_masked",
  UNMASKED: "cards_unmasked",
};

/* -------------------------------------------------------------------------- */
/*                            FALLBACK CARD TYPE                               */
/* -------------------------------------------------------------------------- */

/**
 * Old card format that might be missing new fields
 */
type OldCard = {
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
  isPinned?: boolean;
  // Missing in old format:
  // - cardType (auto-detected card network)
};

/* -------------------------------------------------------------------------- */
/*                          CARD MODEL ALIGNMENT                               */
/* -------------------------------------------------------------------------- */

/**
 * Convert old card format to new card format
 * Fills in missing fields with sensible defaults
 */
function alignCardModel(oldCard: OldCard): Card {
  // Auto-detect card type from card number if missing
  const cardType = detectCardType(oldCard.cardNumber);

  return {
    ...oldCard,
    expiry: oldCard.expiry || "", // Make optional fields have defaults
    // Ensure all required fields exist
    id: oldCard.id,
    cardNumber: oldCard.cardNumber,
    cardHolder: oldCard.cardHolder,
  };
}

/**
 * Detect card type from card number
 */
function detectCardType(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, "");
  
  if (/^4/.test(cleaned)) return "visa";
  if (/^5[1-5]/.test(cleaned)) return "mastercard";
  if (/^3[47]/.test(cleaned)) return "amex";
  if (/^6(?:011|5)/.test(cleaned)) return "discover";
  if (/^35/.test(cleaned)) return "jcb";
  if (/^3(?:0[0-5]|[68])/.test(cleaned)) return "dinersclub";
  if (/^(?:5[06789]|6)/.test(cleaned)) return "maestro";
  if (/^(?:6521|6522)/.test(cleaned)) return "rupay";
  
  return "unknown";
}

/* -------------------------------------------------------------------------- */
/*                          FALLBACK READ FUNCTIONS                            */
/* -------------------------------------------------------------------------- */

/**
 * Try to read cards from old storage (fallback mode)
 * Returns aligned cards that match the new model
 */
export async function readOldStorageAsFallback(): Promise<Card[]> {
  if (__DEV__) console.log("🔄 Attempting to read from old storage (fallback mode)...");

  // Try unmasked storage first (most complete data)
  try {
    const value = await SecureStore.getItemAsync(OLD_STORAGE_KEYS.UNMASKED, {
      keychainService: OLD_STORAGE_KEYS.UNMASKED,
    });
    
    if (value) {
      const parsed = JSON.parse(value);
      
      // Check if encrypted
      if (parsed.ciphertext && parsed.iv && parsed.tag) {
        try {
          const { decryptCards } = await import("../encryption/cardEncryption");
          const decrypted = await decryptCards(parsed);
          if (Array.isArray(decrypted) && decrypted.length > 0) {
            if (__DEV__) console.log(`✅ Fallback: Found ${decrypted.length} cards in old encrypted storage`);
            return decrypted.map(alignCardModel);
          }
        } catch (decryptError) {
          if (__DEV__) console.warn("⚠️ Fallback: Failed to decrypt old cards");
        }
      } else if (Array.isArray(parsed)) {
        if (__DEV__) console.log(`✅ Fallback: Found ${parsed.length} cards in old plain storage`);
        return parsed.map(alignCardModel);
      }
    }
  } catch (error) {
    if (__DEV__) console.log("ℹ️ Fallback: No cards in cards_unmasked");
  }

  // Try masked storage
  try {
    const value = await SecureStore.getItemAsync(OLD_STORAGE_KEYS.MASKED, {
      keychainService: OLD_STORAGE_KEYS.MASKED,
    });
    
    if (value) {
      const parsed = JSON.parse(value);
      
      if (parsed.ciphertext && parsed.iv && parsed.tag) {
        try {
          const { decryptCards } = await import("../encryption/cardEncryption");
          const decrypted = await decryptCards(parsed);
          if (Array.isArray(decrypted) && decrypted.length > 0) {
            if (__DEV__) console.log(`✅ Fallback: Found ${decrypted.length} cards in old masked storage`);
            return decrypted.map(alignCardModel);
          }
        } catch (decryptError) {
          if (__DEV__) console.warn("⚠️ Fallback: Failed to decrypt masked cards");
        }
      } else if (Array.isArray(parsed)) {
        if (__DEV__) console.log(`✅ Fallback: Found ${parsed.length} cards in old masked storage`);
        return parsed.map(alignCardModel);
      }
    }
  } catch (error) {
    if (__DEV__) console.log("ℹ️ Fallback: No cards in cards_masked");
  }

  // Try PR#41 format
  try {
    const value = await SecureStore.getItemAsync(OLD_STORAGE_KEYS.ENCRYPTED, {
      keychainService: OLD_STORAGE_KEYS.ENCRYPTED,
    });
    
    if (value) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (__DEV__) console.log(`✅ Fallback: Found ${parsed.length} cards in PR#41 format`);
        return parsed.map(alignCardModel);
      }
    }
  } catch (error) {
    if (__DEV__) console.log("ℹ️ Fallback: No cards in cards_encrypted");
  }

  if (__DEV__) console.log("ℹ️ Fallback: No cards found in any old storage");
  return [];
}

/**
 * Check if old storage has cards (for fallback detection)
 */
export async function hasOldStorageCards(): Promise<boolean> {
  const cards = await readOldStorageAsFallback();
  return cards.length > 0;
}

/**
 * Get a specific card from old storage (for reveal functionality)
 */
export async function revealOldStorageCard(cardId: string): Promise<Card | null> {
  const cards = await readOldStorageAsFallback();
  return cards.find(c => c.id === cardId) || null;
}
