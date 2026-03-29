/**
 * Old Card Deletion Tests
 * 
 * Tests for deleteOldCards() functionality and verification
 */

import * as SecureStore from "expo-secure-store";
import { deleteOldCards, hasOldCards } from "../oldStorage";
import { OLD_STORAGE_KEYS } from "../types";

// Mock SecureStore
jest.mock("expo-secure-store");

describe("Old Card Deletion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("deleteOldCards()", () => {
    it("should delete all old storage keys", async () => {
      // Setup: Mock keys exist
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: "1", bank: "Test" }])
      );
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await deleteOldCards();

      // Verify all keys were deleted
      const keyCount = Object.values(OLD_STORAGE_KEYS).length;
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(keyCount * 2);
    });

    it("should log found keys before deletion", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: "1" }])
      );
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await deleteOldCards();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Found old storage key to delete")
      );
      
      consoleSpy.mockRestore();
    });

    it("should verify deletion completed successfully", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      
      // First call: key exists, subsequent calls: key deleted
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([{ id: "1" }])) // Pre-check
        .mockResolvedValue(null); // Post-check
      
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await deleteOldCards();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("all keys deleted successfully")
      );
      
      consoleSpy.mockRestore();
    });

    it("should warn if keys remain after deletion", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      
      // Keys still exist after deletion attempt
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: "1" }])
      );
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await deleteOldCards();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("still exists after deletion")
      );
      
      consoleSpy.mockRestore();
    });

    it("should handle deletion errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: "1" }])
      );
      (SecureStore.deleteItemAsync as jest.Mock).mockRejectedValue(
        new Error("Deletion failed")
      );

      await deleteOldCards();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Could not delete")
      );
      
      consoleSpy.mockRestore();
    });

    it("should handle no keys to delete", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await deleteOldCards();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No old storage keys found")
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe("hasOldCards()", () => {
    it("should return true when old cards exist", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        JSON.stringify([{ id: "1", bank: "Test" }])
      );

      const result = await hasOldCards();

      expect(result).toBe(true);
    });

    it("should return false when no old cards exist", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const result = await hasOldCards();

      expect(result).toBe(false);
    });
  });

  describe("Deletion Verification", () => {
    it("should confirm old cards are gone after deletion", async () => {
      // Setup: Cards exist initially
      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([{ id: "1" }]))
        .mockResolvedValue(null);
      
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      // Verify cards exist before
      const beforeDeletion = await hasOldCards();
      expect(beforeDeletion).toBe(true);

      // Delete
      await deleteOldCards();

      // Verify cards gone after
      const afterDeletion = await hasOldCards();
      expect(afterDeletion).toBe(false);
    });
  });
});
