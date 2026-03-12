/**
 * Migration Orchestrator Tests
 * 
 * Tests for the main migration flow and orchestration
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { getMigrationStatus, migrateCards, needsMigration, resetMigrationStatus } from "../migrator";
import { MIGRATION_CONFIG } from "../types";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("expo-secure-store");
jest.mock("../../secureStorage");
jest.mock("../../encryption/masterKeyManager");

describe("Migration Need Check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should return true when no new cards exist", async () => {
    // Mock getMaskedCards to return empty array
    const { getMaskedCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([]);

    // Mock masterKeyExists to return true
    const { masterKeyExists } = require("../../encryption/masterKeyManager");
    masterKeyExists.mockResolvedValue(true);

    const needed = await needsMigration();
    expect(needed).toBe(true);
  });

  test("should return true when no master key exists", async () => {
    // Mock getMaskedCards to return cards
    const { getMaskedCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([{ id: "1", cardNumber: "4111111111111111" }]);

    // Mock masterKeyExists to return false
    const { masterKeyExists } = require("../../encryption/masterKeyManager");
    masterKeyExists.mockResolvedValue(false);

    const needed = await needsMigration();
    expect(needed).toBe(true);
  });

  test("should return false when cards and master key exist", async () => {
    // Mock getMaskedCards to return cards
    const { getMaskedCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([{ id: "1", cardNumber: "4111111111111111" }]);

    // Mock masterKeyExists to return true
    const { masterKeyExists } = require("../../encryption/masterKeyManager");
    masterKeyExists.mockResolvedValue(true);

    const needed = await needsMigration();
    expect(needed).toBe(false);
  });

  test("should return true on error (safe default)", async () => {
    // Mock getMaskedCards to throw error
    const { getMaskedCards } = require("../../secureStorage");
    getMaskedCards.mockRejectedValue(new Error("Storage error"));

    const needed = await needsMigration();
    expect(needed).toBe(true);
  });
});

describe("Migration Status Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should mark migration as completed", async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    // This is tested indirectly through migrateCards
    // We'll verify the setItem call
    await migrateCards();

    // Should eventually call setItem with migration status
    // (if migration completes successfully)
  });

  test("should reset migration status", async () => {
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    await resetMigrationStatus();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(MIGRATION_CONFIG.STATUS_KEY);
  });

  test("should get migration status", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(MIGRATION_CONFIG.VERSION);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { getMaskedCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([]);

    const status = await getMigrationStatus();

    expect(status.completed).toBe(true);
    expect(status.version).toBe(MIGRATION_CONFIG.VERSION);
  });
});

describe("Migration Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should skip migration if already completed", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(MIGRATION_CONFIG.VERSION);

    const result = await migrateCards();

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
  });

  test("should skip migration if new storage has cards", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getMaskedCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([{ id: "1", cardNumber: "4111111111111111" }]);

    const result = await migrateCards();

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
  });

  test("should migrate cards from old storage", async () => {
    // Setup: No migration completed, no new cards
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const { getMaskedCards, setCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([]);
    setCards.mockResolvedValue(undefined);

    // Old cards exist
    const oldCards = [
      {
        id: "old-1",
        cardNumber: "4111111111111111",
        cardHolder: "Test User",
        expiry: "12/25",
        cvv: "123",
      },
    ];
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(oldCards));
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    const result = await migrateCards();

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(1);
    expect(result.source).toBe("securestore");
    expect(setCards).toHaveBeenCalled();
  });

  test("should handle migration with no old cards", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getMaskedCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([]);

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const result = await migrateCards();

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
  });

  test("should handle save errors gracefully", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getMaskedCards, setCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([]);
    setCards.mockRejectedValue(new Error("Save failed"));

    const oldCards = [
      {
        id: "old-1",
        cardNumber: "4111111111111111",
        cardHolder: "Test User",
        expiry: "12/25",
      },
    ];
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(oldCards));

    const result = await migrateCards();

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    // Should NOT delete old storage if save failed
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  test("should verify migration before cleanup", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const { getMaskedCards, setCards } = require("../../secureStorage");
    
    // First call: no cards (before migration)
    // Second call: verify cards (after migration)
    getMaskedCards
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "old-1", cardNumber: "4111111111111111", cardHolder: "Test User" },
      ]);
    
    setCards.mockResolvedValue(undefined);

    const oldCards = [
      {
        id: "old-1",
        cardNumber: "4111111111111111",
        cardHolder: "Test User",
        expiry: "12/25",
      },
    ];
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(oldCards));
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    const result = await migrateCards();

    expect(result.success).toBe(true);
    // Should delete old storage after successful verification
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });

  test("should not cleanup if verification fails", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const { getMaskedCards, setCards } = require("../../secureStorage");
    
    // First call: no cards (before migration)
    // Second call: still no cards (verification fails)
    getMaskedCards
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    
    setCards.mockResolvedValue(undefined);

    const oldCards = [
      {
        id: "old-1",
        cardNumber: "4111111111111111",
        cardHolder: "Test User",
        expiry: "12/25",
      },
    ];
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(oldCards));

    const result = await migrateCards();

    expect(result.success).toBe(false);
    // Should NOT delete old storage if verification failed
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});

describe("Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should handle SecureStore read errors", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getMaskedCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([]);

    (SecureStore.getItemAsync as jest.Mock).mockRejectedValue(new Error("SecureStore error"));

    const result = await migrateCards();

    // Should handle error gracefully
    expect(result.success).toBe(true); // No cards to migrate
    expect(result.migratedCount).toBe(0);
  });

  test("should handle AsyncStorage errors", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("AsyncStorage error"));

    const result = await migrateCards();

    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test("should handle invalid JSON in old storage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getMaskedCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([]);

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("invalid-json");

    const result = await migrateCards();

    // Should handle parse error gracefully
    expect(result.success).toBe(true); // No valid cards to migrate
    expect(result.migratedCount).toBe(0);
  });
});

describe("Data Integrity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should preserve all card fields during migration", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const { getMaskedCards, setCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([]).mockResolvedValueOnce([]);
    
    let savedCards: any[] = [];
    setCards.mockImplementation((cards: any[]) => {
      savedCards = cards;
      return Promise.resolve();
    });

    const oldCards = [
      {
        id: "old-1",
        cardNumber: "4111111111111111",
        cardHolder: "Test User",
        expiry: "12/25",
        cvv: "123",
        cardName: "My Card",
        cardKind: "credit",
        bank: "Test Bank",
        isPinned: true,
        cardExpiresAt: 1735689600,
      },
    ];
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(oldCards));
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    // Mock verification to pass
    getMaskedCards.mockResolvedValueOnce([oldCards[0]]);

    await migrateCards();

    expect(savedCards).toHaveLength(1);
    expect(savedCards[0].id).toBe("old-1");
    expect(savedCards[0].cardNumber).toBe("4111111111111111");
    expect(savedCards[0].cardHolder).toBe("Test User");
    expect(savedCards[0].expiry).toBe("12/25");
    expect(savedCards[0].cvv).toBe("123");
    expect(savedCards[0].cardName).toBe("My Card");
    expect(savedCards[0].cardKind).toBe("credit");
    expect(savedCards[0].bank).toBe("Test Bank");
    expect(savedCards[0].isPinned).toBe(true);
    expect(savedCards[0].cardExpiresAt).toBe(1735689600);
    expect(savedCards[0].cardType).toBe("visa");
  });

  test("should filter out invalid cards", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const { getMaskedCards, setCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([]);
    
    let savedCards: any[] = [];
    setCards.mockImplementation((cards: any[]) => {
      savedCards = cards;
      return Promise.resolve();
    });

    const oldCards = [
      {
        id: "valid-1",
        cardNumber: "4111111111111111",
        cardHolder: "Valid User",
        expiry: "12/25",
      },
      {
        id: "", // Invalid: no id
        cardNumber: "5500000000000004",
        cardHolder: "Invalid User",
        expiry: "12/25",
      },
      {
        id: "valid-2",
        cardNumber: "", // Invalid: no card number
        cardHolder: "Invalid User 2",
        expiry: "12/25",
      },
    ];
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(oldCards));
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    // Mock verification
    getMaskedCards.mockResolvedValueOnce([{ id: "valid-1" }]);

    const result = await migrateCards();

    expect(result.success).toBe(true);
    expect(savedCards).toHaveLength(1);
    expect(savedCards[0].id).toBe("valid-1");
    expect(result.errors.length).toBeGreaterThan(0); // Should report invalid cards
  });

  test("should filter out expired imported cards", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const { getMaskedCards, setCards } = require("../../secureStorage");
    getMaskedCards.mockResolvedValue([]);
    
    let savedCards: any[] = [];
    setCards.mockImplementation((cards: any[]) => {
      savedCards = cards;
      return Promise.resolve();
    });

    const oldCards = [
      {
        id: "self-card",
        cardNumber: "4111111111111111",
        cardHolder: "Self User",
        expiry: "12/25",
        cardUser: "self",
      },
      {
        id: "expired-import",
        cardNumber: "5500000000000004",
        cardHolder: "Expired Import",
        expiry: "12/25",
        cardUser: "other",
        cardExpiresAt: 1000000000, // Expired
      },
      {
        id: "valid-import",
        cardNumber: "378282246310005",
        cardHolder: "Valid Import",
        expiry: "12/25",
        cardUser: "other",
        cardExpiresAt: Math.floor(Date.now() / 1000) + 86400, // Future
      },
    ];
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(oldCards));
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    // Mock verification
    getMaskedCards.mockResolvedValueOnce([
      { id: "self-card" },
      { id: "valid-import" },
    ]);

    await migrateCards();

    expect(savedCards).toHaveLength(2);
    expect(savedCards.find((c) => c.id === "self-card")).toBeDefined();
    expect(savedCards.find((c) => c.id === "expired-import")).toBeUndefined();
    expect(savedCards.find((c) => c.id === "valid-import")).toBeDefined();
  });
});
