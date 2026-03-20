import { IDDocument, ID_STORAGE_KEYS } from "@/types/id";
import { decryptData, decryptRaw, encryptData, encryptRaw } from "@/utils/encryption/cardEncryption";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

/**
 * ID Storage Utility
 */

const IDS_DIR = FileSystem.documentDirectory + ID_STORAGE_KEYS.IMAGES_DIR;

/**
 * Ensure the IDs directory exists
 */
async function ensureDir() {
  const dirInfo = await FileSystem.getInfoAsync(IDS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IDS_DIR, { intermediates: true });
  }
}

/**
 * Fetch all IDs from storage
 */
export async function getIDs(): Promise<IDDocument[]> {
  try {
    const raw = await AsyncStorage.getItem(ID_STORAGE_KEYS.METADATA);
    if (!raw) return [];

    const encrypted = JSON.parse(raw);
    const decrypted = await decryptData(encrypted);
    
    if (decrypted && Array.isArray(decrypted)) {
      console.log(`✅ Fetched ${decrypted.length} IDs from storage`);
      return decrypted as IDDocument[];
    }
    
    console.log("ℹ️ No IDs found or decryption empty");
    return [];
  } catch (error) {
    console.error("❌ Failed to get IDs:", error);
    return [];
  }
}

/**
 * Save all IDs to storage
 */
async function saveIDs(ids: IDDocument[]): Promise<void> {
  try {
    const encrypted = await encryptData(ids);
    await AsyncStorage.setItem(ID_STORAGE_KEYS.METADATA, JSON.stringify(encrypted));
    console.log(`💾 Saved ${ids.length} ID metadata documents`);
  } catch (error) {
    console.error("❌ Failed to save IDs:", error);
    throw error;
  }
}

/**
 * Save an ID image file (encrypted)
 */
export async function saveEncryptedImage(sourceUri: string, id: string, name: string): Promise<string> {
  await ensureDir();
  
  // Read file as Base64 then convert to Uint8Array for encryption
  const base64 = await FileSystem.readAsStringAsync(sourceUri, { encoding: FileSystem.EncodingType.Base64 });
  const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  
  const encrypted = await encryptRaw(binary);
  const destPath = IDS_DIR + `${id}_${name}.enc`;
  
  await FileSystem.writeAsStringAsync(destPath, JSON.stringify(encrypted));
  console.log(`🔒 Encrypted and saved image: ${destPath}`);
  return destPath;
}

/**
 * Save an ID thumbnail (unencrypted for speed)
 */
export async function saveThumbnail(sourceUri: string, id: string): Promise<string> {
  await ensureDir();
  const destPath = IDS_DIR + `thumb_${id}.jpg`;
  try {
    const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
    if (!sourceInfo.exists) {
      console.error(`❌ saveThumbnail: Source file does not exist: ${sourceUri}`);
      throw new Error(`Source file for thumbnail not found: ${sourceUri}`);
    }
    await FileSystem.copyAsync({ from: sourceUri, to: destPath });
    console.log(`🖼️ Saved thumbnail: ${destPath}`);
    return destPath;
  } catch (error) {
    console.error(`❌ saveThumbnail failed for ${id}:`, error);
    throw error;
  }
}

/**
 * Decrypt an ID image file to a temporary location for viewing
 */
export async function decryptImageToTemp(encryptedPath: string): Promise<string | null> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(encryptedPath);
    if (!fileInfo.exists) {
      if (encryptedPath.includes('cache/')) {
        console.error("❌ Legacy ID detected: File was stored in temporary cache and is no longer available. Please delete and re-add this ID.");
      } else {
        console.error(`❌ Encrypted file not found at path: ${encryptedPath}`);
      }
      return null;
    }

    const raw = await FileSystem.readAsStringAsync(encryptedPath);
    const encrypted = JSON.parse(raw);
    
    const decrypted = await decryptRaw(encrypted);
    
    // Convert back to base64 for temp storage
    let binary = '';
    const bytes = new Uint8Array(decrypted);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    const tempPath = FileSystem.cacheDirectory + `temp_${Date.now()}.jpg`;
    await FileSystem.writeAsStringAsync(tempPath, base64, { encoding: FileSystem.EncodingType.Base64 });
    
    return tempPath;
  } catch (error) {
    console.error("❌ Decryption failed:", error);
    return null;
  }
}

/**
 * Add a new ID document
 */
export async function addID(idDoc: IDDocument): Promise<void> {
  console.log(`➕ Adding new ID: ${idDoc.type} - ${idDoc.label}`);
  const ids = await getIDs();
  await saveIDs([...ids, idDoc]);
}

/**
 * Update an existing ID document
 */
export async function updateID(id: string, updates: Partial<IDDocument>): Promise<void> {
  const ids = await getIDs();
  const index = ids.findIndex(i => i.id === id);
  if (index !== -1) {
    ids[index] = { ...ids[index], ...updates };
    await saveIDs(ids);
  }
}

/**
 * Delete an ID document and its associated files
 */
export async function deleteID(id: string): Promise<void> {
  console.log(`🗑️ Deleting ID: ${id}`);
  const ids = await getIDs();
  const doc = ids.find(i => i.id === id);
  
  if (doc) {
    // Delete files
    for (const asset of doc.assets) {
      try {
        await FileSystem.deleteAsync(asset.uri, { idempotent: true });
        await FileSystem.deleteAsync(asset.thumbnailUri, { idempotent: true });
        console.log(`  - Deleted encrypted file: ${asset.uri}`);
        console.log(`  - Deleted thumbnail file: ${asset.thumbnailUri}`);
      } catch (e) {
        console.warn(`  - Failed to delete asset files: ${asset.uri}`, e);
      }
    }
    
    // Update metadata
    const filtered = ids.filter(i => i.id !== id);
    await saveIDs(filtered);
    console.log(`✅ ID ${id} deleted successfully`);
  }
}

/**
 * Clear all ID documents and their associated files
 */
export async function clearAllIDs(): Promise<void> {
  console.log("🧹 Clearing all ID documents...");
  try {
    const ids = await getIDs();
    
    // Delete all files
    for (const doc of ids) {
      for (const asset of doc.assets) {
        try {
          await FileSystem.deleteAsync(asset.uri, { idempotent: true });
          await FileSystem.deleteAsync(asset.thumbnailUri, { idempotent: true });
        } catch (e) {
          console.warn(`  - Failed to delete asset during clearAll: ${asset.uri}`, e);
        }
      }
    }

    // Explicitly delete the directory to be sure
    await FileSystem.deleteAsync(IDS_DIR, { idempotent: true });
    
    // Clear metadata
    await AsyncStorage.removeItem(ID_STORAGE_KEYS.METADATA);
    
    // Recreate directory for future use
    await ensureDir();
    
    console.log("✅ All ID documents and files cleared");
  } catch (error) {
    console.error("❌ Failed to clear all IDs:", error);
    throw error;
  }
}
