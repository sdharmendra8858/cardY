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
 */
export interface CardPayload {
  cardId: string;
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string; // MM
  expiryYear: string; // YY
  brand: "VISA" | "MC" | "AMEX" | "OTHER";
  sharedAt: number; // Unix timestamp
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
  sessionCode: string; // 6-digit code
  receiverPublicKey: string; // base64
  receiverPrivateKey: string; // base64 (encrypted in SecureStore)
  expiresAt: number;
  used: boolean; // Track if session has been used
  createdAt: number;
}
