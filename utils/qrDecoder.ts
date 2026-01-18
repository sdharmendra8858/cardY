/**
 * Simple QR Code Decoder
 * Uses rn-qr-generator to decode QR codes from image files
 */

import RNQRGenerator from 'rn-qr-generator';

export interface QRDecodeResult {
  success: boolean;
  data?: string;
  error?: string;
}

/**
 * Decode QR code from an image file
 * @param imageUri - URI to the image file containing QR code
 * @returns Promise with QR code data or error
 */
export const decodeQRFromImage = async (imageUri: string): Promise<QRDecodeResult> => {
  try {
    console.log('📖 Decoding QR code from image:', imageUri);
    
    const result = await RNQRGenerator.detect({
      uri: imageUri,
    });

    console.log('✅ QR detection response:', result);

    if (result && result.values && result.values.length > 0) {
      const qrData = result.values[0];
      console.log('✅ QR code decoded successfully!');
      console.log('📝 QR data:', qrData);
      
      return { success: true, data: qrData };
    }

    return { success: false, error: 'No QR code found in image' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to decode QR code';
    console.error('❌ QR decode error:', message);
    return { success: false, error: message };
  }
};
