import { ADMOB_CONFIG } from '@/constants/admob';
import React, { useEffect } from 'react';
import { AdEventType, InterstitialAd as RNInterstitialAd, TestIds } from 'react-native-google-mobile-ads';

interface InterstitialAdProps {
  onAdClosed?: () => void;
  onAdFailedToLoad?: () => void;
}

export class InterstitialAdManager {
  private static instance: InterstitialAdManager;
  private adRef: RNInterstitialAd | null = null;
  private isLoaded = false;

  static getInstance(): InterstitialAdManager {
    if (!InterstitialAdManager.instance) {
      InterstitialAdManager.instance = new InterstitialAdManager();
    }
    return InterstitialAdManager.instance;
  }

  private createAd(): RNInterstitialAd {
    // Use test ID for development, production ID for production
    const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : ADMOB_CONFIG.interstitialAdUnitId || '';

    const ad = RNInterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ['fashion', 'clothing', 'men', 'women', 'kids', 'baby', 'shoes', 'accessories'],
    });

    return ad;
  }

  async loadAd(): Promise<void> {
    if (this.adRef) {
      return; // Already loading or loaded
    }

    this.adRef = this.createAd();
    this.isLoaded = false;

    return new Promise((resolve, reject) => {
      if (!this.adRef) {
        reject(new Error('Failed to create ad'));
        return;
      }

      const unsubscribeLoaded = this.adRef.addAdEventListener(AdEventType.LOADED, () => {
        this.isLoaded = true;
        unsubscribeLoaded();
        unsubscribeFailed();
        resolve();
      });

      const unsubscribeFailed = this.adRef.addAdEventListener(AdEventType.ERROR, (error) => {
        console.warn('Interstitial ad failed to load:', error);
        this.isLoaded = false;
        this.adRef = null;
        unsubscribeLoaded();
        unsubscribeFailed();
        reject(error);
      });

      this.adRef.load();
    });
  }

  async showAd(onClosed?: () => void, onFailed?: () => void): Promise<void> {
    if (!this.adRef || !this.isLoaded) {
      console.warn('Interstitial ad not loaded');
      onFailed?.();
      return;
    }

    return new Promise((resolve) => {
      if (!this.adRef) {
        onFailed?.();
        resolve();
        return;
      }

      const unsubscribeClosed = this.adRef.addAdEventListener(AdEventType.CLOSED, () => {
        this.adRef = null;
        this.isLoaded = false;
        unsubscribeClosed();
        unsubscribeOpened();
        onClosed?.();
        resolve();
      });

      const unsubscribeOpened = this.adRef.addAdEventListener(AdEventType.OPENED, () => {
        // Preload next ad for better UX
        this.loadAd().catch(console.warn);
      });

      this.adRef.show();
    });
  }

  isAdLoaded(): boolean {
    return this.isLoaded;
  }
}

export const showInterstitialAd = async (onClosed?: () => void, onFailed?: () => void, timeoutMs: number = 3000): Promise<void> => {
  const manager = InterstitialAdManager.getInstance();

  try {
    // If ad is already loaded, show it
    if (manager.isAdLoaded()) {
      await manager.showAd(onClosed, onFailed);
      return;
    }

    // Otherwise, load and show with timeout
    const loadPromise = manager.loadAd();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Ad load timeout')), timeoutMs)
    );

    await Promise.race([loadPromise, timeoutPromise]);
    await manager.showAd(onClosed, onFailed);
  } catch (error) {
    console.warn('Failed to show interstitial ad:', error);
    onFailed?.();
  }
};

// Hook for easier usage in components
export const useInterstitialAd = () => {
  const showAd = React.useCallback(async (onClosed?: () => void, onFailed?: () => void) => {
    await showInterstitialAd(onClosed, onFailed);
  }, []);

  return { showAd };
};

// Component for preloading ads
export default function InterstitialAd({ onAdClosed, onAdFailedToLoad }: InterstitialAdProps) {
  useEffect(() => {
    // Preload ad on component mount
    const manager = InterstitialAdManager.getInstance();
    manager.loadAd().catch((error) => {
      console.warn('Failed to preload interstitial ad:', error);
      onAdFailedToLoad?.();
    });
  }, [onAdFailedToLoad]);

  // This component doesn't render anything visible
  return null;
}
