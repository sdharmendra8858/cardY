/**
 * Migration Type Definitions
 * 
 * Defines old and new card structures for migration
 */

/* -------------------------------------------------------------------------- */
/*                              OLD CARD TYPES                                 */
/* -------------------------------------------------------------------------- */

/**
 * Old card structure (from main branch / PR#41)
 * This is what cards looked like before the migration
 */
export type OldCard = {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv?: string;
  cardKind?: "credit" | "debit";
  cobrandName?: string;
  cardUser?: "self" | "other";
  dominantColor?: string;
  bank?: string;
  cardExpiresAt?: number; // Unix timestamp for imported cards
  isPinned?: boolean;
  // Missing fields that exist in new format:
  // - cardType (auto-detected card network)
};

/**
 * Old masked card structure
 * Used for list display in old storage
 */
export type OldMaskedCard = Omit<OldCard, "cvv" | "expiry"> & {
  cvv?: undefined;
  expiry?: undefined;
};

/* -------------------------------------------------------------------------- */
/*                              NEW CARD TYPES                                 */
/* -------------------------------------------------------------------------- */

/**
 * New card structure (current format)
 * This is what cards look like after migration
 */
export type NewCard = {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiry?: string; // Made optional
  cvv?: string;
  cardKind?: "credit" | "debit";
  cardType?: string; // NEW: Auto-detected card network (visa, mastercard, etc.)
  cobrandName?: string;
  cardUser?: "self" | "other";
  dominantColor?: string;
  bank?: string;
  cardExpiresAt?: number; // Preserved for imported cards
  isPinned?: boolean;
};

/**
 * New masked card structure
 * Used for list display in new storage
 */
export type NewMaskedCard = Omit<NewCard, "cvv" | "expiry"> & {
  cvv?: undefined;
  expiry?: undefined;
};

/* -------------------------------------------------------------------------- */
/*                          MIGRATION RESULT TYPES                             */
/* -------------------------------------------------------------------------- */

/**
 * Result of migration operation
 */
export type MigrationResult = {
  success: boolean;
  migratedCount: number;
  errors: string[];
  source: "securestore" | "none";
};

/**
 * Migration status information
 */
export type MigrationStatus = {
  completed: boolean;
  version: string | null;
  hasOldCards: boolean;
  hasNewCards: boolean;
};

/* -------------------------------------------------------------------------- */
/*                          STORAGE KEY CONSTANTS                              */
/* -------------------------------------------------------------------------- */

/**
 * Old storage keys (SecureStore)
 */
export const OLD_STORAGE_KEYS = {
  ENCRYPTED: "cards_encrypted",      // PR#41 format
  MASKED: "cards_masked",            // Main branch masked
  UNMASKED: "cards_unmasked",        // Main branch unmasked
} as const;

/**
 * New storage keys (AsyncStorage)
 */
export const NEW_STORAGE_KEYS = {
  MASKED: "encrypted_cards_masked",
  UNMASKED: "encrypted_cards_unmasked",
} as const;

/**
 * Migration configuration
 */
export const MIGRATION_CONFIG = {
  VERSION: "v1.0.0",
  STATUS_KEY: "card_migration_completed",
  CLEANUP_DELAY_MS: 1500, // Delay before cleaning up old storage
} as const;
