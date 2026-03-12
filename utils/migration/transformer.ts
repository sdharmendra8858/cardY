/**
 * Card Transformer
 * 
 * Transforms old card format to new card format
 * Handles field mapping, defaults, and card type detection
 */

import { BANK_OPTIONS } from "@/constants/banks";
import { NewCard, OldCard } from "./types";

/* -------------------------------------------------------------------------- */
/*                          BANK NAME MATCHING                                 */
/* -------------------------------------------------------------------------- */

/**
 * Match old bank name to new bank list
 * If match found, use the standardized name
 * If no match, return the original name as-is (will be treated as custom bank)
 */
function matchBankName(oldBankName?: string): string | undefined {
  if (!oldBankName) {
    return undefined;
  }

  // Normalize for comparison (uppercase, trim)
  const normalized = oldBankName.toUpperCase().trim();

  // Check if bank exists in our list (case-insensitive)
  const matchedBank = BANK_OPTIONS.find(
    (option) => option.value.toUpperCase() === normalized
  );

  if (matchedBank) {
    // Found a match - use the standardized name
    return matchedBank.value;
  }

  // No match - return original name (will be treated as custom bank in UI)
  return oldBankName;
}

/* -------------------------------------------------------------------------- */
/*                          CARD TYPE DETECTION                                */
/* -------------------------------------------------------------------------- */

/**
 * Detect card network type from card number
 * Uses industry-standard BIN (Bank Identification Number) patterns
 */
export function detectCardType(cardNumber: string): string {
  // Remove all non-digit characters
  const cleaned = cardNumber.replace(/\D/g, "");

  // Check patterns (order matters for some overlapping ranges)
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
/*                          CARD TRANSFORMATION                                */
/* -------------------------------------------------------------------------- */

/**
 * Transform old card to new card format
 * Adds missing fields and applies defaults
 * 
 * @param oldCard - Card in old format
 * @returns Card in new format with all fields populated
 */
export function transformCard(oldCard: OldCard): NewCard {
  // Auto-detect card type if not present
  const cardType = detectCardType(oldCard.cardNumber);

  // Match bank name to new bank list (or keep original if no match)
  const bank = matchBankName(oldCard.bank);

  // Transform to new format
  const newCard: NewCard = {
    // Copy all existing fields
    id: oldCard.id,
    cardNumber: oldCard.cardNumber,
    cardHolder: oldCard.cardHolder,
    expiry: oldCard.expiry || undefined, // Make optional
    cvv: oldCard.cvv,
    cardName: oldCard.cardName,
    cardKind: oldCard.cardKind,
    cobrandName: oldCard.cobrandName,
    cardUser: oldCard.cardUser,
    dominantColor: oldCard.dominantColor,
    
    // Use matched bank name (or original if no match)
    bank,

    // Preserve imported card expiry info
    cardExpiresAt: oldCard.cardExpiresAt,

    // Preserve pinning info (default to false if not present)
    isPinned: oldCard.isPinned ?? false,

    // Add new field: card type
    cardType,
  };

  if (__DEV__) {
    const isMatched = BANK_OPTIONS.some(
      (option) => option.value.toUpperCase() === bank?.toUpperCase()
    );
    console.log(`🔄 Transformed card ${oldCard.id}:`, {
      cardType,
      bank: newCard.bank,
      bankMatched: isMatched ? "yes" : "custom",
      hasExpiry: !!oldCard.expiry,
      hasCardExpiresAt: !!oldCard.cardExpiresAt,
      isPinned: newCard.isPinned,
    });
  }

  return newCard;
}

/**
 * Transform multiple cards
 * 
 * @param oldCards - Array of cards in old format
 * @returns Array of cards in new format
 */
export function transformCards(oldCards: OldCard[]): NewCard[] {
  if (__DEV__) console.log(`🔄 Transforming ${oldCards.length} cards...`);

  const newCards = oldCards.map(transformCard);

  if (__DEV__) console.log(`✅ Transformed ${newCards.length} cards successfully`);

  return newCards;
}

/* -------------------------------------------------------------------------- */
/*                          VALIDATION HELPERS                                 */
/* -------------------------------------------------------------------------- */

/**
 * Validate that a card has all required fields
 * 
 * @param card - Card to validate
 * @returns true if valid, false otherwise
 */
export function isValidCard(card: NewCard): boolean {
  return !!(
    card.id &&
    card.cardNumber &&
    card.cardHolder
  );
}

/**
 * Validate multiple cards
 * 
 * @param cards - Cards to validate
 * @returns Object with valid cards and invalid card IDs
 */
export function validateCards(cards: NewCard[]): {
  valid: NewCard[];
  invalid: string[];
} {
  const valid: NewCard[] = [];
  const invalid: string[] = [];

  for (const card of cards) {
    if (isValidCard(card)) {
      valid.push(card);
    } else {
      invalid.push(card.id || "unknown");
    }
  }

  if (invalid.length > 0) {
    console.warn(`⚠️ Found ${invalid.length} invalid cards:`, invalid);
  }

  return { valid, invalid };
}

/* -------------------------------------------------------------------------- */
/*                          SPECIAL HANDLING                                   */
/* -------------------------------------------------------------------------- */

/**
 * Check if card is an imported card (from another user)
 * Imported cards have special expiry handling
 */
export function isImportedCard(card: NewCard): boolean {
  return card.cardUser === "other" && !!card.cardExpiresAt;
}

/**
 * Check if imported card has expired
 * 
 * @param card - Card to check
 * @returns true if expired, false otherwise
 */
export function isImportedCardExpired(card: NewCard): boolean {
  if (!isImportedCard(card)) {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  return now > (card.cardExpiresAt || 0);
}

/**
 * Filter out expired imported cards
 * 
 * @param cards - Cards to filter
 * @returns Cards with expired imports removed
 */
export function filterExpiredImports(cards: NewCard[]): NewCard[] {
  const filtered = cards.filter(card => !isImportedCardExpired(card));

  const removedCount = cards.length - filtered.length;
  if (removedCount > 0) {
    if (__DEV__) console.log(`🗑️ Filtered out ${removedCount} expired imported card(s)`);
  }

  return filtered;
}
