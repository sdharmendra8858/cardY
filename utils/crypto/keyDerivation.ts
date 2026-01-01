/**
 * Key Derivation Function (HKDF-SHA256)
 * Implements HKDF per spec 8.3 and 10.3
 */

import * as Crypto from "expo-crypto";

const HKDF_INFO = "cardywall-card-share-v1";
const KEY_LENGTH = 32; // 256 bits for AES-256

/**
 * Derive encryption key using HKDF-SHA256
 * Spec 8.3: encryptionKey = HKDF(input = sharedSecret, salt = sessionId, info = "cardywall-card-share-v1")
 * 
 * @param sharedSecret Shared secret from ECDH (Uint8Array)
 * @param sessionId Session ID (string)
 * @returns Derived encryption key (Uint8Array, 32 bytes)
 * @throws Error if derivation fails
 */
export async function deriveEncryptionKey(
  sharedSecret: Uint8Array,
  sessionId: string
): Promise<Uint8Array> {
  try {
    // Convert shared secret to string for hashing
    const sharedSecretStr = Array.from(sharedSecret)
      .map((b) => String.fromCharCode(b))
      .join("");

    // Combine inputs: sharedSecret + sessionId + info
    const combined = sharedSecretStr + sessionId + HKDF_INFO;

    // Hash using SHA256
    const derivedHex = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      combined
    );

    // Convert hex string to Uint8Array (32 bytes for AES-256)
    const keyBytes = new Uint8Array(KEY_LENGTH);
    for (let i = 0; i < KEY_LENGTH; i++) {
      keyBytes[i] = parseInt(derivedHex.substring(i * 2, i * 2 + 2), 16);
    }

    return keyBytes;
  } catch (error) {
    throw new Error(`Key derivation failed: ${error}`);
  }
}
