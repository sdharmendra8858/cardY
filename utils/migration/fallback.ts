/**
 * Fallback System
 * 
 * Provides read-only access to old storage when new storage fails
 * Ensures users never lose access to their cards
 */

import { hasOldCards as checkOldCards, getOldCardById, readOldCards } from "./oldStorage";
import { transformCard, transformCards } from "./transformer";
import { NewCard } from "./types";

/* -------------------------------------------------------------------------- */
/*                          FALLBACK READ FUNCTIONS                            */
/* -------------------------------------------------------------------------- */

/**
 * Read cards from old storage and transform to new format
 * Used as fallback when new storage is empty or fails
 * 
 * @returns Array of cards in new format (transformed from old storage)
 */
export async function readFallbackCards(): Promise<NewCard[]> {
  if (__DEV__) console.log("🔄 Reading from fallback storage...");

  try {
    // Read from old storage
    const oldCards = await readOldCards();

    if (oldCards.length === 0) {
      if (__DEV__) console.log("ℹ️ No cards in fallback storage");
      return [];
    }

    // Transform to new format
    const newCards = transformCards(oldCards);

    if (__DEV__) console.log(`✅ Fallback: Returning ${newCards.length} cards from old storage`);

    return newCards;
  } catch (error) {
    console.error("❌ Fallback read failed:", error);
    return [];
  }
}

/**
 * Check if fallback storage has cards
 * Used to detect if app is running in fallback mode
 */
export async function hasFallbackCards(): Promise<boolean> {
  return checkOldCards();
}

/**
 * Get a specific card from fallback storage by ID
 * Used for reveal functionality in fallback mode
 * 
 * @param cardId - ID of card to retrieve
 * @returns Card in new format or null if not found
 */
export async function getFallbackCard(cardId: string): Promise<NewCard | null> {
  try {
    const oldCard = await getOldCardById(cardId);

    if (!oldCard) {
      return null;
    }

    // Transform to new format
    const newCard = transformCard(oldCard);

    if (__DEV__) console.log(`✅ Fallback: Found card ${cardId} in old storage`);

    return newCard;
  } catch (error) {
    console.error(`❌ Fallback: Failed to get card ${cardId}:`, error);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                          FALLBACK MODE DETECTION                            */
/* -------------------------------------------------------------------------- */

/**
 * Check if app is currently running in fallback mode
 * Fallback mode = has old cards but no new cards
 * 
 * @returns true if in fallback mode, false otherwise
 */
export async function isInFallbackMode(): Promise<boolean> {
  try {
    // Check if we have old cards
    const hasOld = await hasFallbackCards();

    if (!hasOld) {
      return false;
    }

    // Check if we have new cards
    const { getMaskedCards } = await import("../secureStorage");
    const newCards = await getMaskedCards();

    // In fallback mode if we have old cards but no new cards
    const inFallback = hasOld && newCards.length === 0;

    if (inFallback && __DEV__) {
      console.log("⚠️ App is running in fallback mode");
    }

    return inFallback;
  } catch (error) {
    console.error("❌ Failed to check fallback mode:", error);
    return false;
  }
}
