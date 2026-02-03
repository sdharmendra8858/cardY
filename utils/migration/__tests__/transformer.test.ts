/**
 * Card Transformer Tests
 * 
 * Tests for card transformation, validation, and card type detection
 */

import {
    detectCardType,
    filterExpiredImports,
    isImportedCard,
    isImportedCardExpired,
    isValidCard,
    transformCard,
    transformCards,
    validateCards,
} from "../transformer";
import { NewCard, OldCard } from "../types";

describe("Card Type Detection", () => {
  test("should detect Visa cards", () => {
    expect(detectCardType("4111111111111111")).toBe("visa");
    expect(detectCardType("4012888888881881")).toBe("visa");
    expect(detectCardType("4222222222222")).toBe("visa");
  });

  test("should detect Mastercard", () => {
    expect(detectCardType("5500000000000004")).toBe("mastercard");
    expect(detectCardType("5555555555554444")).toBe("mastercard");
    expect(detectCardType("5105105105105100")).toBe("mastercard");
  });

  test("should detect American Express", () => {
    expect(detectCardType("378282246310005")).toBe("amex");
    expect(detectCardType("371449635398431")).toBe("amex");
    expect(detectCardType("378734493671000")).toBe("amex");
  });

  test("should detect Discover", () => {
    expect(detectCardType("6011111111111117")).toBe("discover");
    expect(detectCardType("6011000990139424")).toBe("discover");
    expect(detectCardType("6500000000000002")).toBe("discover");
  });

  test("should detect JCB", () => {
    expect(detectCardType("3530111333300000")).toBe("jcb");
    expect(detectCardType("3566002020360505")).toBe("jcb");
  });

  test("should detect Diners Club", () => {
    expect(detectCardType("30569309025904")).toBe("dinersclub");
    expect(detectCardType("38520000023237")).toBe("dinersclub");
  });

  test("should detect Maestro", () => {
    expect(detectCardType("6304000000000000")).toBe("maestro");
    expect(detectCardType("5018000000000009")).toBe("maestro");
  });

  test("should detect RuPay", () => {
    expect(detectCardType("6521000000000000")).toBe("rupay");
    expect(detectCardType("6522000000000000")).toBe("rupay");
  });

  test("should return unknown for invalid cards", () => {
    expect(detectCardType("1234567890123456")).toBe("unknown");
    expect(detectCardType("0000000000000000")).toBe("unknown");
    expect(detectCardType("")).toBe("unknown");
  });

  test("should handle cards with spaces and dashes", () => {
    expect(detectCardType("4111 1111 1111 1111")).toBe("visa");
    expect(detectCardType("4111-1111-1111-1111")).toBe("visa");
    expect(detectCardType("5500 0000 0000 0004")).toBe("mastercard");
  });
});

describe("Card Transformation", () => {
  test("should transform old card to new format", () => {
    const oldCard: OldCard = {
      id: "test-1",
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
      expiry: "12/25",
      cvv: "123",
      cardName: "My Visa",
      cardKind: "credit",
      bank: "Test Bank",
    };

    const newCard = transformCard(oldCard);

    expect(newCard.id).toBe(oldCard.id);
    expect(newCard.cardNumber).toBe(oldCard.cardNumber);
    expect(newCard.cardHolder).toBe(oldCard.cardHolder);
    expect(newCard.expiry).toBe(oldCard.expiry);
    expect(newCard.cvv).toBe(oldCard.cvv);
    expect(newCard.cardName).toBe(oldCard.cardName);
    expect(newCard.cardKind).toBe(oldCard.cardKind);
    expect(newCard.bank).toBe(oldCard.bank);
    expect(newCard.cardType).toBe("visa");
    expect(newCard.isPinned).toBe(false);
  });

  test("should preserve isPinned status", () => {
    const oldCard: OldCard = {
      id: "test-1",
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
      expiry: "12/25",
      isPinned: true,
    };

    const newCard = transformCard(oldCard);
    expect(newCard.isPinned).toBe(true);
  });

  test("should default isPinned to false if not present", () => {
    const oldCard: OldCard = {
      id: "test-1",
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
      expiry: "12/25",
    };

    const newCard = transformCard(oldCard);
    expect(newCard.isPinned).toBe(false);
  });

  test("should preserve cardExpiresAt for imported cards", () => {
    const oldCard: OldCard = {
      id: "test-1",
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
      expiry: "12/25",
      cardUser: "other",
      cardExpiresAt: 1735689600, // Future timestamp
    };

    const newCard = transformCard(oldCard);
    expect(newCard.cardExpiresAt).toBe(1735689600);
  });

  test("should detect card type for different networks", () => {
    const cards: OldCard[] = [
      { id: "1", cardNumber: "4111111111111111", cardHolder: "User", expiry: "12/25" },
      { id: "2", cardNumber: "5500000000000004", cardHolder: "User", expiry: "12/25" },
      { id: "3", cardNumber: "378282246310005", cardHolder: "User", expiry: "12/25" },
    ];

    const transformed = transformCards(cards);

    expect(transformed[0].cardType).toBe("visa");
    expect(transformed[1].cardType).toBe("mastercard");
    expect(transformed[2].cardType).toBe("amex");
  });

  test("should handle missing optional fields", () => {
    const oldCard: OldCard = {
      id: "test-1",
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
      expiry: "12/25",
    };

    const newCard = transformCard(oldCard);

    expect(newCard.cvv).toBeUndefined();
    expect(newCard.cardName).toBeUndefined();
    expect(newCard.cardKind).toBeUndefined();
    expect(newCard.bank).toBeUndefined();
    expect(newCard.cardType).toBe("visa");
  });
});

