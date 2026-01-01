import * as SecureStore from "expo-secure-store";

const KEY = "cards_encrypted";

type Card = {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv?: string;
  cardName?: string;
  cardKind?: "credit" | "debit"; // Credit or Debit
  cobrandName?: string; // e.g., "Amazon Pay", "Flipkart", "Swiggy"
  cardUser?: "self" | "other"; // Who owns/uses the card
  dominantColor?: string; // Hex color code for card theme
  bank?: string; // Bank name
};

export async function getCards(): Promise<Card[]> {
  try {
    const value = await SecureStore.getItemAsync(KEY, { keychainService: KEY });
    if (!value) return [];

    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as Card[];
    return [];
  } catch {
    return [];
  }
}

export async function setCards(cards: Card[]): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(cards), {
    keychainService: KEY,
  });
}

export async function addCard(card: Card): Promise<void> {
  const existing = await getCards();

  await setCards([...existing, card]);
}

export async function removeCard(cardId: string): Promise<void> {
  const existing = await getCards();

  await setCards(existing.filter((c) => c.id !== cardId));
}

export async function clearCards(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY, { keychainService: KEY });
}
