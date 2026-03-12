/**
 * Migration Test Helper
 * 
 * Helper functions to test different migration scenarios
 * Use these to set up test data and verify migration behavior
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { MIGRATION_CONFIG, NEW_STORAGE_KEYS, OLD_STORAGE_KEYS } from "./types";

export const MigrationTestHelper = {
  /**
   * Reset everything - clean slate
   */
  async resetAll() {
    console.log("🧹 Resetting all storage...");
    
    // Clear new storage
    await AsyncStorage.multiRemove([
      NEW_STORAGE_KEYS.MASKED,
      NEW_STORAGE_KEYS.UNMASKED,
      MIGRATION_CONFIG.STATUS_KEY,
    ]);
    
    // Clear old storage
    await SecureStore.deleteItemAsync(OLD_STORAGE_KEYS.ENCRYPTED);
    await SecureStore.deleteItemAsync(OLD_STORAGE_KEYS.MASKED);
    await SecureStore.deleteItemAsync(OLD_STORAGE_KEYS.UNMASKED);
    await SecureStore.deleteItemAsync("master_key");
    
    console.log("✅ All storage cleared");
  },

  /**
   * Scenario 1: Fresh Install
   * No old cards, no new cards, no master key
   */
  async setupFreshInstall() {
    await this.resetAll();
    console.log("✅ Fresh install setup complete");
    console.log("📱 Reload app to test");
  },

  /**
   * Scenario 2: Existing User with Cards
   * Has new cards and master key
   */
  async setupExistingUser() {
    await this.resetAll();
    
    // Add some cards to new storage
    const mockCards = [
      {
        id: "test-1",
        cardNumber: "4111111111111111",
        cardHolder: "Test User",
        expiry: "12/25",
        cardType: "visa",
        isPinned: false,
      },
    ];
    
    await AsyncStorage.setItem(
      NEW_STORAGE_KEYS.MASKED,
      JSON.stringify(mockCards)
    );
    
    // Add master key
    await SecureStore.setItemAsync("master_key", "test-master-key-12345678901234567890123456789012");
    
    // Mark migration as completed
    await AsyncStorage.setItem(
      MIGRATION_CONFIG.STATUS_KEY,
      MIGRATION_CONFIG.VERSION
    );
    
    console.log("✅ Existing user setup complete");
    console.log("📱 Reload app to test");
  },

  /**
   * Scenario 3: User with Old Cards
   * Has old cards in SecureStore, no new cards
   */
  async setupUserWithOldCards() {
    await this.resetAll();
    
    // Add old cards to SecureStore
    const oldCards = [
      {
        id: "old-1",
        cardNumber: "4111111111111111",
        cardHolder: "Old User",
        expiry: "12/25",
        cvv: "123",
        isPinned: true,
        cardName: "My Visa Card",
        cardKind: "credit" as const,
        bank: "Test Bank",
      },
      {
        id: "old-2",
        cardNumber: "5500000000000004",
        cardHolder: "Old User",
        expiry: "06/26",
        cvv: "456",
        isPinned: false,
        cardName: "My Mastercard",
        cardKind: "debit" as const,
      },
    ];
    
    await SecureStore.setItemAsync(
      OLD_STORAGE_KEYS.ENCRYPTED,
      JSON.stringify(oldCards)
    );
    
    console.log("✅ User with old cards setup complete");
    console.log("📦 Added 2 old cards to SecureStore");
    console.log("📱 Reload app to test migration");
  },

  /**
   * Scenario 4: Missing Master Key
   * Has new cards but no master key
   */
  async setupMissingMasterKey() {
    await this.resetAll();
    
    // Add cards to new storage
    const mockCards = [
      {
        id: "test-1",
        cardNumber: "4111111111111111",
        cardHolder: "Test User",
        expiry: "12/25",
        cardType: "visa",
        isPinned: false,
      },
    ];
    
    await AsyncStorage.setItem(
      NEW_STORAGE_KEYS.MASKED,
      JSON.stringify(mockCards)
    );
    
    // Don't add master key - simulate missing key
    
    console.log("✅ Missing master key setup complete");
    console.log("📱 Reload app to test");
  },

  /**
   * Scenario 5: Corrupted New Storage
   * Has corrupted data in new storage
   */
  async setupCorruptedStorage() {
    await this.resetAll();
    
    // Add corrupted data
    await AsyncStorage.setItem(
      NEW_STORAGE_KEYS.MASKED,
      "corrupted-data-not-json"
    );
    
    // Add old cards as fallback
    const oldCards = [
      {
        id: "old-1",
        cardNumber: "4111111111111111",
        cardHolder: "Fallback User",
        expiry: "12/25",
        cvv: "123",
      },
    ];
    
    await SecureStore.setItemAsync(
      OLD_STORAGE_KEYS.ENCRYPTED,
      JSON.stringify(oldCards)
    );
    
    console.log("✅ Corrupted storage setup complete");
    console.log("📱 Reload app to test fallback");
  },

  /**
   * Reset migration status only
   * Use this to re-trigger migration without clearing cards
   */
  async resetMigrationStatus() {
    await AsyncStorage.removeItem(MIGRATION_CONFIG.STATUS_KEY);
    console.log("✅ Migration status reset");
    console.log("📱 Reload app to re-run migration");
  },

  /**
   * Check current state
   */
  async checkState() {
    console.log("\n📊 ===== Current Storage State =====");
    
    // Check new storage
    try {
      const maskedCards = await AsyncStorage.getItem(NEW_STORAGE_KEYS.MASKED);
      const unmaskedCards = await AsyncStorage.getItem(NEW_STORAGE_KEYS.UNMASKED);
      const migrationStatus = await AsyncStorage.getItem(MIGRATION_CONFIG.STATUS_KEY);
      
      console.log("\n📦 New Storage (AsyncStorage):");
      console.log("  - Masked cards:", maskedCards ? JSON.parse(maskedCards).length : 0);
      console.log("  - Unmasked cards:", unmaskedCards ? JSON.parse(unmaskedCards).length : 0);
      console.log("  - Migration status:", migrationStatus || "Not completed");
      
      if (maskedCards) {
        const cards = JSON.parse(maskedCards);
        console.log("\n  Cards:");
        cards.forEach((card: any, i: number) => {
          console.log(`    ${i + 1}. ${card.cardHolder} - ${card.cardType || "unknown"} (${card.isPinned ? "📌 pinned" : "unpinned"})`);
        });
      }
    } catch (error) {
      console.log("\n📦 New Storage: Error reading -", error);
    }
    
    // Check old storage
    try {
      const oldEncrypted = await SecureStore.getItemAsync(OLD_STORAGE_KEYS.ENCRYPTED);
      const oldMasked = await SecureStore.getItemAsync(OLD_STORAGE_KEYS.MASKED);
      const oldUnmasked = await SecureStore.getItemAsync(OLD_STORAGE_KEYS.UNMASKED);
      
      console.log("\n🔒 Old Storage (SecureStore):");
      console.log("  - Encrypted:", oldEncrypted ? `Present (${JSON.parse(oldEncrypted).length} cards)` : "None");
      console.log("  - Masked:", oldMasked ? "Present" : "None");
      console.log("  - Unmasked:", oldUnmasked ? "Present" : "None");
      
      if (oldEncrypted) {
        const cards = JSON.parse(oldEncrypted);
        console.log("\n  Old Cards:");
        cards.forEach((card: any, i: number) => {
          console.log(`    ${i + 1}. ${card.cardHolder} (${card.isPinned ? "📌 pinned" : "unpinned"})`);
        });
      }
    } catch (error) {
      console.log("\n🔒 Old Storage: Error reading -", error);
    }
    
    // Check master key
    try {
      const masterKey = await SecureStore.getItemAsync("master_key");
      console.log("\n🔑 Master Key:", masterKey ? "Present ✅" : "Missing ❌");
    } catch (error) {
      console.log("\n🔑 Master Key: Error reading -", error);
    }
    
    console.log("\n===================================\n");
  },

  /**
   * Quick test: Add sample old cards
   */
  async addSampleOldCards() {
    const sampleCards = [
      {
        id: "sample-1",
        cardNumber: "4111111111111111",
        cardHolder: "John Doe",
        expiry: "12/25",
        cvv: "123",
        isPinned: true,
        cardName: "Personal Visa",
        cardKind: "credit" as const,
        bank: "Chase Bank",
      },
      {
        id: "sample-2",
        cardNumber: "5500000000000004",
        cardHolder: "Jane Smith",
        expiry: "06/26",
        cvv: "456",
        isPinned: false,
        cardName: "Business Mastercard",
        cardKind: "debit" as const,
        bank: "Bank of America",
      },
      {
        id: "sample-3",
        cardNumber: "378282246310005",
        cardHolder: "Bob Johnson",
        expiry: "09/27",
        cvv: "789",
        isPinned: false,
        cardName: "Amex Gold",
        cardKind: "credit" as const,
      },
    ];
    
    await SecureStore.setItemAsync(
      OLD_STORAGE_KEYS.ENCRYPTED,
      JSON.stringify(sampleCards)
    );
    
    console.log("✅ Added 3 sample old cards");
    console.log("📱 Reload app to test migration");
  },
};

// Export individual functions for convenience
export const {
  resetAll,
  setupFreshInstall,
  setupExistingUser,
  setupUserWithOldCards,
  setupMissingMasterKey,
  setupCorruptedStorage,
  resetMigrationStatus,
  checkState,
  addSampleOldCards,
} = MigrationTestHelper;
