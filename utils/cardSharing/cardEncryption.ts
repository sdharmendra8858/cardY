/**
 * Card Encryption/Decryption Workflow
 * Implements sender-side encryption (spec 8) and receiver-side decryption (spec 10)
 */

import {
    base64ToBytes,
    bytesToBase64,
    computeSharedSecret,
    decryptCardData,
    deriveEncryptionKey,
    encryptCardData,
    generateEphemeralKeyPair,
} from "../crypto";
import { CardPayload, QRCodePayload, SessionPayload } from "../session";

/**
 * Encrypt card for sharing (Sender side)
 * Spec 8: Card encryption on Device B
 * 
 * @param cardData Card data to encrypt
 * @param sessionPayload Session payload from receiver
 * @returns QRCodePayload ready to share
 * @throws Error if encryption fails
 */
export async function encryptCardForSharing(
  cardData: CardPayload,
  sessionPayload: SessionPayload
): Promise<QRCodePayload> {
  try {
    // Validate card data has all required fields (spec 11)
    if (
      !cardData.cardId ||
      !cardData.cardholderName ||
      !cardData.cardNumber ||
      !cardData.expiryMonth ||
      !cardData.expiryYear ||
      !cardData.brand ||
      cardData.sharedAt === undefined
    ) {
      const missing = [];
      if (!cardData.cardId) missing.push("cardId");
      if (!cardData.cardholderName) missing.push("cardholderName");
      if (!cardData.cardNumber) missing.push("cardNumber");
      if (!cardData.expiryMonth) missing.push("expiryMonth");
      if (!cardData.expiryYear) missing.push("expiryYear");
      if (!cardData.brand) missing.push("brand");
      if (cardData.sharedAt === undefined) missing.push("sharedAt");
      throw new Error(`Card data validation failed. Missing: ${missing.join(", ")}`);
    }

    // Validate session payload
    if (!sessionPayload.sessionId || !sessionPayload.receiverPublicKey) {
      throw new Error("Session payload is incomplete");
    }

    // 8.1: Generate sender ephemeral key pair
    const senderKeyPair = await generateEphemeralKeyPair();

    // 8.2: Compute shared secret using receiver's public key
    const receiverPublicKey = base64ToBytes(sessionPayload.receiverPublicKey);
    const sharedSecret = await computeSharedSecret(
      senderKeyPair.privateKey,
      receiverPublicKey
    );

    // 8.3: Derive encryption key
    const encryptionKey = await deriveEncryptionKey(
      sharedSecret,
      sessionPayload.sessionId
    );

    // 8.4: Encrypt card payload
    const cardJSON = JSON.stringify(cardData);
    const encryptionResult = await encryptCardData(cardJSON, encryptionKey);

    // 9.1: Create QR payload (encrypted only, no plaintext metadata)
    const qrPayload: QRCodePayload = {
      version: 1,
      sessionId: sessionPayload.sessionId,
      senderPublicKey: bytesToBase64(senderKeyPair.publicKey),
      iv: encryptionResult.iv,
      ciphertext: encryptionResult.ciphertext,
      expiresAt: sessionPayload.expiresAt,
    };

    return qrPayload;
  } catch (error) {
    throw new Error(`Card encryption failed: ${error}`);
  }
}

/**
 * Decrypt card from QR (Receiver side)
 * Spec 10: Card decryption on Device A
 * 
 * @param qrPayload QR code payload from sender
 * @param receiverPrivateKeyBase64 Receiver's private key (base64)
 * @returns Decrypted card data
 * @throws Error if decryption fails
 */
export async function decryptCardFromQR(
  qrPayload: QRCodePayload,
  receiverPrivateKeyBase64: string
): Promise<CardPayload> {
  try {
    // 10.1: Validate session not expired
    if (Math.floor(Date.now() / 1000) > qrPayload.expiresAt) {
      throw new Error("QR code has expired");
    }

    // 10.2: Recompute shared secret using sender's public key
    const receiverPrivateKey = base64ToBytes(receiverPrivateKeyBase64);
    const senderPublicKey = base64ToBytes(qrPayload.senderPublicKey);
    const sharedSecret = await computeSharedSecret(
      receiverPrivateKey,
      senderPublicKey
    );

    // 10.3: Derive same encryption key
    const encryptionKey = await deriveEncryptionKey(
      sharedSecret,
      qrPayload.sessionId
    );

    // 10.4: Decrypt card
    const decryptedJSON = await decryptCardData(
      {
        iv: qrPayload.iv,
        ciphertext: qrPayload.ciphertext,
      },
      encryptionKey
    );

    const cardData = JSON.parse(decryptedJSON) as CardPayload;

    // 10.5: Validate card data structure
    if (
      !cardData.cardId ||
      !cardData.cardholderName ||
      !cardData.cardNumber ||
      !cardData.expiryMonth ||
      !cardData.expiryYear ||
      !cardData.brand
    ) {
      throw new Error("Invalid card data structure");
    }

    return cardData;
  } catch (error) {
    throw new Error(`Card decryption failed: ${error}`);
  }
}

/**
 * Validate QR code payload structure
 * Spec 9.1: QR content validation
 * 
 * @param qrPayload QR payload to validate
 * @returns true if valid
 */
export function validateQRPayload(qrPayload: any): boolean {
  return (
    qrPayload.version === 1 &&
    typeof qrPayload.sessionId === "string" &&
    typeof qrPayload.senderPublicKey === "string" &&
    typeof qrPayload.iv === "string" &&
    typeof qrPayload.ciphertext === "string" &&
    typeof qrPayload.expiresAt === "number"
  );
}

/**
 * Validate session payload structure
 * Spec 6.1: Session payload validation
 * 
 * @param payload Session payload to validate
 * @returns true if valid
 */
export function validateSessionPayload(payload: any): boolean {
  return (
    payload.version === 1 &&
    typeof payload.sessionId === "string" &&
    typeof payload.receiverPublicKey === "string" &&
    typeof payload.expiresAt === "number"
  );
}
