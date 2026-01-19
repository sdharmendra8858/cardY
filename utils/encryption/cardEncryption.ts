/**
 * Card Data Encryption/Decryption
 * Implements spec 5: Encryption Strategy
 * Uses react-native-aes-crypto for AES-256-CBC encryption
 */

import * as Crypto from "expo-crypto";
import AES from 'react-native-aes-crypto';
import { getMasterKey } from "./masterKeyManager";

export interface EncryptionResult {
  iv: string;
  ciphertext: string;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

export async function encryptCardData(cardData: string): Promise<EncryptionResult> {
  try {
    const masterKeyBase64 = await getMasterKey();
    const masterKeyBytes = base64ToBytes(masterKeyBase64);
    const masterKeyHex = bytesToHex(masterKeyBytes);

    // Generate random IV (16 bytes for AES)
    const iv = Crypto.getRandomBytes(16);
    const ivHex = bytesToHex(iv);

    // Encrypt using AES-256-CBC (react-native-aes-crypto)
    const ciphertext = await AES.encrypt(
      cardData,
      masterKeyHex,
      ivHex,
      'aes-256-cbc'
    );

    if (__DEV__) console.log("✅ Card data encrypted with AES-256-CBC");

    return {
      iv: ivHex,
      ciphertext: ciphertext,
    };
  } catch (error) {
    console.error("❌ Card encryption failed:", error);
    throw new Error(`Card encryption failed: ${error}`);
  }
}

export async function decryptCardData(encryptionResult: EncryptionResult): Promise<string> {
  try {
    if (!encryptionResult || !encryptionResult.ciphertext || !encryptionResult.iv) {
      if (__DEV__) console.log("ℹ️ Empty or invalid encryption result for decryption, returning empty string.");
      return "";
    }

    const masterKeyBase64 = await getMasterKey();
    const masterKeyBytes = base64ToBytes(masterKeyBase64);
    const masterKeyHex = bytesToHex(masterKeyBytes);

    // Decrypt using AES-256-CBC
    const cardData = await AES.decrypt(
      encryptionResult.ciphertext,
      masterKeyHex,
      encryptionResult.iv,
      'aes-256-cbc'
    );

    if (__DEV__) console.log("✅ Card data decrypted with AES-256-CBC");
    return cardData;
  } catch (error) {
    console.error("❌ Card decryption failed:", error);
    throw error; // Re-throw to let caller handle it
  }
}

export async function encryptCards(cards: any[]): Promise<EncryptionResult> {
  const cardJSON = JSON.stringify(cards);
  return encryptCardData(cardJSON);
}

export async function decryptCards(encryptionResult: EncryptionResult): Promise<any[]> {
  try {
    const cardJSON = await decryptCardData(encryptionResult);
    if (!cardJSON) {
      console.error("❌ Decryption returned empty string");
      return [];
    }
    return JSON.parse(cardJSON);
  } catch (error) {
    console.error("❌ Failed to decrypt cards:", error);
    return [];
  }
}
