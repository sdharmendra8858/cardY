/**
 * Legal Configuration
 */
export const LEGAL_CONFIG = {
  /**
   * Current version of the Terms and Conditions.
   * Updating this will force all users to accept the new terms on next launch.
   * Format: YYYY-MM-DD
   */
  TERMS_VERSION: "2026-03-28",
  
  /**
   * AsyncStorage keys for legal compliance
   */
  KEYS: {
    TERMS_ACCEPTED: "terms_accepted",
    TERMS_VERSION: "terms_version_accepted",
  }
};
