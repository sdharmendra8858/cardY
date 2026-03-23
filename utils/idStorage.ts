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
  
  // Extract filename from any path format
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  
  // Return current absolute path
  return IDS_DIR + filename;
}

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
 * Fetch all IDs from storage and normalize their asset paths
 */
export async function getIDs(): Promise<IDDocument[]> {
  try {
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

      console.log(`✅ Fetched and normalized ${normalizedIds.length} IDs`);
      return normalizedIds;
    }
    
    return [];
  } catch (error) {
    console.error("❌ Failed to get IDs:", error);
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
    console.log(`💾 Saved ${storageIds.length} ID metadata documents`);
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
  console.log(`🔒 Encrypted and saved image: ${filename}`);
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
    console.log(`🖼️ Saved thumbnail: ${filename}`);
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

    // Proactive Cleanup: Delete any existing temp files in cache before creating a new one
    // This prevents "piling up" of decrypted images during a session
    try {
      const cacheFiles = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory!);
      const tempFiles = cacheFiles.filter(f => f.startsWith('temp_') && f.endsWith('.jpg'));
      for (const f of tempFiles) {
        await FileSystem.deleteAsync(FileSystem.cacheDirectory + f, { idempotent: true });
      }
    } catch (e) {
      // Non-critical cleanup failure
    }

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
    console.log("🧹 Starting orphaned asset cleanup...");
    const ids = await getIDs();
    
    // Collect all valid filenames from metadata
    const validFilenames = new Set<string>();
    for (const doc of ids) {
      for (const asset of doc.assets) {
        validFilenames.add(asset.uri.split('/').pop()!);
        validFilenames.add(asset.thumbnailUri.split('/').pop()!);
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

    console.log(`✅ Cleanup complete. Removed ${deletedCount} orphaned files.`);
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
    console.log("✅ All ID data cleared");
  } catch (error) {
    console.error("❌ Failed to clear all IDs:", error);
    throw error;
  }
}
