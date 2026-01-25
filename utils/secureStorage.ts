/**
 * Secure Card Storage
 * Implements spec 7: Card Storage Flow
 *
 * Two-tier encryption architecture:
 * - Root Key (RK): Stored in SecureStore (Android Keystore)
 * - Data Encryption Key (DEK): Encrypted with RK, stored separately
 * - Card Data: Encrypted with DEK, stored in AsyncStorage
 *
 * SecureStore is used ONLY for keys.
 * AsyncStorage stores ONLY encrypted payloads.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  decryptCards,
  encryptCards,
  EncryptionResult,
} from "./encryption/cardEncryption";

const STORAGE_KEY_MASKED = "encrypted_cards_masked";
const STORAGE_KEY_UNMASKED = "encrypted_cards_unmasked";

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
  isPinned?: boolean;
};

/* -------------------------------------------------------------------------- */
/*                               READ HELPERS                                  */
/* -------------------------------------------------------------------------- */

async function readAndDecrypt(
  storageKey: string
): Promise<Card[]> {
  const raw = await AsyncStorage.getItem(storageKey);

  if (!raw) return [];

  let parsed: EncryptionResult;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("STORAGE_CORRUPTED");
  }

  try {
    const decrypted = await decryptCards(parsed);
    if (!Array.isArray(decrypted)) {
      throw new Error("INVALID_DECRYPTED_PAYLOAD");
    }
    return decrypted as Card[];
  } catch {
    throw new Error("CARD_DECRYPTION_FAILED");
  }
}

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                    */
/* -------------------------------------------------------------------------- */

export async function getMaskedCards(): Promise<Card[]> {
  try {
    return await readAndDecrypt(STORAGE_KEY_MASKED);
  } catch (e) {
    console.error("❌ Failed to get masked cards:", e);
    throw e;
  }
}

export async function getUnmaskedCards(): Promise<Card[]> {
  try {
    return await readAndDecrypt(STORAGE_KEY_UNMASKED);
  } catch (e) {
    console.error("❌ Failed to get unmasked cards:", e);
    throw e;
  }
}

export async function revealCard(cardId: string): Promise<Card | null> {
  try {
    const cards = await getUnmaskedCards();
    return cards.find((c) => c.id === cardId) ?? null;
  } catch (e) {
    console.error("❌ Reveal blocked due to crypto failure:", e);
    throw new Error("REVEAL_BLOCKED");
  }
}

/* -------------------------------------------------------------------------- */
/*                               WRITE HELPERS                                 */
/* -------------------------------------------------------------------------- */

function maskCardNumber(cardNumber: string): string {
  if (!cardNumber) return cardNumber;

  if (/[xX]/.test(cardNumber)) return cardNumber;

  const clean = cardNumber.replace(/\D/g, "");
  if (clean.length <= 4) return clean;

  const masked = "X".repeat(clean.length - 4) + clean.slice(-4);
  return masked.replace(/(.{4})/g, "$1 ").trim();
}

/* -------------------------------------------------------------------------- */
/*                               WRITE API                                     */
/* -------------------------------------------------------------------------- */

export async function setCards(cards: Card[]): Promise<void> {
  try {
    const maskedCards = cards.map((card) => ({
      ...card,
      cardNumber: maskCardNumber(card.cardNumber),
      cvv: undefined,
      expiry: undefined,
    }));

    const unmaskedEncrypted = await encryptCards(cards);
    const maskedEncrypted = await encryptCards(maskedCards);

    // Write unmasked first, then masked (ordering matters)
    await AsyncStorage.setItem(
      STORAGE_KEY_UNMASKED,
      JSON.stringify(unmaskedEncrypted)
    );

    await AsyncStorage.setItem(
      STORAGE_KEY_MASKED,
      JSON.stringify(maskedEncrypted)
    );
  } catch (e) {
    console.error("❌ Failed to persist cards:", e);
    throw new Error("CARD_PERSIST_FAILED");
  }
}

export async function addCard(card: Card): Promise<void> {
  const existing = await getUnmaskedCards();
  await setCards([...existing, card]);
}

export async function removeCard(cardId: string): Promise<void> {
  const existing = await getUnmaskedCards();
  await setCards(existing.filter((c) => c.id !== cardId));
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
      STORAGE_KEY_MASKED,
      STORAGE_KEY_UNMASKED,
    ]);

    const { deleteMasterKey } = await import(
      "./encryption/masterKeyManager"
    );
    await deleteMasterKey();

    return true;
  } catch (e) {
    console.error("❌ Failed to clear cards:", e);
    return false;
  }
}

export async function hasCards(): Promise<boolean> {
  const cards = await getMaskedCards();
  return cards.length > 0;
}