/**
 * Card Migrator
 * 
 * Orchestrates the migration process:
 * 1. Read cards from old storage
 * 2. Transform to new format
 * 3. Save to new storage
 * 4. Verify migration
 * 5. Delete old storage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteOldCards, hasOldCards, readOldCards } from "./oldStorage";
import { filterExpiredImports, transformCards, validateCards } from "./transformer";
import { MIGRATION_CONFIG, MigrationResult } from "./types";

/* -------------------------------------------------------------------------- */
/*                          MIGRATION STATUS                                   */
/* -------------------------------------------------------------------------- */

/**
 * Check if migration has already been completed
 */
async function isMigrationCompleted(): Promise<boolean> {
  try {
    const status = await AsyncStorage.getItem(MIGRATION_CONFIG.STATUS_KEY);
    return status === MIGRATION_CONFIG.VERSION;
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
    await AsyncStorage.setItem(MIGRATION_CONFIG.STATUS_KEY, MIGRATION_CONFIG.VERSION);
    if (__DEV__) console.log("✅ Migration marked as completed");
  } catch (error) {
    console.error("❌ Failed to mark migration as completed:", error);
  }
}

/**
 * Reset migration status (for testing)
 */
export async function resetMigrationStatus(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MIGRATION_CONFIG.STATUS_KEY);
    if (__DEV__) console.log("🔄 Migration status reset");
  } catch (error) {
    console.error("❌ Failed to reset migration status:", error);
  }
}

/* -------------------------------------------------------------------------- */
/*                          NEW STORAGE CHECK                                  */
/* -------------------------------------------------------------------------- */

/**
 * Check if new storage already has cards
 */
