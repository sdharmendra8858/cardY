/**
 * Session Generation
 * Implements session creation per spec 5
 */

import { bytesToBase64, generateEphemeralKeyPair } from "../crypto";
import { SessionPayload, SessionState } from "./sessionTypes";

const SESSION_DURATION = 120; // 2 minutes

/**
 * Generate 6-digit session code
 * Spec 5.2: sessionCode = 6-digit random number (UX only)
 * 
 * @returns 6-digit code as string
 */
export function generateSessionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate session ID (UUIDv4)
 * Spec 5.2: sessionId = UUIDv4
 * 
 * @returns UUIDv4 string
 */
export function generateSessionId(): string {
  // Generate UUIDv4 using random values
  const chars = "0123456789abcdef";
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
    } else if (i === 14) {
      uuid += "4"; // Version 4
    } else if (i === 19) {
      uuid += chars[(Math.random() * 4 + 8) | 0]; // Variant bits
    } else {
      uuid += chars[(Math.random() * 16) | 0];
    }
  }
  return uuid;
}

/**
 * Create new session (Receiver side)
 * Spec 5: Session creation on Device A
 * 
 * @returns SessionState with all required fields
 * @throws Error if session creation fails
 */
export async function createSession(): Promise<SessionState> {
  try {
    // Generate session metadata
    const sessionId = generateSessionId();
    const sessionCode = generateSessionCode();
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION;

    // Generate ephemeral key pair
    const keyPair = await generateEphemeralKeyPair();
    const receiverPublicKey = bytesToBase64(keyPair.publicKey);
    const receiverPrivateKey = bytesToBase64(keyPair.privateKey);

    return {
      sessionId,
      sessionCode,
      receiverPublicKey,
      receiverPrivateKey,
      expiresAt,
      used: false,
      createdAt: Math.floor(Date.now() / 1000),
    };
  } catch (error) {
    throw new Error(`Session creation failed: ${error}`);
  }
}

/**
 * Create session payload for sharing
 * Spec 6.1: Full session payload (machine-readable)
 * 
 * @param session Session state
 * @returns SessionPayload ready to share
 */
export function createSessionPayload(session: SessionState): SessionPayload {
  return {
    version: 1,
    sessionId: session.sessionId,
    receiverPublicKey: session.receiverPublicKey,
    expiresAt: session.expiresAt,
  };
}

/**
 * Validate session is not expired
 * 
 * @param expiresAt Expiration timestamp
 * @returns true if session is still valid
 */
export function isSessionValid(expiresAt: number): boolean {
  return Math.floor(Date.now() / 1000) < expiresAt;
}

/**
 * Validate session has not been used
 * Spec 10.1: session not already used
 * 
 * @param session Session state
 * @returns true if session can be used
 */
export function canUseSession(session: SessionState): boolean {
  return !session.used && isSessionValid(session.expiresAt);
}
