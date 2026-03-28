import { ADMOB_CONFIG } from '@/constants/admob';
import { ignoreNextAppOpenAd } from '@/utils/adControl';
import React, { useEffect } from 'react';
import { AdEventType, InterstitialAd as RNInterstitialAd, TestIds } from 'react-native-google-mobile-ads';

interface InterstitialAdProps {
  onAdClosed?: () => void;
  onAdFailedToLoad?: () => void;
  adUnitId?: string;
}

export class InterstitialAdManager {
  private static instance: InterstitialAdManager;
  private adRef: RNInterstitialAd | null = null;
  private isLoaded = false;
  private currentAdUnitId: string | null = null;

  static getInstance(): InterstitialAdManager {
    if (!InterstitialAdManager.instance) {
      InterstitialAdManager.instance = new InterstitialAdManager();
    }
    return InterstitialAdManager.instance;
  }

  private createAd(unitId?: string): RNInterstitialAd {
    // Use test ID for development, production ID for production
    const adUnitId = __DEV__
      ? TestIds.INTERSTITIAL
      : unitId || ADMOB_CONFIG.interstitialAdUnitId || '';

    const ad = RNInterstitialAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ['fashion', 'clothing', 'men', 'women', 'kids', 'baby', 'shoes', 'accessories'],
    });

    return ad;
  }

  private loadPromise: Promise<void> | null = null;

  async loadAd(adUnitId?: string): Promise<void> {
    const targetUnitId = adUnitId || ADMOB_CONFIG.interstitialAdUnitId || '';

    if (this.adRef && this.isLoaded && this.currentAdUnitId === targetUnitId) {
      if (__DEV__) console.log('✅ Interstitial ad already loaded for this unit');
      return; 
    }

    if (this.loadPromise && this.currentAdUnitId === targetUnitId) {
      if (__DEV__) console.log('⏳ Interstitial ad load already in progress for this unit...');
      return this.loadPromise;
    }

    if (__DEV__) console.log(`🏗️ Creating new interstitial ad instance for unit: ${targetUnitId}`);
    this.adRef = this.createAd(targetUnitId);
    this.isLoaded = false;
    this.currentAdUnitId = targetUnitId;
    if (__DEV__) console.log('📡 Starting interstitial ad load...');

    this.loadPromise = new Promise((resolve, reject) => {
      if (!this.adRef) {
        this.loadPromise = null;
        reject(new Error('Failed to create ad'));
        return;
      }

      const unsubscribeLoaded = this.adRef.addAdEventListener(AdEventType.LOADED, () => {
        if (__DEV__) console.log('✅ Interstitial ad LOADED successfully');
        this.isLoaded = true;
        this.loadPromise = null;
        unsubscribeLoaded();
        unsubscribeFailed();
        resolve();
      });

      const unsubscribeFailed = this.adRef.addAdEventListener(AdEventType.ERROR, (error) => {
        if (__DEV__) console.error('❌ Interstitial ad failed to load:', error);
        this.isLoaded = false;
        this.adRef = null;
        this.currentAdUnitId = null;
        this.loadPromise = null;
        unsubscribeLoaded();
        unsubscribeFailed();
        reject(error);
      });

      this.adRef.load();
    });

    return this.loadPromise;
  }

  async showAd(onClosed?: () => void, onFailed?: () => void): Promise<void> {
    if (!this.adRef || !this.isLoaded) {
      if (__DEV__) console.warn('⚠️ Cannot show interstitial: Not loaded or adRef is null');
      onFailed?.();
      return;
    }

    if (__DEV__) console.log('🎬 Showing interstitial ad...');

    return new Promise((resolve) => {
      if (!this.adRef) {
        onFailed?.();
        resolve();
        return;
      }

      const unsubscribeClosed = this.adRef.addAdEventListener(AdEventType.CLOSED, () => {
        if (__DEV__) console.log('🚪 Interstitial ad CLOSED');
        const lastUnitId = this.currentAdUnitId;
        this.adRef = null;
        this.isLoaded = false;
        this.currentAdUnitId = null;
        unsubscribeClosed();
        unsubscribeOpened();
        onClosed?.();
        resolve();
      });

      const unsubscribeOpened = this.adRef.addAdEventListener(AdEventType.OPENED, () => {
        if (__DEV__) console.log('📖 Interstitial ad OPENED');
        // Preload next ad for better UX using the same unit ID
        if (__DEV__) console.log('🔄 Preloading next interstitial ad...');
        this.loadAd(this.currentAdUnitId || undefined).catch(console.warn);
      });

      // Prevent App Open Ad from triggering when this interstitial is closed
      ignoreNextAppOpenAd();

      this.adRef.show();
    });
  }

  isAdLoaded(adUnitId?: string): boolean {
    if (!adUnitId) return this.isLoaded;
    return this.isLoaded && this.currentAdUnitId === adUnitId;
  }
}

export const showInterstitialAd = async (
  onClosed?: () => void, 
  onFailed?: () => void, 
  timeoutMs: number = 10000,
  adUnitId?: string
): Promise<void> => {
  const manager = InterstitialAdManager.getInstance();
  const targetUnitId = adUnitId || ADMOB_CONFIG.interstitialAdUnitId || '';

  if (__DEV__) {
    console.log(`🔍 showInterstitialAd called (timeout: ${timeoutMs}ms, unit: ${targetUnitId})`);
    console.log(`   Ad Loaded Status: ${manager.isAdLoaded(targetUnitId)}`);
  }

  try {
    // If ad is already loaded for THIS unit, show it
    if (manager.isAdLoaded(targetUnitId)) {
      if (__DEV__) console.log('🚀 Ad already loaded, showing now...');
      await manager.showAd(onClosed, onFailed);
      return;
    }

    // Otherwise, load and show with timeout
    if (__DEV__) console.log('⏳ Ad not loaded for this unit, attempting to load now...');
    const loadPromise = manager.loadAd(targetUnitId);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Ad load timeout')), timeoutMs)
    );

    await Promise.race([loadPromise, timeoutPromise]);
    if (__DEV__) console.log('✅ Ad loaded after race, showing now...');
    await manager.showAd(onClosed, onFailed);
  } catch (error) {
    if (__DEV__) console.warn('❌ Failed to show interstitial ad after attempt:', error);
    onFailed?.();
  }
};

// Hook for easier usage in components
export const useInterstitialAd = (adUnitId?: string) => {
  const showAd = React.useCallback(async (onClosed?: () => void, onFailed?: () => void) => {
    await showInterstitialAd(onClosed, onFailed, 10000, adUnitId);
  }, [adUnitId]);

  return { showAd };
};

// Component for preloading ads
export default function InterstitialAd({ onAdClosed, onAdFailedToLoad, adUnitId }: InterstitialAdProps) {
  useEffect(() => {
    // Preload ad on component mount
    const manager = InterstitialAdManager.getInstance();
    manager.loadAd(adUnitId).catch((error) => {
      if (__DEV__) console.warn('Failed to preload interstitial ad:', error);
      onAdFailedToLoad?.();
    });
  }, [onAdFailedToLoad, adUnitId]);

  // This component doesn't render anything visible
  return null;
}
