/**
 * Card Storage Migration Utility
 * 
 * Migrates cards from old storage (SecureStore) to new storage (AsyncStorage with encryption)
 * Runs once on app startup if old cards are detected
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { addCard, getMaskedCards } from "../secureStorage";

/* -------------------------------------------------------------------------- */
/*                              MIGRATION CONFIG                               */
/* -------------------------------------------------------------------------- */

// Old storage keys (from main branch / PR#41)
const OLD_STORAGE_KEYS = {
  ENCRYPTED: "cards_encrypted",      // Main branch key
  MASKED: "cards_masked",            // Main branch masked key
  UNMASKED: "cards_unmasked",        // Main branch unmasked key
};

// Migration status key
const MIGRATION_STATUS_KEY = "card_migration_completed";
const MIGRATION_VERSION = "v1.0.0";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                     */
/* -------------------------------------------------------------------------- */

type OldCard = {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv?: string;
  cardName?: string;
  cardKind?: "credit" | "debit";
  cobrandName?: string;
  cardUser?: "self" | "other";
  dominantColor?: string;
  bank?: string;
  cardExpiresAt?: number;
  isPinned?: boolean;
};

type MigrationResult = {
  success: boolean;
  migratedCount: number;
  errors: string[];
  source: "securestore" | "none";
};

/* -------------------------------------------------------------------------- */
/*                              HELPER FUNCTIONS                               */
/* -------------------------------------------------------------------------- */

/**
 * Check if migration has already been completed
 */
async function isMigrationCompleted(): Promise<boolean> {
  try {
    const status = await AsyncStorage.getItem(MIGRATION_STATUS_KEY);
    if (status === MIGRATION_VERSION) {
      if (__DEV__) console.log("✅ Migration already completed");
      return true;
    }
    return false;
  } catch (error) {
    console.error("❌ Failed to check migration status:", error);
    return false;
  }
}

/**
 * Mark migration as completed
 */
async function markMigrationCompleted(): Promise<void> {
  try {
    await AsyncStorage.setItem(MIGRATION_STATUS_KEY, MIGRATION_VERSION);
    if (__DEV__) console.log("✅ Migration marked as completed");
  } catch (error) {
    console.error("❌ Failed to mark migration as completed:", error);
  }
}

/**
 * Check if new storage already has cards
 */