describe("Card Validation", () => {
  test("should validate card with required fields", () => {
    const card: NewCard = {
      id: "test-1",
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
      cardType: "visa",
    };

    expect(isValidCard(card)).toBe(true);
  });

  test("should reject card without id", () => {
    const card: any = {
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
    };

    expect(isValidCard(card)).toBe(false);
  });

  test("should reject card without cardNumber", () => {
    const card: any = {
      id: "test-1",
      cardHolder: "John Doe",
    };

    expect(isValidCard(card)).toBe(false);
  });

  test("should reject card without cardHolder", () => {
    const card: any = {
      id: "test-1",
      cardNumber: "4111111111111111",
    };

    expect(isValidCard(card)).toBe(false);
  });

  test("should validate multiple cards", () => {
    const cards: NewCard[] = [
      { id: "1", cardNumber: "4111111111111111", cardHolder: "User 1", cardType: "visa" },
      { id: "2", cardNumber: "5500000000000004", cardHolder: "User 2", cardType: "mastercard" },
      { id: "", cardNumber: "", cardHolder: "" } as any, // Invalid
    ];

    const result = validateCards(cards);

    expect(result.valid).toHaveLength(2);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0]).toBe("");
  });
});

describe("Imported Card Handling", () => {
  test("should identify imported cards", () => {
    const importedCard: NewCard = {
      id: "test-1",
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
      cardUser: "other",
      cardExpiresAt: 1735689600,
    };

    expect(isImportedCard(importedCard)).toBe(true);
  });

  test("should not identify self cards as imported", () => {
    const selfCard: NewCard = {
      id: "test-1",
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
      cardUser: "self",
    };

    expect(isImportedCard(selfCard)).toBe(false);
  });

  test("should not identify cards without cardExpiresAt as imported", () => {
    const card: NewCard = {
      id: "test-1",
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
      cardUser: "other",
    };

    expect(isImportedCard(card)).toBe(false);
  });

  test("should detect expired imported cards", () => {
    const expiredCard: NewCard = {
      id: "test-1",
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
      cardUser: "other",
      cardExpiresAt: 1000000000, // Past timestamp
    };

    expect(isImportedCardExpired(expiredCard)).toBe(true);
  });

  test("should not detect non-expired imported cards as expired", () => {
    const futureCard: NewCard = {
      id: "test-1",
      cardNumber: "4111111111111111",
      cardHolder: "John Doe",
      cardUser: "other",
      cardExpiresAt: Math.floor(Date.now() / 1000) + 86400, // Tomorrow
    };

    expect(isImportedCardExpired(futureCard)).toBe(false);
  });

  test("should filter out expired imported cards", () => {
    const cards: NewCard[] = [
      {
        id: "1",
        cardNumber: "4111111111111111",
        cardHolder: "User 1",
        cardUser: "self",
      },
      {
        id: "2",
        cardNumber: "5500000000000004",
        cardHolder: "User 2",
        cardUser: "other",
        cardExpiresAt: 1000000000, // Expired
      },
      {
        id: "3",
        cardNumber: "378282246310005",
        cardHolder: "User 3",
        cardUser: "other",
        cardExpiresAt: Math.floor(Date.now() / 1000) + 86400, // Valid
      },
    ];

    const filtered = filterExpiredImports(cards);

    expect(filtered).toHaveLength(2);
    expect(filtered.find((c) => c.id === "1")).toBeDefined();
    expect(filtered.find((c) => c.id === "2")).toBeUndefined();
    expect(filtered.find((c) => c.id === "3")).toBeDefined();
  });
});

describe("Edge Cases", () => {
  test("should handle empty card array", () => {
    const result = transformCards([]);
    expect(result).toHaveLength(0);
  });

  test("should handle card with empty strings", () => {
    const oldCard: OldCard = {
      id: "",
      cardNumber: "",
      cardHolder: "",
      expiry: "",
    };

    const newCard = transformCard(oldCard);
    expect(newCard.cardType).toBe("unknown");
  });

  test("should handle card with special characters in number", () => {
    const oldCard: OldCard = {
      id: "test-1",
      cardNumber: "4111-1111-1111-1111",
      cardHolder: "John Doe",
      expiry: "12/25",
    };

    const newCard = transformCard(oldCard);
    expect(newCard.cardType).toBe("visa");
  });

  test("should handle very long card numbers", () => {
    const oldCard: OldCard = {
      id: "test-1",
      cardNumber: "41111111111111111111111111",
      cardHolder: "John Doe",
      expiry: "12/25",
    };

    const newCard = transformCard(oldCard);
    expect(newCard.cardType).toBe("visa");
  });
});
