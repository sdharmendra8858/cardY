/**
 * Session Module - Central export point
 * Aggregates all session management utilities
 */

export {
    canUseSession, createSession,
    createSessionPayload,
    generateSessionCode,
    generateSessionId,
    isSessionValid,
    SESSION_DURATION
} from "./sessionGenerator";

export {
    clearAllSessions, deleteSession, getCurrentSession,
    markSessionAsUsed, retrieveSession, storeSession
} from "./sessionStorage";

export type {
    CardPayload, QRCodePayload, SessionPayload, SessionState
} from "./sessionTypes";

