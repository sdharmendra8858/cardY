/**
 * Old Storage Access
 * 
 * Handles reading and deleting cards from old storage (SecureStore)
 * Read-only operations for fallback and migration purposes
 */

import * as SecureStore from "expo-secure-store";
import { OLD_STORAGE_KEYS, OldCard } from "./types";

/* -------------------------------------------------------------------------- */
/*                          READ FROM OLD STORAGE                              */
/* -------------------------------------------------------------------------- */

/**
 * Read cards from old SecureStore storage
 * Tries multiple storage keys and formats
 * 
 * @returns Array of old cards or empty array if none found
 */
export async function readOldCards(): Promise<OldCard[]> {
  if (__DEV__) console.log("🔍 Reading from old storage...");

  // Try main storage key first (cards_encrypted - your actual old key)
  const encryptedCards = await tryReadFromKey(OLD_STORAGE_KEYS.ENCRYPTED);
  if (encryptedCards.length > 0) {
    if (__DEV__) console.log(`✅ Found ${encryptedCards.length} cards in old encrypted storage`);
    return encryptedCards;
  }

  // Try unmasked storage (fallback for other formats)
  const unmaskedCards = await tryReadFromKey(OLD_STORAGE_KEYS.UNMASKED);
  if (unmaskedCards.length > 0) {
    if (__DEV__) console.log(`✅ Found ${unmaskedCards.length} cards in old unmasked storage`);
    return unmaskedCards;
  }

  // Try masked storage (fallback for other formats)
  const maskedCards = await tryReadFromKey(OLD_STORAGE_KEYS.MASKED);
  if (maskedCards.length > 0) {
    if (__DEV__) console.log(`✅ Found ${maskedCards.length} cards in old masked storage`);
    return maskedCards;
  }

  if (__DEV__) console.log("ℹ️ No cards found in old storage");
  return [];
}

/**
 * Try to read cards from a specific storage key
 * Handles both encrypted and plain JSON formats
 */
async function tryReadFromKey(key: string): Promise<OldCard[]> {
  try {
    const value = await SecureStore.getItemAsync(key, {
      keychainService: key,
    });

    if (!value) {
      return [];
    }

    const parsed = JSON.parse(value);

    // Check if encrypted (main branch format)
    if (parsed.ciphertext && parsed.iv && parsed.tag) {
      return await tryDecryptCards(parsed);
    }

    // Plain JSON format (PR#41 format)
    if (Array.isArray(parsed)) {
      return parsed as OldCard[];
    }

    return [];
  } catch (error) {
    if (__DEV__) console.log(`ℹ️ Could not read from ${key}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Try to decrypt cards using old encryption method
 */
async function tryDecryptCards(encryptedData: any): Promise<OldCard[]> {
  try {
    const { decryptCards } = await import("../encryption/cardEncryption");
    const decrypted = await decryptCards(encryptedData);

    if (Array.isArray(decrypted)) {
      return decrypted as OldCard[];
    }

    return [];
  } catch (error) {
    if (__DEV__) console.warn("⚠️ Failed to decrypt old cards:", error instanceof Error ? error.message : String(error));
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/*                        DELETE FROM OLD STORAGE                              */
/* -------------------------------------------------------------------------- */

/**
 * Delete all old storage keys
 * Should only be called after successful migration verification
 */
export async function deleteOldCards(): Promise<void> {
  if (__DEV__) console.log("🧹 Deleting old storage...");

  const deletePromises = Object.values(OLD_STORAGE_KEYS).map(async (key) => {
    try {
      await SecureStore.deleteItemAsync(key, { keychainService: key });
      if (__DEV__) console.log(`✅ Deleted old storage key: ${key}`);
    } catch (error) {
      // Ignore errors - key might not exist
      if (__DEV__) console.log(`ℹ️ Could not delete ${key} (may not exist)`);
    }
  });

  await Promise.allSettled(deletePromises);
  if (__DEV__) console.log("✅ Old storage cleanup completed");
}

/* -------------------------------------------------------------------------- */
/*                          CHECK OLD STORAGE                                  */
/* -------------------------------------------------------------------------- */

/**
 * Check if old storage has any cards
 * Useful for detecting fallback mode
 */
export async function hasOldCards(): Promise<boolean> {
  const cards = await readOldCards();
  return cards.length > 0;
}

/**
 * Get a specific card from old storage by ID
 * Used for reveal functionality in fallback mode
 */
export async function getOldCardById(cardId: string): Promise<OldCard | null> {
  const cards = await readOldCards();
  return cards.find(c => c.id === cardId) || null;
}
