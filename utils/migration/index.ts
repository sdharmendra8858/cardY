/**
 * Migration Module
 * 
 * Central export point for all migration functionality
 */

// Types
export type {
    MigrationResult,
    MigrationStatus, NewCard,
    NewMaskedCard, OldCard,
    OldMaskedCard
} from "./types";

export {
    MIGRATION_CONFIG, NEW_STORAGE_KEYS, OLD_STORAGE_KEYS
} from "./types";

// Old Storage Access
export {
    deleteOldCards, getOldCardById, hasOldCards, readOldCards
} from "./oldStorage";

// Card Transformation
export {
    detectCardType, filterExpiredImports, isImportedCard,
    isImportedCardExpired, isValidCard, transformCard,
    transformCards, validateCards
} from "./transformer";

// Migration Orchestration
export {
    getMigrationStatus, migrateCards, needsMigration,
    resetMigrationStatus
} from "./migrator";

// Fallback System
export {
    getFallbackCard, hasFallbackCards, isInFallbackMode, readFallbackCards
} from "./fallback";

