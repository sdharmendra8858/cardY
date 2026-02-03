/**
 * Secure Storage with Fallback Support
 * 
 * Wraps the original secureStorage with fallback to old storage
 * Does NOT modify original secureStorage.ts
 */

import { maskAndFormatCardNumber } from "./mask";
import { getFallbackCard, readFallbackCards } from "./migration";
import {
    addCard,
    Card,
    clearCards,
    getMaskedCards as getOriginalMaskedCards,
    getUnmaskedCards as getOriginalUnmaskedCards,
    hasCards,
    revealCard as originalRevealCard,
    removeCard,
    setCards,
    STORAGE_KEY_MASKED,
    STORAGE_KEY_UNMASKED,
    toggleCardPin,
    updateCard,
} from "./secureStorage";

// Re-export everything from original
export {
    addCard, clearCards, hasCards, removeCard, setCards, STORAGE_KEY_MASKED,
    STORAGE_KEY_UNMASKED, toggleCardPin, updateCard
};

// Use Card type from original
    export type { Card };

/**
 * Get masked cards with fallback support
 */
export async function getMaskedCards(): Promise<Card[]> {
  try {
    const cards = await getOriginalMaskedCards();
    
    // If new storage is empty, try fallback to old storage
    if (cards.length === 0) {
      if (__DEV__) console.log("🔄 New storage empty, checking fallback...");
      const fallbackCards = await readFallbackCards();
      
      if (fallbackCards.length > 0) {
        if (__DEV__) console.log(`✅ Fallback: Returning ${fallbackCards.length} cards from old storage`);
        // Return masked version of fallback cards
        return fallbackCards.map((card) => ({
          ...card,
          cardNumber: maskAndFormatCardNumber(card.cardNumber),
          cvv: undefined,
          expiry: undefined,
        }));
      }
    }
    
    return cards;
  } catch (error) {
    console.error("❌ Failed to get masked cards, trying fallback:", error);
    
    // Critical error - try fallback
    try {
      const fallbackCards = await readFallbackCards();
      
      if (fallbackCards.length > 0) {
        if (__DEV__) console.log(`✅ Fallback: Returning ${fallbackCards.length} cards from old storage`);
        return fallbackCards.map((card) => ({
          ...card,
          cardNumber: maskAndFormatCardNumber(card.cardNumber),
          cvv: undefined,
          expiry: undefined,
        }));
      }
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
    }
    
    return [];
  }
}

/**
 * Get unmasked cards (no fallback needed - internal use only)
 */
export async function getUnmaskedCards(): Promise<Card[]> {
  return getOriginalUnmaskedCards();
}

/**
 * Reveal card with fallback support
 */
export async function revealCard(cardId: string): Promise<Card | null> {
  try {
    const card = await originalRevealCard(cardId);
    
    // If not found in new storage, try fallback
    if (!card) {
      if (__DEV__) console.log(`🔄 Card ${cardId} not in new storage, checking fallback...`);
      const fallbackCard = await getFallbackCard(cardId);
      
      if (fallbackCard) {
        if (__DEV__) console.log(`✅ Fallback: Found card ${cardId} in old storage`);
        return fallbackCard;
      }
    }
    
    return card;
  } catch (error) {
    console.error("❌ Failed to reveal card, trying fallback:", error);
    
    // Try fallback
    try {
      const fallbackCard = await getFallbackCard(cardId);
      
      if (fallbackCard) {
        if (__DEV__) console.log(`✅ Fallback: Found card ${cardId} in old storage`);
        return fallbackCard;
      }
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
    }
    
    return null;
  }
}
