import { gcm } from "@noble/ciphers/aes.js";
import { randomBytes } from "@noble/ciphers/utils.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    base64ToBytes,
    bytesToBase64,
    getMasterKey,
} from "./masterKeyManager";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

export type EncryptionResult = {
  iv: string;          // base64
  ciphertext: string; // base64 (includes auth tag, or separate)
  tag?: string;       // base64 (optional, for backward compatibility)
};

/* -------------------------------------------------------------------------- */
/*                                  CONSTANTS                                 */
/* -------------------------------------------------------------------------- */

const ENCRYPTED_DEK_KEY = "encrypted_dek";

let cachedDEK: Uint8Array | null = null;

/* -------------------------------------------------------------------------- */
/*                              Data Key (DEK)                                 */
/* -------------------------------------------------------------------------- */

async function getDEK(): Promise<Uint8Array> {
  if (cachedDEK) return cachedDEK;

  const stored = await AsyncStorage.getItem(ENCRYPTED_DEK_KEY);
  if (!stored) throw new Error("DEK_MISSING");

  try {
    // getMasterKey now returns base64 string from manager
    const mkBase64 = await getMasterKey();
    const mk = base64ToBytes(mkBase64);
    
    const parsed = JSON.parse(stored);

    const dek = gcm(mk, base64ToBytes(parsed.iv)).decrypt(
      parsed.tag 
        ? new Uint8Array([...base64ToBytes(parsed.ciphertext), ...base64ToBytes(parsed.tag)])
        : base64ToBytes(parsed.ciphertext)
    );

    cachedDEK = dek;
    return dek;
  } catch (error) {
    // If decryption fails (e.g., master key changed), regenerate DEK
    if (__DEV__) console.warn("⚠️ DEK decryption failed, regenerating...", error);
    
    // Clear the invalid DEK
    await AsyncStorage.removeItem(ENCRYPTED_DEK_KEY);
    cachedDEK = null;
    
    // Create a new DEK with the current master key
    return await createAndStoreDEK();
  }
}

async function createAndStoreDEK(): Promise<Uint8Array> {
  const mkBase64 = await getMasterKey();
  const mk = base64ToBytes(mkBase64);
  
  const dek = randomBytes(32);
  const iv = randomBytes(12);

  const encrypted = gcm(mk, iv).encrypt(dek);

  await AsyncStorage.setItem(
    ENCRYPTED_DEK_KEY,
    JSON.stringify({
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(encrypted),
    })
  );

  cachedDEK = dek;
  return dek;
}

/* -------------------------------------------------------------------------- */
/*                               Public API                                   */
/* -------------------------------------------------------------------------- */

export async function encryptCards(
  data: unknown
): Promise<EncryptionResult> {
  const dek =
    (await AsyncStorage.getItem(ENCRYPTED_DEK_KEY))
      ? await getDEK()
      : await createAndStoreDEK();

  const iv = randomBytes(12);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ciphertext = gcm(dek, iv).encrypt(plaintext);

  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  };
}

export async function decryptCards(
  payload: EncryptionResult
): Promise<unknown> {
  const dek = await getDEK();

  const ciphertextWithTag = payload.tag
    ? new Uint8Array([...base64ToBytes(payload.ciphertext), ...base64ToBytes(payload.tag)])
    : base64ToBytes(payload.ciphertext);

  const plaintext = gcm(dek, base64ToBytes(payload.iv)).decrypt(ciphertextWithTag);

  return JSON.parse(new TextDecoder().decode(plaintext));
}

export async function encryptRaw(
  data: Uint8Array
): Promise<EncryptionResult> {
  const dek =
    (await AsyncStorage.getItem(ENCRYPTED_DEK_KEY))
      ? await getDEK()
      : await createAndStoreDEK();

  const iv = randomBytes(12);
  const ciphertext = gcm(dek, iv).encrypt(data);

  return {
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
  };
}

export async function decryptRaw(
  payload: EncryptionResult
): Promise<Uint8Array> {
  const dek = await getDEK();

  const ciphertextWithTag = payload.tag
    ? new Uint8Array([...base64ToBytes(payload.ciphertext), ...base64ToBytes(payload.tag)])
    : base64ToBytes(payload.ciphertext);

  return gcm(dek, base64ToBytes(payload.iv)).decrypt(ciphertextWithTag);
}

export function resetEncryptionCache() {
  cachedDEK = null;
}

// Aliases for compatibility with the rest of the project
export const encryptCardData = encryptCards;
export const decryptCardData = decryptCards;

// Generic aliases for ID Vault and other features
export const encryptData = encryptCards;
export const decryptData = decryptCards;