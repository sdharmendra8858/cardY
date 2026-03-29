import { IDDocument, ID_STORAGE_KEYS } from "@/types/id";
import { decryptData, decryptRaw, encryptData, encryptRaw } from "@/utils/encryption/cardEncryption";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

/**
 * ID Storage Utility
 * 
 * IMPORTANT: This utility uses relative-to-absolute path normalization.
 * iOS app container UUIDs change during updates, which invalidates stored absolute paths.
 * We store filenames/relative paths and reconstruct them at runtime.
 */

const IDS_DIR = FileSystem.documentDirectory + ID_STORAGE_KEYS.IMAGES_DIR;

/**
 * Normalizes a stored URI to a valid absolute path for the current session.
 * Handles both legacy absolute paths and new filename-only paths.
 */
function normalizePath(path: string): string {
  if (!path) return path;
  
  // Extract filename from any path format (relative or absolute)
  const filename = path.split('/').pop() || "";
  if (!filename) return "";
  
  // Ensure we don't accidentally double-slash if IDS_DIR already ends with one
  const cleanDir = IDS_DIR.endsWith('/') ? IDS_DIR : IDS_DIR + '/';
  
  // Return current absolute path
  return cleanDir + filename;
}

/**
 * Ensure the IDs directory exists
 */
export async function ensureDir() {
  const dirInfo = await FileSystem.getInfoAsync(IDS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IDS_DIR, { intermediates: true });
  }
}

/**
 * Fetch all IDs from storage and normalize their asset paths
 */
export async function getIDs(): Promise<IDDocument[]> {
  try {
    await ensureDir();
    const raw = await AsyncStorage.getItem(ID_STORAGE_KEYS.METADATA);
    if (!raw) return [];

    const encrypted = JSON.parse(raw);
    const decrypted = await decryptData(encrypted);
    
    if (decrypted && Array.isArray(decrypted)) {
      const ids = decrypted as IDDocument[];
      
      // Normalize paths for every asset in every ID
      const normalizedIds = ids.map(id => ({
        ...id,
        assets: id.assets.map(asset => ({
          ...asset,
          uri: normalizePath(asset.uri),
          thumbnailUri: normalizePath(asset.thumbnailUri)
        }))
      }));

      return normalizedIds;
    }
    
    return [];
  } catch (error) {
    if (__DEV__) console.warn("⚠️ Failed to get IDs (likely key mismatch or corruption):", error);
    
    // Self-healing: If metadata exists but cannot be decrypted, it's likely from a 
    // previous install or a session with a different Master Key/DEK.
    // Clearing it allows the app to function with new IDs instead of permanently erroring.
    try {
      // Treat "ghash tag" (GCM auth failure) or session key mismatches as permanent failures
      // that require clearing the metadata to restore app functionality.
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("ghash tag") || errorMessage.includes("key mismatch")) {
        console.warn("⚠️ ID metadata is undecryptable or corrupted. Clearing to restore functionality.");
        await AsyncStorage.removeItem(ID_STORAGE_KEYS.METADATA);
      }
    } catch (e) {
      // Ignore cleanup error
    }
    
    return [];
  }
}

/**
 * Save all IDs to storage (stores normalized/relative paths)
 */
async function saveIDs(ids: IDDocument[]): Promise<void> {
  try {
    // Before saving, ensure we are only storing filenames to keep metadata clean
    const storageIds = ids.map(id => ({
      ...id,
      assets: id.assets.map(asset => {
        const uriParts = asset.uri.split('/');
        const thumbParts = asset.thumbnailUri.split('/');
        return {
          ...asset,
          uri: uriParts[uriParts.length - 1],
          thumbnailUri: thumbParts[thumbParts.length - 1]
        };
      })
    }));

    const encrypted = await encryptData(storageIds);
    await AsyncStorage.setItem(ID_STORAGE_KEYS.METADATA, JSON.stringify(encrypted));
  } catch (error) {
    console.error("❌ Failed to save IDs:", error);
    throw error;
  }
}

/**
 * Save an ID image file (encrypted) - returns the filename
 */
export async function saveEncryptedImage(sourceUri: string, id: string, name: string): Promise<string> {
  await ensureDir();
  
  const base64 = await FileSystem.readAsStringAsync(sourceUri, { encoding: FileSystem.EncodingType.Base64 });
  const binary = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  
  const encrypted = await encryptRaw(binary);
  const filename = `${id}_${name}.enc`;
  const destPath = IDS_DIR + filename;
  
  await FileSystem.writeAsStringAsync(destPath, JSON.stringify(encrypted));
  return filename; // Return filename for metadata storage
}

/**
 * Save an ID thumbnail (unencrypted) - returns the filename
 */
