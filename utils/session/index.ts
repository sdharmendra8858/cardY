/**
 * Session Module - Central export point
 * Aggregates all session management utilities
 */

export {
    SESSION_DURATION, canUseSession, createSession,
    createSessionPayload,
    generateSessionId,
    isSessionValid
} from "./sessionGenerator";

export {
    clearAllSessions, deleteSession, getCurrentSession,
    markSessionAsUsed, retrieveSession, storeSession
} from "./sessionStorage";

export type {
    CardPayload, QRCodePayload, SessionPayload, SessionState
} from "./sessionTypes";

