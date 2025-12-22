/**
 * Memory Zeroing
 * Implements memory zeroing for sensitive data per spec 13 security controls
 * 
 * Spec 13: Memory zeroing after use
 */

/**
 * Zero out a Uint8Array to prevent sensitive data from remaining in memory
 * Spec 13: Memory zeroing after use
 * 
 * @param data Uint8Array to zero out
 */
export function zeroUint8Array(data: Uint8Array): void {
  for (let i = 0; i < data.length; i++) {
    data[i] = 0;
  }
}

/**
 * Zero out a string by replacing all characters
 * Note: Strings in JavaScript are immutable, so this is more of a best-effort approach
 * 
 * @param data String to zero out (note: original string is not modified)
 * @returns Zeroed string
 */
export function zeroString(data: string): string {
  return "0".repeat(data.length);
}

/**
 * Zero out an object's sensitive properties
 * 
 * @param obj Object containing sensitive data
 * @param properties Array of property names to zero out
 */
export function zeroObjectProperties(
  obj: any,
  properties: string[]
): void {
  for (const prop of properties) {
    if (obj[prop]) {
      if (obj[prop] instanceof Uint8Array) {
        zeroUint8Array(obj[prop]);
      } else if (typeof obj[prop] === "string") {
        obj[prop] = zeroString(obj[prop]);
      } else if (typeof obj[prop] === "number") {
        obj[prop] = 0;
      }
    }
  }
}

/**
 * Wrapper for sensitive operations that automatically zeros data after execution
 * 
 * @param operation Function that performs sensitive operation
 * @param dataToZero Array of data to zero after operation
 * @returns Result of operation
 */
export async function withMemoryZeroing<T>(
  operation: () => Promise<T>,
  dataToZero: (Uint8Array | string)[]
): Promise<T> {
  try {
    return await operation();
  } finally {
    // Zero out all sensitive data
    for (const data of dataToZero) {
      if (data instanceof Uint8Array) {
        zeroUint8Array(data);
      } else if (typeof data === "string") {
        zeroString(data);
      }
    }
  }
}

/**
 * Synchronous version of withMemoryZeroing
 * 
 * @param operation Function that performs sensitive operation
 * @param dataToZero Array of data to zero after operation
 * @returns Result of operation
 */
export function withMemoryZeroingSync<T>(
  operation: () => T,
  dataToZero: (Uint8Array | string)[]
): T {
  try {
    return operation();
  } finally {
    // Zero out all sensitive data
    for (const data of dataToZero) {
      if (data instanceof Uint8Array) {
        zeroUint8Array(data);
      } else if (typeof data === "string") {
        zeroString(data);
      }
    }
  }
}

/**
 * Create a secure container for sensitive data that auto-zeros on cleanup
 */
export class SecureDataContainer {
  private data: Uint8Array;
  private isZeroed: boolean = false;

  constructor(data: Uint8Array) {
    this.data = new Uint8Array(data); // Make a copy
  }

  /**
   * Get the data (read-only)
   */
  getData(): Uint8Array {
    if (this.isZeroed) {
      throw new Error("Data has been zeroed and is no longer accessible");
    }
    return new Uint8Array(this.data); // Return a copy
  }

  /**
   * Zero out the data
   */
  zero(): void {
    if (!this.isZeroed) {
      zeroUint8Array(this.data);
      this.isZeroed = true;
    }
  }

  /**
   * Check if data has been zeroed
   */
  isZeroedOut(): boolean {
    return this.isZeroed;
  }

  /**
   * Destructor - zero data when object is garbage collected
   */
  [Symbol.dispose](): void {
    this.zero();
  }
}

/**
 * Best practices for memory zeroing:
 * 
 * 1. Zero encryption keys immediately after use
 * 2. Zero shared secrets after key derivation
 * 3. Zero plaintext after encryption
 * 4. Zero decrypted data after use
 * 5. Use SecureDataContainer for long-lived sensitive data
 * 6. Use withMemoryZeroing wrapper for sensitive operations
 * 
 * Example:
 * ```typescript
 * const encryptionKey = await deriveEncryptionKey(sharedSecret, sessionId);
 * try {
 *   const encrypted = await encryptCardData(plaintext, encryptionKey);
 *   // Use encrypted data
 * } finally {
 *   zeroUint8Array(encryptionKey);
 *   zeroUint8Array(sharedSecret);
 * }
 * ```
 */
