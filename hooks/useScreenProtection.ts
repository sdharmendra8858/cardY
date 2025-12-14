import { useFocusEffect } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useCallback } from 'react';

/**
 * Hook to prevent screen capture on a specific screen.
 * It automatically enables protection when the screen is focused
 * and disables it when the screen is blurred or unmounted.
 */
export function useScreenProtection() {
  useFocusEffect(
    useCallback(() => {
      const enableProtection = async () => {
        try {
          await ScreenCapture.preventScreenCaptureAsync();
        } catch (error) {
          console.warn('Failed to enable screen protection:', error);
        }
      };

      const disableProtection = async () => {
        try {
          await ScreenCapture.allowScreenCaptureAsync();
        } catch (error) {
          console.warn('Failed to disable screen protection:', error);
        }
      };

      enableProtection();

      return () => {
        disableProtection();
      };
    }, [])
  );
}