async function hasNewStorageCards(): Promise<boolean> {
  try {
    // Import dynamically to avoid circular dependencies
    const { getMaskedCards } = await import("../secureStorage");
    const cards = await getMaskedCards();
    return cards.length > 0;
  } catch (error) {
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                          MIGRATION VERIFICATION                             */
/* -------------------------------------------------------------------------- */

/**
 * Verify that migration was successful
 * Checks that:
 * - Expected number of cards are in new storage (both masked and unmasked)
 * - Old cards count matches new cards count
 */
async function verifyMigration(expectedCount: number): Promise<boolean> {
  try {
    const { getMaskedCards, getUnmaskedCards } = await import("../secureStorage");
    const maskedCards = await getMaskedCards();
    const unmaskedCards = await getUnmaskedCards();

    // Check both masked and unmasked have the expected count
    const maskedSuccess = maskedCards.length === expectedCount;
    const unmaskedSuccess = unmaskedCards.length === expectedCount;
    const success = maskedSuccess && unmaskedSuccess;

    if (success) {
      if (__DEV__) {
        console.log(`✅ Migration verified: ${maskedCards.length} masked cards, ${unmaskedCards.length} unmasked cards`);
      }
    } else {
      console.error(`❌ Migration verification failed:`);
      console.error(`   Expected: ${expectedCount} cards`);
      console.error(`   Found: ${maskedCards.length} masked, ${unmaskedCards.length} unmasked`);
    }

    return success;
  } catch (error) {
    console.error("❌ Migration verification error:", error);
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                          MAIN MIGRATION FUNCTION                            */
/* -------------------------------------------------------------------------- */

/**
 * Migrate cards from old storage to new storage
 * 
 * Process:
 * 1. Check if migration already completed
 * 2. Check if new storage already has cards
 * 3. Read cards from old storage
 * 4. Transform cards to new format
 * 5. Validate and filter cards
 * 6. Save cards to new storage
 * 7. Verify migration success
 * 8. Delete old storage (only if verification passes)
 * 9. Mark migration as completed
 * 
 * @returns Migration result with success status and details
 */
export async function migrateCards(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    errors: [],
    source: "none",
  };

  try {
    if (__DEV__) console.log("🔄 Starting card migration...");

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

    // Step 3: Read cards from old storage
    if (__DEV__) console.log("🔍 Reading cards from old storage...");
    const oldCards = await readOldCards();

    if (oldCards.length === 0) {
      if (__DEV__) console.log("ℹ️ No cards found in old storage, marking migration as complete");
      await markMigrationCompleted();
      result.success = true;
      return result;
    }

    if (__DEV__) console.log(`📦 Found ${oldCards.length} cards in old storage`);
    result.source = "securestore";

    // Step 4: Transform cards to new format
    if (__DEV__) console.log("🔄 Transforming cards to new format...");
    const transformedCards = transformCards(oldCards);

    // Step 5: Validate and filter cards
    if (__DEV__) console.log("✅ Validating transformed cards...");
    const { valid: validCards, invalid: invalidIds } = validateCards(transformedCards);

    if (invalidIds.length > 0) {
      result.errors.push(`Found ${invalidIds.length} invalid cards: ${invalidIds.join(", ")}`);
    }

    // Filter out expired imported cards
    const activeCards = filterExpiredImports(validCards);

    if (activeCards.length === 0) {
      if (__DEV__) console.log("⚠️ No valid cards to migrate after filtering");
      await markMigrationCompleted();
      result.success = true;
      return result;
    }

    // Step 6: Save cards to new storage
    if (__DEV__) console.log(`💾 Saving ${activeCards.length} cards to new storage...`);
    const { setCards } = await import("../secureStorage");

    try {
      await setCards(activeCards);
      result.migratedCount = activeCards.length;
      if (__DEV__) console.log(`✅ Saved ${activeCards.length} cards to new storage`);
    } catch (saveError) {
      const errorMsg = `Failed to save cards to new storage: ${saveError}`;
      result.errors.push(errorMsg);
      console.error("❌", errorMsg);
      return result; // Don't delete old storage if save failed
    }

    // Step 7: Verify migration success
    if (__DEV__) console.log("🔍 Verifying migration...");
    const verified = await verifyMigration(activeCards.length);

    if (!verified) {
      result.errors.push("Migration verification failed");
      console.error("❌ Migration verification failed - OLD STORAGE PRESERVED");
      console.error("⚠️ Users can still access cards from old storage via fallback");
      return result; // Don't delete old storage or mark complete
    }

    // Step 8: Delete old storage (only after successful verification)
    if (__DEV__) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("🗑️ STEP 8: Deleting old storage");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }
    await deleteOldCards();
    if (__DEV__) {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("✅ Old storage deletion completed");
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }

    // Step 9: Mark migration as completed
    await markMigrationCompleted();

    result.success = true;
    if (__DEV__) console.log(`🎉 Migration completed successfully! Migrated ${result.migratedCount} cards`);

  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : String(error)}`;
    result.errors.push(errorMsg);
    console.error("❌", errorMsg);
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/*                          MIGRATION NEED CHECK                               */
/* -------------------------------------------------------------------------- */

/**
 * Check if migration is needed
 * Migration is needed if:
 * - Migration has NOT been completed (flag not set), AND
 * - Old cards exist (length > 0), AND
 * - New storage is empty (both masked and unmasked length = 0)
 * 
 * SPECIAL CASE: If migration flag IS set but old cards still exist AND new storage is empty,
 * this means migration ran but failed to delete old cards. Reset flag and re-run migration.
 * 
 * @returns true if migration should run, false otherwise
 */
export async function needsMigration(): Promise<boolean> {
  try {
    // First check if migration was already completed
    const completed = await isMigrationCompleted();
    
    // Check if old cards exist
    const oldCards = await readOldCards();
    const hasOldCards = oldCards.length > 0;

    if (!hasOldCards) {
      if (__DEV__) console.log("🔍 No old cards exist, migration not needed");
      return false;
    }

    // Check if new storage has cards (both masked and unmasked)
    let newMaskedCount = 0;
    let newUnmaskedCount = 0;
    
    try {
      const { getMaskedCards, getUnmaskedCards } = await import("../secureStorage");
      const maskedCards = await getMaskedCards();
      const unmaskedCards = await getUnmaskedCards();
      newMaskedCount = maskedCards.length;
      newUnmaskedCount = unmaskedCards.length;
    } catch (error) {
      // If we can't check, assume no cards
      newMaskedCount = 0;
      newUnmaskedCount = 0;
    }

    const newStorageEmpty = newMaskedCount === 0 && newUnmaskedCount === 0;

    // SPECIAL CASE: Migration flag set but old cards exist and new storage empty
    // This means migration ran but failed to delete old cards (likely due to old deletion bug)
    if (completed && hasOldCards && newStorageEmpty) {
      console.warn("⚠️ DETECTED: Migration flag set but old cards still exist!");
      console.warn("⚠️ This means migration ran but failed to delete old cards.");
      console.warn("🔄 Auto-fixing: Resetting migration flag to re-run with new deletion code...");
      
      // Reset the flag so migration runs again
      await AsyncStorage.removeItem(MIGRATION_CONFIG.STATUS_KEY);
      
      if (__DEV__) {
        console.log("🔍 Migration check (after auto-fix):", {
          completed: false, // Now false after reset
          oldCardsCount: oldCards.length,
          newMaskedCount,
          newUnmaskedCount,
          needed: true, // Will re-run migration
        });
      }
      
      return true; // Re-run migration
    }

    if (completed) {
      if (__DEV__) console.log("🔍 Migration already completed (flag set), not needed");
      return false;
    }

    // Migration needed if old cards exist but new storage is empty
    const needed = newStorageEmpty;

    if (__DEV__) {
      console.log("🔍 Migration check:", {
        completed,
        oldCardsCount: oldCards.length,
        newMaskedCount,
        newUnmaskedCount,
        needed,
      });
    }

    return needed;
  } catch (error) {
    console.error("❌ Failed to check migration need:", error);
    // On error, assume migration is NOT needed (safer)
    return false;
  }
}

/* -------------------------------------------------------------------------- */
/*                          MIGRATION STATUS INFO                              */
/* -------------------------------------------------------------------------- */

/**
 * Get detailed migration status for debugging
 */
export async function getMigrationStatus() {
  try {
    const completed = await isMigrationCompleted();
    const version = await AsyncStorage.getItem(MIGRATION_CONFIG.STATUS_KEY);
    const oldCards = await hasOldCards();
    const newCards = await hasNewStorageCards();

    return {
      completed,
      version,
      hasOldCards: oldCards,
      hasNewCards: newCards,
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
