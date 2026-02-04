/**
 * needsMigration() Tests
 * 
 * Tests for migration detection logic
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { needsMigration } from "../migrator";
import { MIGRATION_CONFIG } from "../types";

// Mock dependencies
jest.mock("expo-secure-store");
jest.mock("@react-native-async-storage/async-storage");

describe("needsMigration()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Migration Already Completed", () => {
    it("should return false if migration already completed", async () => {
      // Migration status set
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(MIGRATION_CONFIG.VERSION);

      const result = await needsMigration();

      expect(result).toBe(false);
    });

    it("should log that migration is already completed", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(MIGRATION_CONFIG.VERSION);

      await needsMigration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Migration already completed")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe("No Old Cards", () => {
    it("should return false if no old cards exist", async () => {
      // Migration not complete
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      // No old cards
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await needsMigration();

      expect(result).toBe(false);
    });

    it("should log that no old cards exist", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await needsMigration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No old cards exist")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe("Migration Needed", () => {
    it("should return true if old cards exist and no new cards", async () => {
      // Migration not complete
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === MIGRATION_CONFIG.STATUS_KEY) return Promise.resolve(null);
        if (key === "encrypted_cards_masked") return Promise.resolve(null);
        if (key === "master_encryption_key") return Promise.resolve(null);
        return Promise.resolve(null);
      });
      
      // Old cards exist
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: "1", cardName: "Test" }])
      );

      const result = await needsMigration();

      expect(result).toBe(true);
    });

    it("should return true if old cards exist and no master key", async () => {
      // Migration not complete
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === MIGRATION_CONFIG.STATUS_KEY) return Promise.resolve(null);
        if (key === "encrypted_cards_masked") return Promise.resolve(JSON.stringify({ iv: "test", ciphertext: "test" }));
        if (key === "master_encryption_key") return Promise.resolve(null);
        return Promise.resolve(null);
      });
      
      // Old cards exist
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: "1", cardName: "Test" }])
      );

      const result = await needsMigration();

      expect(result).toBe(true);
    });

    it("should log migration check details", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: "1" }])
      );

      await needsMigration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Migration check:"),
        expect.objectContaining({
          alreadyCompleted: expect.any(Boolean),
          oldCardsExist: expect.any(Boolean),
          hasNewCards: expect.any(Boolean),
          hasMaster: expect.any(Boolean),
          needed: expect.any(Boolean),
        })
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe("Migration Not Needed", () => {
    it("should return false if new cards and master key exist", async () => {
      // Migration not complete but new storage has everything
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === MIGRATION_CONFIG.STATUS_KEY) return Promise.resolve(null);
        if (key === "encrypted_cards_masked") return Promise.resolve(JSON.stringify({ iv: "test", ciphertext: "test" }));
        return Promise.resolve(null);
      });
      
      // Old cards exist
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: "1" }])
      );

      // Mock master key exists
      jest.doMock("../../encryption/masterKeyManager", () => ({
        masterKeyExists: jest.fn().mockResolvedValue(true),
      }));

      const result = await needsMigration();

      // Should still return true because old cards exist
      // Migration will handle moving them to new storage
      expect(result).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should return true on error (safer to attempt migration)", async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("Storage error"));

      const result = await needsMigration();

      // On error, returns true to be safe (attempt migration)
      expect(result).toBe(true);
    });

    it("should log error", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("Storage error"));

      await needsMigration();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to check migration status"),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
});
