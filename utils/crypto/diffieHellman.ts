/**
 * Diffie-Hellman Key Exchange
 * Implements X25519 ECDH per spec 8.2 and 10.2
 */

import { x25519 } from "@noble/curves/ed25519.js";

/**
 * Compute shared secret using X25519 ECDH
 * Spec 8.2: sharedSecret = DH(B_private, A_public)
 * Spec 10.2: sharedSecret = DH(A_private, B_public)
 * 
 * @param privateKey Private key (Uint8Array)
 * @param publicKey Public key (Uint8Array)
 * @returns Shared secret (Uint8Array)
 * @throws Error if computation fails
 */
export async function computeSharedSecret(
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Promise<Uint8Array> {
  try {
    const sharedSecret = x25519.getSharedSecret(privateKey, publicKey);
    return sharedSecret;
  } catch (error) {
    throw new Error(`Shared secret computation failed: ${error}`);
  }
}
