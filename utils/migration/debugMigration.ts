/**
 * Debug Migration Helper
 * 
 * Use this to debug migration issues
 * Call from your app to see what's happening
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { MIGRATION_CONFIG, OLD_STORAGE_KEYS } from "./types";

export async function debugMigrationState() {
  console.log("🔍 ========== MIGRATION DEBUG ==========");

  // Check migration status
  try {
    const status = await AsyncStorage.getItem(MIGRATION_CONFIG.STATUS_KEY);
    console.log("📋 Migration Status:", status || "NOT SET");
    console.log("📋 Expected Version:", MIGRATION_CONFIG.VERSION);
    console.log("📋 Is Completed:", status === MIGRATION_CONFIG.VERSION);
  } catch (error) {
    console.error("❌ Failed to check migration status:", error);
  }

  // Check old storage keys
  console.log("\n🔍 Checking OLD storage keys:");
  for (const [name, key] of Object.entries(OLD_STORAGE_KEYS)) {
    try {
      const value = await SecureStore.getItemAsync(key, { keychainService: key });
      if (value) {
        console.log(`✅ ${name} (${key}): EXISTS (${value.length} chars)`);
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            console.log(`   └─ Array with ${parsed.length} items`);
          } else {
            console.log(`   └─ Object with keys:`, Object.keys(parsed));
          }
        } catch {
          console.log(`   └─ Not JSON or encrypted`);
        }
      } else {
        console.log(`❌ ${name} (${key}): EMPTY`);
      }
    } catch (error) {
      console.log(`❌ ${name} (${key}): ERROR -`, error);
    }
  }

  // Check new storage keys
  console.log("\n🔍 Checking NEW storage keys:");
  const newKeys = [
    "encrypted_cards_unmasked",
    "encrypted_cards_masked",
    "master_encryption_key",
  ];

  for (const key of newKeys) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        console.log(`✅ ${key}: EXISTS (${value.length} chars)`);
      } else {
        console.log(`❌ ${key}: EMPTY`);
      }
    } catch (error) {
      console.log(`❌ ${key}: ERROR -`, error);
    }
  }

  // Try to read old cards
  console.log("\n🔍 Attempting to read old cards:");
  try {
    const { readOldCards } = await import("./oldStorage");
    const oldCards = await readOldCards();
    console.log(`📦 Found ${oldCards.length} old cards`);
    if (oldCards.length > 0) {
      console.log("   Cards:", oldCards.map(c => ({
        id: c.id,
        name: c.bank || "Unknown",
        number: c.cardNumber?.slice(-4),
      })));
    }
  } catch (error) {
    console.error("❌ Failed to read old cards:", error);
  }

  // Try to read new cards
  console.log("\n🔍 Attempting to read new cards:");
  try {
    const { getMaskedCards } = await import("../secureStorage");
    const newCards = await getMaskedCards();
    console.log(`📦 Found ${newCards.length} new cards`);
    if (newCards.length > 0) {
      console.log("   Cards:", newCards.map(c => ({
        id: c.id,
        name: c.bank || "Unknown",
        number: c.cardNumber?.slice(-4),
      })));
    }
  } catch (error) {
    console.error("❌ Failed to read new cards:", error);
  }

  // Check master key
  console.log("\n🔍 Checking master key:");
  try {
    const { masterKeyExists } = await import("../encryption/masterKeyManager");
    const exists = await masterKeyExists();
    console.log(`🔑 Master key exists: ${exists}`);
  } catch (error) {
    console.error("❌ Failed to check master key:", error);
  }

  // Check if migration is needed
  console.log("\n🔍 Checking if migration needed:");
  try {
    const { needsMigration } = await import("./migrator");
    const needed = await needsMigration();
    console.log(`🚀 Migration needed: ${needed}`);
  } catch (error) {
    console.error("❌ Failed to check migration need:", error);
  }

  console.log("\n🔍 ========== END DEBUG ==========");
}

/**
 * Reset migration for testing
 * WARNING: This will allow migration to run again
 */
export async function resetMigrationForTesting() {
  console.log("🔄 Resetting migration status...");
  try {
    await AsyncStorage.removeItem(MIGRATION_CONFIG.STATUS_KEY);
    console.log("✅ Migration status reset");
  } catch (error) {
    console.error("❌ Failed to reset migration:", error);
  }
}

/**
 * Clear all storage (for testing)
 * WARNING: This will delete ALL cards and keys
 */
export async function clearAllStorageForTesting() {
  console.log("⚠️ CLEARING ALL STORAGE...");

  // Clear old storage
  for (const key of Object.values(OLD_STORAGE_KEYS)) {
    try {
      await SecureStore.deleteItemAsync(key, { keychainService: key });
      console.log(`✅ Cleared old key: ${key}`);
    } catch (error) {
      console.log(`ℹ️ Could not clear ${key}`);
    }
  }

  // Clear new storage
  const newKeys = [
    "encrypted_cards_unmasked",
    "encrypted_cards_masked",
    "master_encryption_key",
    MIGRATION_CONFIG.STATUS_KEY,
  ];

  for (const key of newKeys) {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`✅ Cleared new key: ${key}`);
    } catch (error) {
      console.log(`ℹ️ Could not clear ${key}`);
    }
  }

  console.log("✅ All storage cleared");
}

/**
 * Force delete old cards (for testing/debugging)
 * Use this if old cards remain after migration
 */
export async function forceDeleteOldCards() {
  console.log("\n🗑️ FORCE DELETING OLD CARDS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  const { deleteOldCards } = await import("./oldStorage");
  await deleteOldCards();
  
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Force deletion completed");
}

/**
 * Force re-run migration even if flag is set
 * Use this when old cards still exist after migration
 */
export async function forceReMigration() {
  console.log("\n🔄 FORCE RE-RUNNING MIGRATION");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Reset migration flag
  await AsyncStorage.removeItem(MIGRATION_CONFIG.STATUS_KEY);
  console.log("✅ Migration flag reset");

  // Run migration
  const { migrateCards } = await import("./migrator");
  const result = await migrateCards();

  console.log("\n📊 Migration Result:");
  console.log("  Success:", result.success);
  console.log("  Migrated Count:", result.migratedCount);
  console.log("  Errors:", result.errors);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Force re-migration completed");
  
  return result;
}
