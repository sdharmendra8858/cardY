import {
  decryptCards,
  encryptCards,
  EncryptionResult,
} from "@/utils/encryption/cardEncryption";
import { deleteMasterKey } from "@/utils/encryption/masterKeyManager";
import { maskAndFormatCardNumber } from "@/utils/mask";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type Card = {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiry?: string;
  cvv?: string;
  cardName?: string;
  cardKind?: "credit" | "debit";
  cobrandName?: string;
  cardUser?: "self" | "other";
  dominantColor?: string;
  bank?: string;
  cardExpiresAt?: number;
  isPinned?: boolean;
};

/* -------------------------------------------------------------------------- */
/*                                  STORAGE KEYS                               */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY_UNMASKED = "encrypted_cards_unmasked";
const STORAGE_KEY_MASKED = "encrypted_cards_masked";

export { STORAGE_KEY_MASKED, STORAGE_KEY_UNMASKED };

/* -------------------------------------------------------------------------- */
/*                               INTERNAL HELPERS                              */
/* -------------------------------------------------------------------------- */

async function readCards(
  key: string
): Promise<Card[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];

  const parsed: EncryptionResult = JSON.parse(raw);
  
  try {
    const decrypted = await decryptCards(parsed);
    if (!Array.isArray(decrypted)) {
      throw new Error("INVALID_DECRYPTED_DATA");
    }
    return decrypted as Card[];
  } catch (error) {
    console.warn(`⚠️ Failed to decrypt cards for key ${key} (likely key rotation). Clearing old data.`);
    // Data is unreadable due to key mismatch. Clear it to prevent persistent crashes.
    await AsyncStorage.removeItem(key);
    return [];
  }
}

async function writeCards(
  unmasked: Card[],
  masked: Card[]
): Promise<void> {
  const encryptedUnmasked = await encryptCards(unmasked);
  const encryptedMasked = await encryptCards(masked);

  await AsyncStorage.setItem(
    STORAGE_KEY_UNMASKED,
    JSON.stringify(encryptedUnmasked)
  );
  await AsyncStorage.setItem(
    STORAGE_KEY_MASKED,
    JSON.stringify(encryptedMasked)
  );
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                    */
/* -------------------------------------------------------------------------- */

export async function getUnmaskedCards(): Promise<Card[]> {
  return readCards(STORAGE_KEY_UNMASKED);
}

export async function getMaskedCards(): Promise<Card[]> {
  return readCards(STORAGE_KEY_MASKED);
}

export async function setCards(cards: Card[]): Promise<void> {
  const masked = cards.map((card) => ({
    ...card,
    cardNumber: maskAndFormatCardNumber(card.cardNumber),
    cvv: undefined,
    expiry: undefined,
  }));

  await writeCards(cards, masked);
}

export async function addCard(card: Card): Promise<void> {
  const existing = await getUnmaskedCards();
  await setCards([...existing, card]);
}

export async function removeCard(cardId: string): Promise<void> {
  const existing = await getUnmaskedCards();
  const filtered = existing.filter((c) => c.id !== cardId);

  await setCards(filtered);
  await maybeDeleteMasterKey(); // ✅ safe
}

export async function updateCard(
  cardId: string,
  updatedCard: Card
): Promise<void> {
  const existing = await getUnmaskedCards();
  const updated = existing.map((c) =>
    c.id === cardId ? { ...c, ...updatedCard, id: cardId } : c
  );
  await setCards(updated);
}

export async function clearCards(): Promise<boolean> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEY_UNMASKED,
      STORAGE_KEY_MASKED,
    ]);
    await maybeDeleteMasterKey(); // ✅ same logic
    return true;
  } catch {
    return false;
  }
}

export async function revealCard(cardId: string): Promise<Card | null> {
  const existing = await getUnmaskedCards();
  return existing.find((c) => c.id === cardId) || null;
}

export async function hasCards(): Promise<boolean> {
  const cards = await getMaskedCards();
  return cards.length > 0;
}

export async function toggleCardPin(cardId: string, shouldPin: boolean): Promise<void> {
  const allCards = await getUnmaskedCards();
  const targetCardIndex = allCards.findIndex((c) => c.id === cardId);
  
  if (targetCardIndex === -1) {
    console.warn(`toggleCardPin: Card ${cardId} not found`);
    return;
  }

  const targetCard = allCards[targetCardIndex];
  
  // 1. Identify category (self or other)
  const isSelf = !targetCard.cardUser || targetCard.cardUser === "self";
  
  // 2. Separate cards by category to handles limits independently
  let categoryCards = allCards.filter(c => 
    isSelf 
      ? (!c.cardUser || c.cardUser === "self")
      : (c.cardUser === "other")
  );
  
  const otherCategoryCards = allCards.filter(c => 
    isSelf 
      ? (c.cardUser === "other")
      : (!c.cardUser || c.cardUser === "self")
  );
  
  // 3. Remove target from its category list for manipulation
  categoryCards = categoryCards.filter(c => c.id !== cardId);
  
  // Update target
  const updatedTarget = { ...targetCard, isPinned: shouldPin };
  
  if (shouldPin) {
    // 4. Handle Max 3 Limit
    const pinnedCards = categoryCards.filter(c => c.isPinned);
    if (pinnedCards.length >= 3) {
      // Find the last pinned card (oldest pinned) to unpin
      let lastPinnedIndex = -1;
      for (let i = categoryCards.length - 1; i >= 0; i--) {
        if (categoryCards[i].isPinned) {
          lastPinnedIndex = i;
          break;
        }
      }
      
      if (lastPinnedIndex !== -1) {
        // Unpin it
        categoryCards[lastPinnedIndex] = { ...categoryCards[lastPinnedIndex], isPinned: false };
      }
    }
    
    // 5. Add to TOP of category
    categoryCards = [updatedTarget, ...categoryCards];
  } else {
    // 6. Add to BOTTOM of category (unpinning)
    categoryCards = [...categoryCards, updatedTarget];
  }
  
  // 7. Reassemble and persist
  // Put Self cards first, then Others to be consistent
  const finalCards = isSelf 
    ? [...categoryCards, ...otherCategoryCards]
    : [...otherCategoryCards, ...categoryCards];
    
  await setCards(finalCards);
}

async function maybeDeleteMasterKey(): Promise<void> {
  const [unmasked, masked] = await AsyncStorage.multiGet([
    STORAGE_KEY_UNMASKED,
    STORAGE_KEY_MASKED,
  ]);

  const hasUnmasked = !!unmasked[1];
  const hasMasked = !!masked[1];

  if (!hasUnmasked && !hasMasked) {
    if (__DEV__) {
      console.log("🔐 No encrypted cards remain. Deleting master key.");
    }
    await deleteMasterKey();
  }
}