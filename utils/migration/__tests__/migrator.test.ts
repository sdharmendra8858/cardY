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

const mockedGetMaskedCards = jest.fn();
const mockedSetCards = jest.fn();
const mockedGetUnmaskedCards = jest.fn();

jest.mock("../../secureStorage", () => ({
  getMaskedCards: () => mockedGetMaskedCards(),
  getUnmaskedCards: () => mockedGetUnmaskedCards(),
  setCards: (cards: any) => mockedSetCards(cards),
}));

const mockedMasterKeyExists = jest.fn();
jest.mock("../../encryption/masterKeyManager", () => ({
  masterKeyExists: () => mockedMasterKeyExists(),
}));

describe("Migration Need Check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMaskedCards.mockResolvedValue([]);
    mockedGetUnmaskedCards.mockResolvedValue([]);
    mockedMasterKeyExists.mockResolvedValue(true);
  });

  test("should return true when no new cards exist", async () => {
    mockedGetMaskedCards.mockResolvedValue([]);
    mockedMasterKeyExists.mockResolvedValue(true);

    const needed = await needsMigration();
    expect(needed).toBe(true);
  });

  test("should return true when no master key exists", async () => {
    mockedGetMaskedCards.mockResolvedValue([{ id: "1", cardNumber: "4111111111111111" }]);
    mockedMasterKeyExists.mockResolvedValue(false);

    const needed = await needsMigration();
    expect(needed).toBe(true);
  });

  test("should return false when cards and master key exist", async () => {
    mockedGetMaskedCards.mockResolvedValue([{ id: "1", cardNumber: "4111111111111111" }]);
    mockedMasterKeyExists.mockResolvedValue(true);

    const needed = await needsMigration();
    expect(needed).toBe(false);
  });

  test("should return true on error (safe default)", async () => {
    mockedGetMaskedCards.mockRejectedValue(new Error("Storage error"));

    const needed = await needsMigration();
    expect(needed).toBe(true);
  });
});

describe("Migration Status Management", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should reset migration status", async () => {
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    await resetMigrationStatus();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(MIGRATION_CONFIG.STATUS_KEY);
  });

  test("should get migration status", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(MIGRATION_CONFIG.VERSION);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    mockedGetMaskedCards.mockResolvedValue([]);

    const status = await getMigrationStatus();
    expect(status.completed).toBe(true);
    expect(status.version).toBe(MIGRATION_CONFIG.VERSION);
  });
});

describe("Migration Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMaskedCards.mockResolvedValue([]);
    mockedGetUnmaskedCards.mockResolvedValue([]);
    mockedSetCards.mockResolvedValue(undefined);
  });

  test("should skip migration if already completed", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(MIGRATION_CONFIG.VERSION);
    const result = await migrateCards();
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
  });

  test("should skip migration if new storage has cards", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    mockedGetMaskedCards.mockResolvedValue([{ id: "1", cardNumber: "4111111111111111" }]);

    const result = await migrateCards();
    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(0);
  });

  test("should migrate cards from old storage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const oldCards = [{ id: "old-1", cardNumber: "4111111111111111", cardHolder: "Test User", expiry: "12/25" }];
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === "cards_encrypted") return Promise.resolve(JSON.stringify(oldCards));
        return Promise.resolve(null);
    });
    
    // Mock getMaskedCards for: 1) Initial check, 2) Verification
    mockedGetMaskedCards.mockResolvedValueOnce([]).mockResolvedValue(oldCards);
    mockedGetUnmaskedCards.mockResolvedValue(oldCards);

    const result = await migrateCards();

    expect(result.success).toBe(true);
    expect(result.migratedCount).toBe(1);
    expect(mockedSetCards).toHaveBeenCalled();
  });

  test("should not cleanup if verification fails", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    
    const oldCards = [{ id: "old-1", cardNumber: "4111111111111111", cardHolder: "Test User", expiry: "12/25" }];
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === "cards_encrypted") return Promise.resolve(JSON.stringify(oldCards));
        return Promise.resolve(null);
    });

    // Verification fails: returns empty array
    mockedGetMaskedCards.mockResolvedValue([]);
    mockedGetUnmaskedCards.mockResolvedValue([]);

    const result = await migrateCards();
    expect(result.success).toBe(false);
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
