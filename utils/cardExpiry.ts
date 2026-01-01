/**
 * Card Expiry Management
 * Handles automatic removal of imported cards when they expire
 */

import { getCards, setCards } from "./secureStorage";

/**
 * Check and remove expired cards
 * Should be called periodically (e.g., on app launch, when cards are accessed)
 * 
 * @returns Array of card IDs that were removed
 */
export async function cleanupExpiredCards(): Promise<string[]> {
  try {
    const cards = await getCards();
    const now = Math.floor(Date.now() / 1000);
    const expiredCardIds: string[] = [];

    // Filter out expired cards
    const activeCards = cards.filter((card) => {
      if (card.cardExpiresAt && now > card.cardExpiresAt) {
        expiredCardIds.push(card.id);
        console.log(`🗑️ Card expired and removed: ${card.id} (expired at ${new Date(card.cardExpiresAt * 1000).toISOString()})`);
        return false; // Remove this card
      }
      return true; // Keep this card
    });

    // Update storage if any cards were removed
    if (expiredCardIds.length > 0) {
      await setCards(activeCards);
      console.log(`✅ Cleaned up ${expiredCardIds.length} expired card(s)`);
    }

    return expiredCardIds;
  } catch (error) {
    console.error("❌ Failed to cleanup expired cards:", error);
    return [];
  }
}

/**
 * Check if a card is expired
 * 
 * @param cardExpiresAt Unix timestamp when card expires
 * @returns true if card is expired
 */
export function isCardExpired(cardExpiresAt?: number): boolean {
  if (!cardExpiresAt) return false;
  const now = Math.floor(Date.now() / 1000);
  return now > cardExpiresAt;
}

/**
 * Get time remaining until card expires
 * 
 * @param cardExpiresAt Unix timestamp when card expires
 * @returns Remaining time in seconds, or -1 if already expired
 */
export function getCardTimeRemaining(cardExpiresAt?: number): number {
  if (!cardExpiresAt) return -1;
  const now = Math.floor(Date.now() / 1000);
  return cardExpiresAt - now;
}

/**
 * Format remaining time as human-readable string
 * 
 * @param seconds Remaining time in seconds
 * @returns Formatted string (e.g., "30 minutes", "2 hours")
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Expired";
  
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  return `${seconds} second${seconds > 1 ? "s" : ""}`;
}
