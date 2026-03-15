import { useFocusEffect } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useCallback } from 'react';

/**
 * Hook to prevent screen capture on a specific screen.
 * @param isEnabled Optional flag to enable or disable protection (defaults to true)
 */
export function useScreenProtection(isEnabled: boolean = true) {
  useFocusEffect(
    useCallback(() => {
      if (!isEnabled) {
        return;
      }

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
    }, [isEnabled])
  );
}
