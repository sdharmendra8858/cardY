/**
 * Session Storage
 * Manages secure storage of session data using SecureStore
 */

import * as SecureStore from "expo-secure-store";
import { SessionState } from "./sessionTypes";

const KEYCHAIN_SERVICE = "cardywall_sessions";

/**
 * Store session in SecureStore
 * 
 * @param session Session state to store
 * @throws Error if storage fails
 */
export async function storeSession(session: SessionState): Promise<void> {
  try {
    // Store session state
    await SecureStore.setItemAsync(
      `session_${session.sessionId}`,
      JSON.stringify(session),
      { keychainService: KEYCHAIN_SERVICE }
    );

    // Store current session ID for quick access
    await SecureStore.setItemAsync("current_session_id", session.sessionId, {
      keychainService: KEYCHAIN_SERVICE,
    });
  } catch (error) {
    throw new Error(`Failed to store session: ${error}`);
  }
}

/**
 * Retrieve session from SecureStore
 * 
 * @param sessionId Session ID to retrieve
 * @returns SessionState or null if not found
 */
export async function retrieveSession(
  sessionId: string
): Promise<SessionState | null> {
  try {
    const sessionStr = await SecureStore.getItemAsync(
      `session_${sessionId}`,
      { keychainService: KEYCHAIN_SERVICE }
    );

    if (!sessionStr) {
      return null;
    }

    return JSON.parse(sessionStr) as SessionState;
  } catch (error) {
    console.error(`Failed to retrieve session: ${error}`);
    return null;
  }
}

/**
 * Get current active session
 * 
 * @returns SessionState or null if no active session
 */
export async function getCurrentSession(): Promise<SessionState | null> {
  try {
    const sessionId = await SecureStore.getItemAsync("current_session_id", {
      keychainService: KEYCHAIN_SERVICE,
    });

    if (!sessionId) {
      return null;
    }

    return retrieveSession(sessionId);
  } catch (error) {
    console.error(`Failed to get current session: ${error}`);
    return null;
  }
}

/**
 * Mark session as used
 * Spec 10.1: session not already used
 * 
 * @param sessionId Session ID to mark as used
 */
export async function markSessionAsUsed(sessionId: string): Promise<void> {
  try {
    const session = await retrieveSession(sessionId);
    if (session) {
      session.used = true;
      await SecureStore.setItemAsync(
        `session_${sessionId}`,
        JSON.stringify(session),
        { keychainService: KEYCHAIN_SERVICE }
      );
    }
  } catch (error) {
    console.error(`Failed to mark session as used: ${error}`);
  }
}

/**
 * Delete session from SecureStore
 * Spec 10.5: Cleanup - Invalidate session
 * 
 * @param sessionId Session ID to delete
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(`session_${sessionId}`, {
      keychainService: KEYCHAIN_SERVICE,
    });

    // Clear current session ID if it matches
    const currentId = await SecureStore.getItemAsync("current_session_id", {
      keychainService: KEYCHAIN_SERVICE,
    });

    if (currentId === sessionId) {
      await SecureStore.deleteItemAsync("current_session_id", {
        keychainService: KEYCHAIN_SERVICE,
      });
    }
  } catch (error) {
    console.error(`Failed to delete session: ${error}`);
  }
}

/**
 * Clear all sessions
 * Used for cleanup
 * 
 * @throws Error if cleanup fails
 */
export async function clearAllSessions(): Promise<void> {
  try {
    // Note: SecureStore doesn't provide a way to list all keys,
    // so we can only clear the current session ID
    await SecureStore.deleteItemAsync("current_session_id", {
      keychainService: KEYCHAIN_SERVICE,
    });
  } catch (error) {
    console.error(`Failed to clear sessions: ${error}`);
  }
}
