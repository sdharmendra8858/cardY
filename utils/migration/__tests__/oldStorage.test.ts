/**
 * Old Storage Access Tests
 * 
 * Tests for reading and deleting cards from old storage (SecureStore)
 */

import * as SecureStore from "expo-secure-store";
import {
    deleteOldCards,
    getOldCardById,
    hasOldCards,
    readOldCards,
} from "../oldStorage";
import { OLD_STORAGE_KEYS } from "../types";

// Mock SecureStore
jest.mock("expo-secure-store");

describe("Read Old Cards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should read cards from encrypted storage (PR#41 format)", async () => {
    const mockCards = [
      {
        id: "card-1",
        cardNumber: "4111111111111111",
        cardHolder: "Test User",
        expiry: "12/25",
        cvv: "123",
      },
    ];

    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === OLD_STORAGE_KEYS.ENCRYPTED) {
        return Promise.resolve(JSON.stringify(mockCards));
      }
      return Promise.resolve(null);
    });

    const cards = await readOldCards();

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("card-1");
    expect(cards[0].cardNumber).toBe("4111111111111111");
  });

  test("should read cards from unmasked storage (main branch format)", async () => {
    const mockCards = [
      {
        id: "card-1",
        cardNumber: "4111111111111111",
        cardHolder: "Test User",
        expiry: "12/25",
        cvv: "123",
      },
    ];

    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === OLD_STORAGE_KEYS.UNMASKED) {
        return Promise.resolve(JSON.stringify(mockCards));
      }
      return Promise.resolve(null);
    });

    const cards = await readOldCards();

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("card-1");
  });

  test("should prioritize encrypted storage over unmasked", async () => {
    const encryptedCards = [
      { id: "encrypted-1", cardNumber: "4111111111111111", cardHolder: "Encrypted", expiry: "12/25" },
    ];
    const unmaskedCards = [
      { id: "unmasked-1", cardNumber: "5500000000000004", cardHolder: "Unmasked", expiry: "12/25" },
    ];

    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === OLD_STORAGE_KEYS.ENCRYPTED) {
        return Promise.resolve(JSON.stringify(encryptedCards));
      }
      if (key === OLD_STORAGE_KEYS.UNMASKED) {
        return Promise.resolve(JSON.stringify(unmaskedCards));
      }
      return Promise.resolve(null);
    });

    const cards = await readOldCards();

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("encrypted-1");
  });

  test("should return empty array when no old cards exist", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const cards = await readOldCards();

    expect(cards).toHaveLength(0);
  });

  test("should handle invalid JSON gracefully", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("invalid-json");

    const cards = await readOldCards();

    expect(cards).toHaveLength(0);
  });

  test("should handle SecureStore errors gracefully", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error("SecureStore error"));

    const cards = await readOldCards();

    expect(cards).toHaveLength(0);
  });

  test("should handle empty string", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("");

    const cards = await readOldCards();

    expect(cards).toHaveLength(0);
  });

  test("should handle empty array", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("[]");

    const cards = await readOldCards();

    expect(cards).toHaveLength(0);
  });
});

describe("Check Old Cards Existence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return true when encrypted cards exist", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === OLD_STORAGE_KEYS.ENCRYPTED) {
        return Promise.resolve('[{"id":"1"}]');
      }
      return Promise.resolve(null);
    });

    const exists = await hasOldCards();

    expect(exists).toBe(true);
  });

  test("should return true when unmasked cards exist", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key) => {
      if (key === OLD_STORAGE_KEYS.UNMASKED) {
        return Promise.resolve('[{"id":"1"}]');
      }
      return Promise.resolve(null);
    });

    const exists = await hasOldCards();

    expect(exists).toBe(true);
  });

  test("should return false when no cards exist", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const exists = await hasOldCards();

    expect(exists).toBe(false);
  });

  test("should return false on error", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error("Error"));

    const exists = await hasOldCards();

    expect(exists).toBe(false);
  });
});

describe("Get Old Card By ID", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should find card by id", async () => {
    const mockCards = [
      { id: "card-1", cardNumber: "4111111111111111", cardHolder: "User 1", expiry: "12/25" },
      { id: "card-2", cardNumber: "5500000000000004", cardHolder: "User 2", expiry: "12/25" },
    ];

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockCards));

    const card = await getOldCardById("card-2");

    expect(card).toBeDefined();
    expect(card?.id).toBe("card-2");
    expect(card?.cardHolder).toBe("User 2");
  });

  test("should return null when card not found", async () => {
    const mockCards = [
      { id: "card-1", cardNumber: "4111111111111111", cardHolder: "User 1", expiry: "12/25" },
    ];

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockCards));

    const card = await getOldCardById("non-existent");

    expect(card).toBeNull();
  });

  test("should return null when no cards exist", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const card = await getOldCardById("card-1");

    expect(card).toBeNull();
  });

  test("should return null on error", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error("Error"));

    const card = await getOldCardById("card-1");

    expect(card).toBeNull();
  });
});

describe("Delete Old Cards", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should delete all old storage keys", async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    await deleteOldCards();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(OLD_STORAGE_KEYS.ENCRYPTED);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(OLD_STORAGE_KEYS.MASKED);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(OLD_STORAGE_KEYS.UNMASKED);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
  });

  test("should handle deletion errors gracefully", async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(new Error("Delete error"));

    // Should not throw
    await expect(deleteOldCards()).resolves.not.toThrow();
  });

  test("should continue deleting even if one fails", async () => {
    (SecureStore.deleteItemAsync as jest.Mock)
      .mockRejectedValueOnce(new Error("First delete failed"))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    await deleteOldCards();

    // Should still attempt all deletions
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
  });
});

describe("Edge Cases", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should handle null values", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const cards = await readOldCards();
    expect(cards).toHaveLength(0);

    const exists = await hasOldCards();
    expect(exists).toBe(false);

    const card = await getOldCardById("any-id");
    expect(card).toBeNull();
  });

  test("should handle undefined values", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(undefined);

    const cards = await readOldCards();
    expect(cards).toHaveLength(0);
  });

  test("should handle malformed JSON", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("{invalid json}");

    const cards = await readOldCards();
    expect(cards).toHaveLength(0);

    const exists = await hasOldCards();
    expect(exists).toBe(false);
  });

  test("should handle non-array JSON", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('{"not":"an array"}');

    const cards = await readOldCards();
    expect(cards).toHaveLength(0);
  });

  test("should handle very large card arrays", async () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({
      id: `card-${i}`,
      cardNumber: "4111111111111111",
      cardHolder: `User ${i}`,
      expiry: "12/25",
    }));

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(largeArray));

    const cards = await readOldCards();
    expect(cards).toHaveLength(1000);

    const card = await getOldCardById("card-500");
    expect(card).toBeDefined();
    expect(card?.id).toBe("card-500");
  });

  test("should handle cards with missing fields", async () => {
    const mockCards = [
      { id: "card-1" }, // Missing required fields
      { cardNumber: "4111111111111111" }, // Missing id
      {}, // Empty object
    ];

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockCards));

    const cards = await readOldCards();
    expect(cards).toHaveLength(3); // Should still return all cards
  });

  test("should handle special characters in card data", async () => {
    const mockCards = [
      {
        id: "card-1",
        cardNumber: "4111111111111111",
        cardHolder: "Test User with 特殊字符 and émojis 🎉",
        expiry: "12/25",
      },
    ];

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(mockCards));

    const cards = await readOldCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].cardHolder).toContain("特殊字符");
    expect(cards[0].cardHolder).toContain("🎉");
  });
});
