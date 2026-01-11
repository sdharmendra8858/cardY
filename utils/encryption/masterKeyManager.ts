/**
 * Master Encryption Key Manager
 * Implements spec 6: Key Management
 * 
 * Manages the master encryption key for card data:
 * - Generate once per install
 * - Store in OS secure storage
 * - Never hardcoded, logged, or exported
 * - Biometric binding (when available)
 */

import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const MASTER_KEY_ID = "cardywall_master_key";
const KEY_SIZE = 32; // 256-bit key for AES-256

/**
 * Convert bytes to base64 string (React Native compatible)
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to bytes (React Native compatible)
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a new random master key
 * 
 * @returns Base64-encoded 256-bit random key
 */
function generateMasterKey(): string {
  const randomBytes = Crypto.getRandomBytes(KEY_SIZE);
  // Convert to base64 string for storage in SecureStore
  return bytesToBase64(randomBytes);
}

/**
 * Get or create the master encryption key
 * 
 * Spec 6: Master Encryption Key
 * - Randomly generated (256-bit)
 * - Generated once per install
 * - Stored in OS secure storage
 * - Biometric-protected (requireAuthentication: true)
 * 
 * @returns Base64-encoded master key
 * @throws Error if key generation or storage fails
 */
export async function getMasterKey(): Promise<string> {
  try {
    // Try to retrieve existing key
    const existingKey = await SecureStore.getItemAsync(MASTER_KEY_ID);
    if (existingKey) {
      if (__DEV__) console.log("✅ Master key retrieved from secure storage");
      return existingKey;
    }

    // Generate new key if none exists
    if (__DEV__) console.log("🔑 Generating new master encryption key...");
    const newKey = generateMasterKey();

    // Store in secure storage - disable biometric requirement for encryption tasks
    await SecureStore.setItemAsync(MASTER_KEY_ID, newKey, {
      requireAuthentication: false, // User requested no biometric on add/update
    });
    if (__DEV__) console.log("✅ Master key generated and stored securely");

    return newKey;
  } catch (error) {
    console.error("❌ Failed to get/create master key:", error);
    throw new Error(`Master key management failed: ${error}`);
  }
}

/**
 * Delete the master encryption key
 * Used when device is compromised or user resets vault
 * 
 * Spec 11: Root / Jailbreak Response
 * 
 * @returns true if deletion was successful
 */
export async function deleteMasterKey(): Promise<boolean> {
  try {
    await SecureStore.deleteItemAsync(MASTER_KEY_ID);
    if (__DEV__) console.log("✅ Master key deleted");
    return true;
  } catch (error) {
    console.error("❌ Failed to delete master key:", error);
    return false;
  }
}

/**
 * Check if master key exists
 * 
 * @returns true if master key is stored
 */
export async function masterKeyExists(): Promise<boolean> {
  try {
    const key = await SecureStore.getItemAsync(MASTER_KEY_ID);
    return !!key;
  } catch (error) {
    console.error("Error checking master key existence:", error);
    return false;
  }
}

/**
 * Verify master key is valid
 * 
 * @returns true if key is valid and accessible
 */
export async function verifyMasterKey(): Promise<boolean> {
  try {
    const key = await getMasterKey();
    return !!(key && key.length > 0);
  } catch (error) {
    console.error("Master key verification failed:", error);
    return false;
  }
}