async function hasNewStorageCards(): Promise<boolean> {
  try {
    const cards = await getMaskedCards();
    return cards.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Try to read cards from old SecureStore storage
 */
async function readOldSecureStoreCards(): Promise<OldCard[]> {
  const errors: string[] = [];
  
  // Try main branch unmasked storage first (most complete data)
  try {
    if (__DEV__) console.log("🔍 Checking old storage: cards_unmasked");
    const value = await SecureStore.getItemAsync(OLD_STORAGE_KEYS.UNMASKED, {
      keychainService: OLD_STORAGE_KEYS.UNMASKED,
    });
    
    if (value) {
      const parsed = JSON.parse(value);
      
      // Check if it's encrypted (main branch format)
      if (parsed.ciphertext && parsed.iv && parsed.tag) {
        if (__DEV__) console.log("⚠️ Old storage is encrypted, trying to decrypt...");
        // Old storage was encrypted - try to decrypt with old encryption method
        try {
          const { decryptCards } = await import("../encryption/cardEncryption");
          const decrypted = await decryptCards(parsed);
          if (Array.isArray(decrypted) && decrypted.length > 0) {
            if (__DEV__) console.log(`✅ Found ${decrypted.length} cards in old encrypted storage`);
            return decrypted as OldCard[];
          }
        } catch (decryptError) {
          errors.push(`Failed to decrypt old cards: ${decryptError}`);
          if (__DEV__) console.warn("⚠️ Failed to decrypt old cards, trying other sources...");
        }
      } else if (Array.isArray(parsed)) {
        // Plain JSON format (PR#41 format)
        if (__DEV__) console.log(`✅ Found ${parsed.length} cards in old plain storage`);
        return parsed as OldCard[];
      }
    }
  } catch (error) {
    errors.push(`cards_unmasked: ${error}`);
    if (__DEV__) console.log("ℹ️ No cards in cards_unmasked");
  }

  // Try main branch masked storage
  try {
    if (__DEV__) console.log("🔍 Checking old storage: cards_masked");
    const value = await SecureStore.getItemAsync(OLD_STORAGE_KEYS.MASKED, {
      keychainService: OLD_STORAGE_KEYS.MASKED,
    });
    
    if (value) {
      const parsed = JSON.parse(value);
      
      if (parsed.ciphertext && parsed.iv && parsed.tag) {
        try {
          const { decryptCards } = await import("../encryption/cardEncryption");
          const decrypted = await decryptCards(parsed);
          if (Array.isArray(decrypted) && decrypted.length > 0) {
            if (__DEV__) console.log(`✅ Found ${decrypted.length} cards in old masked storage`);
            return decrypted as OldCard[];
          }
        } catch (decryptError) {
          errors.push(`Failed to decrypt masked cards: ${decryptError}`);
        }
      } else if (Array.isArray(parsed)) {
        if (__DEV__) console.log(`✅ Found ${parsed.length} cards in old masked storage`);
        return parsed as OldCard[];
      }
    }
  } catch (error) {
    errors.push(`cards_masked: ${error}`);
    if (__DEV__) console.log("ℹ️ No cards in cards_masked");
  }

  // Try PR#41 format (cards_encrypted)
  try {
    if (__DEV__) console.log("🔍 Checking old storage: cards_encrypted");
    const value = await SecureStore.getItemAsync(OLD_STORAGE_KEYS.ENCRYPTED, {
      keychainService: OLD_STORAGE_KEYS.ENCRYPTED,
    });
    
    if (value) {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (__DEV__) console.log(`✅ Found ${parsed.length} cards in PR#41 format`);
        return parsed as OldCard[];
      }
    }
  } catch (error) {
    errors.push(`cards_encrypted: ${error}`);
    if (__DEV__) console.log("ℹ️ No cards in cards_encrypted");
  }

  if (__DEV__ && errors.length > 0) {
    console.log("ℹ️ Migration check errors (expected if no old cards):", errors);
  }

  return [];
}

/**
 * Delete old storage keys after successful migration
 */
async function cleanupOldStorage(): Promise<void> {
  const cleanupPromises: Promise<void>[] = [];

  // Delete from SecureStore
  for (const key of Object.values(OLD_STORAGE_KEYS)) {
    cleanupPromises.push(
      SecureStore.deleteItemAsync(key, { keychainService: key })
        .then(() => {
          if (__DEV__) console.log(`🧹 Deleted old storage key: ${key}`);
        })
        .catch((error) => {
          // Ignore errors - key might not exist
          if (__DEV__) console.log(`ℹ️ Could not delete ${key} (may not exist):`, error.message);
        })
    );
  }

  await Promise.allSettled(cleanupPromises);
  if (__DEV__) console.log("✅ Old storage cleanup completed");
}

/* -------------------------------------------------------------------------- */
/*                              MAIN MIGRATION                                 */
/* -------------------------------------------------------------------------- */

/**
 * Migrate cards from old storage to new encrypted storage
 * 
 * @returns Migration result with success status and details
 */
export async function migrateCardsIfNeeded(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    errors: [],
    source: "none",
  };

  try {
    if (__DEV__) console.log("🔄 Starting card migration check...");

    // Step 1: Check if migration already completed
    const alreadyMigrated = await isMigrationCompleted();
    if (alreadyMigrated) {
      if (__DEV__) console.log("✅ Migration already completed, skipping");
      result.success = true;
      return result;
    }

    // Step 2: Check if new storage already has cards
    const hasNewCards = await hasNewStorageCards();
    if (hasNewCards) {
      if (__DEV__) console.log("✅ New storage already has cards, marking migration as complete");
      await markMigrationCompleted();
      result.success = true;
      return result;
    }

    // Step 3: Try to read cards from old storage
    if (__DEV__) console.log("🔍 Checking for cards in old storage...");
    const oldCards = await readOldSecureStoreCards();

    if (oldCards.length === 0) {
      if (__DEV__) console.log("ℹ️ No cards found in old storage, marking migration as complete");
      await markMigrationCompleted();
      result.success = true;
      return result;
    }

    // Step 4: Migrate cards to new storage
    if (__DEV__) console.log(`🚀 Migrating ${oldCards.length} cards to new storage...`);
    result.source = "securestore";

    for (let i = 0; i < oldCards.length; i++) {
      const card = oldCards[i];
      try {
        if (__DEV__) console.log(`📦 Migrating card ${i + 1}/${oldCards.length}: ${card.id}`);
        
        // Add card to new storage (will be encrypted automatically)
        await addCard(card);
        result.migratedCount++;
        
        if (__DEV__) console.log(`✅ Card ${i + 1}/${oldCards.length} migrated successfully`);
      } catch (error) {
        const errorMsg = `Failed to migrate card ${card.id}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    // Step 5: Verify migration
    const verifyCards = await getMaskedCards();
    if (verifyCards.length === result.migratedCount) {
      if (__DEV__) console.log(`✅ Migration verified: ${verifyCards.length} cards in new storage`);
      
      // Step 6: Cleanup old storage ONLY after successful verification
      await cleanupOldStorage();
      
      // Step 7: Mark migration as completed
      await markMigrationCompleted();
      
      result.success = true;
      if (__DEV__) console.log(`🎉 Migration completed successfully! Migrated ${result.migratedCount} cards`);
    } else {
      result.success = false;
      result.errors.push(`Verification failed: expected ${result.migratedCount}, found ${verifyCards.length}`);
      console.error("❌ Migration verification failed - OLD STORAGE PRESERVED");
      console.error("⚠️ Users can still access cards from old storage via fallback mechanism");
      // DO NOT delete old storage - users can still access cards via fallback
      // DO NOT mark migration as complete - will retry next time
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Migration failed: ${error}`);
    console.error("❌ Card migration failed:", error);
  }

  return result;
}

/**
 * Force re-run migration (for testing or manual recovery)
 */
export async function resetMigrationStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MIGRATION_STATUS_KEY);
    if (__DEV__) console.log("🔄 Migration status reset");
  } catch (error) {
    console.error("❌ Failed to reset migration status:", error);
  }
}

/**
 * Get migration status for debugging
 */
export async function getMigrationStatus(): Promise<{
  completed: boolean;
  version: string | null;
  hasOldCards: boolean;
  hasNewCards: boolean;
}> {
  try {
    const completed = await isMigrationCompleted();
    const version = await AsyncStorage.getItem(MIGRATION_STATUS_KEY);
    const oldCards = await readOldSecureStoreCards();
    const newCards = await getMaskedCards();

    return {
      completed,
      version,
      hasOldCards: oldCards.length > 0,
      hasNewCards: newCards.length > 0,
    };
  } catch (error) {
    console.error("❌ Failed to get migration status:", error);
    return {
      completed: false,
      version: null,
      hasOldCards: false,
      hasNewCards: false,
    };
  }
}
