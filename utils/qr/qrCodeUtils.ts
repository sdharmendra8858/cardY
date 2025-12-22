/**
 * QR Code Utilities
 * Handles QR code generation and parsing
 */

import { QRCodePayload, SessionPayload } from "../session";

/**
 * Convert session payload to QR code string
 * Spec 6: Session payload is shared via QR code
 * 
 * @param sessionPayload Session payload to encode
 * @returns JSON string for QR code
 */
export function sessionPayloadToQRString(
  sessionPayload: SessionPayload
): string {
  return JSON.stringify(sessionPayload);
}

/**
 * Parse QR code string to session payload
 * 
 * @param qrString QR code content
 * @returns Parsed session payload
 * @throws Error if parsing fails
 */
export function parseSessionQRString(qrString: string): SessionPayload {
  try {
    const payload = JSON.parse(qrString);
    return payload as SessionPayload;
  } catch (error) {
    throw new Error(`Failed to parse session QR: ${error}`);
  }
}

/**
 * Convert QR code payload to QR code string
 * Spec 9: QR code payload is shared as QR code
 * 
 * @param qrPayload QR code payload to encode
 * @returns JSON string for QR code
 */
export function qrPayloadToQRString(qrPayload: QRCodePayload): string {
  return JSON.stringify(qrPayload);
}

/**
 * Parse QR code string to QR payload
 * 
 * @param qrString QR code content
 * @returns Parsed QR payload
 * @throws Error if parsing fails
 */
export function parseCardQRString(qrString: string): QRCodePayload {
  try {
    const payload = JSON.parse(qrString);
    return payload as QRCodePayload;
  } catch (error) {
    throw new Error(`Failed to parse card QR: ${error}`);
  }
}
