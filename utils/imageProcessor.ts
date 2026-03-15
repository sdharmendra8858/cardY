import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Image Processor Utility
 * 
 * Handles resizing, compression, and thumbnail generation
 * for ID documents to control app storage size and improve UI performance.
 */

const MAX_WIDTH = 1200;
const THUMBNAIL_WIDTH = 200;
const QUALITY = 0.65;
const THUMBNAIL_QUALITY = 0.5;

export interface ProcessedImages {
  original: {
    uri: string;
    width: number;
    height: number;
    size?: number;
  };
  thumbnail: {
    uri: string;
    width: number;
    height: number;
  };
}

/**
 * Process a captured or selected image:
 * 1. Resize to max width (if larger)
 * 2. Compress for storage
 * 3. Generate a small thumbnail for grid views
 */
export async function processIDImage(uri: string): Promise<ProcessedImages> {
  // 1. Get original image dimensions
  const initialInfo = await ImageManipulator.manipulateAsync(uri, [], {});
  
  // 2. Generate original (resized if needed)
  const resizeAction = initialInfo.width > MAX_WIDTH 
    ? [{ resize: { width: MAX_WIDTH } }] 
    : [];

  const mainImage = await ImageManipulator.manipulateAsync(
    uri,
    resizeAction,
    { compress: QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  // 3. Generate thumbnail
  const thumbnail = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: THUMBNAIL_WIDTH } }],
    { compress: THUMBNAIL_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  return {
    original: {
      uri: mainImage.uri,
      width: mainImage.width,
      height: mainImage.height,
    },
    thumbnail: {
      uri: thumbnail.uri,
      width: thumbnail.width,
      height: thumbnail.height,
    }
  };
}
