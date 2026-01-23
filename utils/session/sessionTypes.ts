/**
 * Session Type Definitions
 * Defines all session-related data structures per spec
 */

/**
 * Session Payload (Receiver → Sender)
 * Spec 6.1: Full session payload (machine-readable)
 */
export interface SessionPayload {
  version: 1;
  sessionId: string; // UUIDv4
  receiverPublicKey: string; // base64(A_public)
  expiresAt: number; // Unix timestamp
}

/**
 * QR Code Payload (Sender → Receiver)
 * Spec 9.1: QR content (encrypted only)
 */
export interface QRCodePayload {
  version: 1;
  sessionId: string; // UUIDv4
  senderPublicKey: string; // base64(B_public)
  iv: string; // base64
  ciphertext: string; // base64
  expiresAt: number; // Unix timestamp
}

/**
 * Card Payload (Encrypted)
 * Spec 11: Card payload schema
 * 
 * Note: Metadata fields (bank, cobrand, cardKind, dominantColor) are optional
 * and may not be available when importing from other sources.
 * 
 * The cardExpiresAt field allows the sharer to set when the imported card
 * should be automatically removed from the receiver's device.
 * 
 * Note: isPinned is NOT included in the payload as it's a device-specific
 * property. Imported cards always start with isPinned: false.
 */
export interface CardPayload {
  cardId: string;
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string; // MM (card expiry)
  expiryYear: string; // YY (card expiry)
  brand: "VISA" | "MC" | "AMEX" | "OTHER";
  sharedAt: number; // Unix timestamp
  cardExpiresAt?: number; // Unix timestamp - when this shared card should be removed from receiver's device
  // Optional metadata (not required by spec, but preserved if available)
  bank?: string;
  cobrandName?: string;
  cardKind?: "credit" | "debit";
  dominantColor?: string;
}

/**
 * Session State (stored in SecureStore)
 * Internal structure for managing session lifecycle
 */
export interface SessionState {
  sessionId: string;
  receiverPublicKey: string; // base64
  receiverPrivateKey: string; // base64 (encrypted in SecureStore)
  expiresAt: number;
  used: boolean; // Track if session has been used
  createdAt: number;
}