export async function saveThumbnail(sourceUri: string, id: string): Promise<string> {
  await ensureDir();
  const filename = `thumb_${id}.jpg`;
  const destPath = IDS_DIR + filename;
  
  try {
    const sourceInfo = await FileSystem.getInfoAsync(sourceUri);
    if (!sourceInfo.exists) {
      throw new Error(`Source file for thumbnail not found: ${sourceUri}`);
    }
    await FileSystem.copyAsync({ from: sourceUri, to: destPath });
    return filename; // Return filename for metadata storage
  } catch (error) {
    console.error(`❌ saveThumbnail failed for ${id}:`, error);
    throw error;
  }
}

/**
 * Decrypt an ID image file to a temporary location for viewing.
 * CLEANS UP older temp files for this ID to prevent cache bloating.
 */
export async function decryptImageToTemp(encryptedPath: string): Promise<string | null> {
  try {
    const absolutePath = normalizePath(encryptedPath);
    const fileInfo = await FileSystem.getInfoAsync(absolutePath);
    if (!fileInfo.exists) return null;

    // NOTE: Blind cleanup of temp files removed to prevent race conditions during multi-asset loads.
    // Cleanup of old temp files is now handled on a per-session or app-start basis where safe.

    const raw = await FileSystem.readAsStringAsync(absolutePath);
    const encrypted = JSON.parse(raw);
    const decrypted = await decryptRaw(encrypted);
    
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
  const ids = await getIDs();
  const doc = ids.find(i => i.id === id);
  
  if (doc) {
    for (const asset of doc.assets) {
      try {
        const uri = normalizePath(asset.uri);
        const thumbUri = normalizePath(asset.thumbnailUri);
        await FileSystem.deleteAsync(uri, { idempotent: true });
        await FileSystem.deleteAsync(thumbUri, { idempotent: true });
      } catch (e) {
        console.warn(`❌ Failed to delete asset files:`, e);
      }
    }
    
    const filtered = ids.filter(i => i.id !== id);
    await saveIDs(filtered);
  }
}

/**
 * Cleanup Utility: Removes any files in the IDS_DIR that are not linked to any document.
 * This prevents "lingering" or "orphaned" files from consuming storage.
 */
export async function cleanupOrphanedAssets(): Promise<void> {
  try {
    
    // Check if metadata exists but we got 0 IDs - this is the only case where we might have orphans
    const raw = await AsyncStorage.getItem(ID_STORAGE_KEYS.METADATA);
    if (raw) {
       // If metadata exists, but we couldn't parse it or it's empty, 
       // let's be EXTRA cautious and skip cleanup this time.
       try {
         const parsed = JSON.parse(raw);
         const { decryptCards } = await import("@/utils/encryption/cardEncryption");
         await decryptCards(parsed); 
       } catch (e) {
         console.warn("⚠️ Skipping orphaned asset cleanup due to metadata decryption failure to prevent data loss.");
         return;
       }
    }

    const ids = await getIDs();

    // CRITICAL SAFETY CHECK: If we have metadata in storage but getIDs returned nothing,
    // something went wrong with decryption or parsing. ABORT CLEANUP to prevent mass deletion.
    const rawMetadata = await AsyncStorage.getItem(ID_STORAGE_KEYS.METADATA);
    if (rawMetadata && ids.length === 0) {
      console.warn("⚠️ Cleanup aborted: Metadata exists but could not be parsed into IDs. Protecting files from accidental deletion.");
      return;
    }

    // Collect all valid filenames from metadata
    const validFilenames = new Set<string>();
    for (const doc of ids) {
      for (const asset of doc.assets) {
        const uriName = asset.uri.split('/').pop();
        const thumbName = asset.thumbnailUri.split('/').pop();
        if (uriName) validFilenames.add(uriName);
        if (thumbName) validFilenames.add(thumbName);
      }
    }

    // List all files in the IDs directory
    const actualFiles = await FileSystem.readDirectoryAsync(IDS_DIR);
    let deletedCount = 0;

    for (const filename of actualFiles) {
      if (!validFilenames.has(filename)) {
        await FileSystem.deleteAsync(IDS_DIR + filename, { idempotent: true });
        deletedCount++;
      }
    }

  } catch (error) {
    console.warn("⚠️ Cleanup failed:", error);
  }
}

/**
 * Clear all ID documents and their associated files
 */
export async function clearAllIDs(): Promise<void> {
  try {
    const ids = await getIDs();
    for (const doc of ids) {
      for (const asset of doc.assets) {
        try {
          await FileSystem.deleteAsync(normalizePath(asset.uri), { idempotent: true });
          await FileSystem.deleteAsync(normalizePath(asset.thumbnailUri), { idempotent: true });
        } catch (e) {}
      }
    }

    await FileSystem.deleteAsync(IDS_DIR, { idempotent: true });
    await AsyncStorage.removeItem(ID_STORAGE_KEYS.METADATA);
    await ensureDir();
  } catch (error) {
    console.error("❌ Failed to clear all IDs:", error);
    throw error;
  }
}
