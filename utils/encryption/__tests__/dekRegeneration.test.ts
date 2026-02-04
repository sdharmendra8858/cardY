/**
 * DEK Regeneration Tests
 * 
 * Tests for DEK regeneration when master key changes
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock crypto libraries before importing
jest.mock("@noble/ciphers/aes.js", () => ({
  gcm: jest.fn(() => ({
    encrypt: jest.fn((data) => new Uint8Array([1, 2, 3, 4])),
    decrypt: jest.fn((data) => {
      // Simulate decryption failure for old DEK
      if (data.toString() === "1,2,3,4") {
        throw new Error("aes/gcm: invalid ghash tag");
      }
      return new Uint8Array([5, 6, 7, 8]);
    }),
  })),
}));

jest.mock("@noble/ciphers/utils.js", () => ({
  randomBytes: jest.fn((size) => new Uint8Array(size).fill(1)),
}));

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("../masterKeyManager", () => ({
  getMasterKey: jest.fn(),
  bytesToBase64: (bytes: Uint8Array) => Buffer.from(bytes).toString("base64"),
  base64ToBytes: (str: string) => new Uint8Array(Buffer.from(str, "base64")),
}));

import { encryptCards, resetEncryptionCache } from "../cardEncryption";

describe("DEK Regeneration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetEncryptionCache();
  });

  describe("DEK Creation", () => {
    it("should create DEK if none exists", async () => {
      const { getMasterKey } = require("../masterKeyManager");
      
      // No DEK exists
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      getMasterKey.mockResolvedValue("bmV3TWFzdGVyS2V5MTIzNDU2Nzg5MDEyMzQ1Njc4OTA=");

      await encryptCards({ test: "data" });

      // Verify DEK was created
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "encrypted_dek",
        expect.any(String)
      );
    });

    it("should encrypt DEK with master key", async () => {
      const { getMasterKey } = require("../masterKeyManager");
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      getMasterKey.mockResolvedValue("bmV3TWFzdGVyS2V5MTIzNDU2Nzg5MDEyMzQ1Njc4OTA=");

      await encryptCards({ test: "data" });

      const setItemCall = (AsyncStorage.setItem as jest.Mock).mock.calls.find(
        call => call[0] === "encrypted_dek"
      );
      
      expect(setItemCall).toBeDefined();
      
      const dekData = JSON.parse(setItemCall[1]);
      expect(dekData).toHaveProperty("iv");
      expect(dekData).toHaveProperty("ciphertext");
    });
  });

  describe("DEK Cache Management", () => {
    it("should clear cache when resetEncryptionCache called", async () => {
      const { getMasterKey } = require("../masterKeyManager");
      
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      getMasterKey.mockResolvedValue("bmV3TWFzdGVyS2V5MTIzNDU2Nzg5MDEyMzQ1Njc4OTA=");

      // First call
      await encryptCards({ test: "data1" });
      
      // Reset cache
      resetEncryptionCache();
      
      // Clear mock calls
      (AsyncStorage.getItem as jest.Mock).mockClear();
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      // Second call should fetch DEK again
      await encryptCards({ test: "data2" });
      
      expect(AsyncStorage.getItem).toHaveBeenCalledWith("encrypted_dek");
    });
  });

  describe("Error Handling", () => {
    it("should handle storage errors gracefully", async () => {
      const { getMasterKey } = require("../masterKeyManager");
      
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("Storage error"));
      getMasterKey.mockResolvedValue("bmV3TWFzdGVyS2V5MTIzNDU2Nzg5MDEyMzQ1Njc4OTA=");

      await expect(encryptCards({ test: "data" })).rejects.toThrow();
    });
  });
});
