/**
 * Crypto Module - Central export point
 * Aggregates all cryptographic utilities
 * 
 * Note: Card encryption is now handled by utils/encryption/cardEncryption.ts
 * using react-native-aes-crypto for AES-256-CBC encryption (main storage)
 * 
 * This module provides encryption for card sharing between devices
 */

export {
    base64ToBytes, bytesToBase64, generateEphemeralKeyPair, type KeyPair
} from "./keyGeneration";

export { computeSharedSecret } from "./diffieHellman";

export { deriveEncryptionKey } from "./keyDerivation";

export {
    decryptCardData, encryptCardData, type EncryptionResult
} from "./encryption";

