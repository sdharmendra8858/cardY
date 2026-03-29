/**
 * needsMigration() Tests
 * 
 * Tests for migration detection logic with completion flag check
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { needsMigration } from "../migrator";
import { MIGRATION_CONFIG } from "../types";

// Mock dependencies
jest.mock("expo-secure-store");
jest.mock("@react-native-async-storage/async-storage");

const mockedGetMaskedCards = jest.fn();
const mockedGetUnmaskedCards = jest.fn();
jest.mock("../../secureStorage", () => ({
  getMaskedCards: () => mockedGetMaskedCards(),
  getUnmaskedCards: () => mockedGetUnmaskedCards(),
}));

describe("needsMigration()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetMaskedCards.mockResolvedValue([]);
    mockedGetUnmaskedCards.mockResolvedValue([]);
  });

  describe("Migration Already Completed", () => {
    it("should return false if migration flag is set", async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === MIGRATION_CONFIG.STATUS_KEY) return Promise.resolve(MIGRATION_CONFIG.VERSION);
        return Promise.resolve(null);
      });
      // Mock old cards to exist
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify([{ id: "1" }]));
      // Mock new cards to exist so it doesn't trigger the special case auto-fix
      mockedGetMaskedCards.mockResolvedValue([{ id: "1" }]);

      const result = await needsMigration();
      expect(result).toBe(false);
    });
  });

  describe("No Old Cards", () => {
    it("should return false if no old cards exist", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await needsMigration();
      expect(result).toBe(false);
    });
  });

  describe("Migration Needed", () => {
    it("should return true if old cards exist and new storage is empty", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
          if (key === "cards_encrypted") return Promise.resolve(JSON.stringify([{ id: "1", bank: "Test" }]));
          return Promise.resolve(null);
      });
      mockedGetMaskedCards.mockResolvedValue([]);
      mockedGetUnmaskedCards.mockResolvedValue([]);

      const result = await needsMigration();
      expect(result).toBe(true);
    });
  });
});
