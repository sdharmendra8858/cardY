/**
 * Key Generation Utilities
 * Implements X25519 ephemeral key pair generation per spec 5.1
 */

import { x25519 } from "@noble/curves/ed25519.js";
import "react-native-get-random-values";

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/**
 * Generate ephemeral X25519 key pair
 * Spec 5.1: Device generates ephemeral asymmetric key pair
 * 
 * @returns KeyPair with public and private keys
 * @throws Error if key generation fails
 */
export async function generateEphemeralKeyPair(): Promise<KeyPair> {
  try {
    const privateKey = x25519.utils.randomSecretKey();
    const publicKey = x25519.getPublicKey(privateKey);
    return { publicKey, privateKey };
  } catch (error) {
    throw new Error(`Key generation failed: ${error}`);
  }
}

/**
 * Convert Uint8Array to base64 string
 * @param bytes Uint8Array to encode
 * @returns Base64 encoded string
 */
export function bytesToBase64(bytes: Uint8Array): string {
  try {
    return btoa(String.fromCharCode(...bytes));
  } catch (error) {
    throw new Error(`Base64 encoding failed: ${error}`);
  }
}

/**
 * Convert base64 string to Uint8Array
 * @param base64 Base64 encoded string
 * @returns Uint8Array
 */
export function base64ToBytes(base64: string): Uint8Array {
  try {
    return new Uint8Array(
      atob(base64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );
  } catch (error) {
    throw new Error(`Base64 decoding failed: ${error}`);
  }
}
