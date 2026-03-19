import { ADMOB_CONFIG } from '@/constants/admob';
import React, { useEffect } from 'react';
import { AdEventType, RewardedAd as RNRewardedAd, TestIds, RewardedAdEventType } from 'react-native-google-mobile-ads';

interface RewardedAdProps {
  onAdClosed?: () => void;
  onAdFailedToLoad?: () => void;
  onRewardEarned?: () => void;
}

export class RewardedAdManager {
  private static instance: RewardedAdManager;
  private adRef: RNRewardedAd | null = null;
  private isLoaded = false;

  static getInstance(): RewardedAdManager {
    if (!RewardedAdManager.instance) {
      RewardedAdManager.instance = new RewardedAdManager();
    }
    return RewardedAdManager.instance;
  }

  private createAd(): RNRewardedAd {
    const adUnitId = __DEV__
      ? TestIds.REWARDED
      : ADMOB_CONFIG.rewardedAdUnitId || '';

    const ad = RNRewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
      keywords: ['finance', 'security', 'utility', 'wallet'],
    });

    return ad;
  }

  async loadAd(): Promise<void> {
    if (this.adRef && this.isLoaded) {
      return; 
    }

    if (!this.adRef) {
      this.adRef = this.createAd();
    }
    
    this.isLoaded = false;

    return new Promise((resolve, reject) => {
      if (!this.adRef) {
        reject(new Error('Failed to create ad'));
        return;
      }

      const unsubscribeLoaded = this.adRef.addAdEventListener(RewardedAdEventType.LOADED, () => {
        this.isLoaded = true;
        unsubscribeLoaded();
        unsubscribeFailed();
        resolve();
      });

      const unsubscribeFailed = this.adRef.addAdEventListener(AdEventType.ERROR, (error) => {
        console.warn('Rewarded ad failed to load:', error);
        this.isLoaded = false;
        this.adRef = null;
        unsubscribeLoaded();
        unsubscribeFailed();
        reject(error);
      });

      this.adRef.load();
    });
  }

  async showAd(onRewardEarned?: () => void, onClosed?: () => void, onFailed?: () => void): Promise<void> {
    if (!this.adRef || !this.isLoaded) {
      console.warn('Rewarded ad not loaded');
      onFailed?.();
      return;
    }

    return new Promise((resolve) => {
      if (!this.adRef) {
        onFailed?.();
        resolve();
        return;
      }

      let rewardEarned = false;

      const unsubscribeRewarded = this.adRef.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
        console.log('User earned reward:', reward);
        rewardEarned = true;
        onRewardEarned?.();
      });

      const unsubscribeClosed = this.adRef.addAdEventListener(AdEventType.CLOSED, () => {
        this.adRef = null;
        this.isLoaded = false;
        unsubscribeClosed();
        unsubscribeRewarded();
        onClosed?.();
        resolve();
        
        // Attempt to preload next ad
        this.loadAd().catch(console.warn);
      });

      this.adRef.show();
    });
  }

  isAdLoaded(): boolean {
    return this.isLoaded;
  }
}

export const showRewardedAd = async (
  onRewardEarned?: () => void, 
  onClosed?: () => void, 
  onFailed?: () => void, 
  timeoutMs: number = 5000
): Promise<void> => {
  const manager = RewardedAdManager.getInstance();

  try {
    if (manager.isAdLoaded()) {
      await manager.showAd(onRewardEarned, onClosed, onFailed);
      return;
    }

    const loadPromise = manager.loadAd();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Ad load timeout')), timeoutMs)
    );

    await Promise.race([loadPromise, timeoutPromise]);
    await manager.showAd(onRewardEarned, onClosed, onFailed);
  } catch (error) {
    console.warn('Failed to show rewarded ad:', error);
    onFailed?.();
  }
};

export const useRewardedAd = () => {
  const showAd = React.useCallback(async (
    onRewardEarned?: () => void, 
    onClosed?: () => void, 
    onFailed?: () => void
  ) => {
    await showRewardedAd(onRewardEarned, onClosed, onFailed);
  }, []);

  return { showAd };
};

export default function AdRewarded({ onRewardEarned, onAdClosed, onAdFailedToLoad }: RewardedAdProps) {
  useEffect(() => {
    const manager = RewardedAdManager.getInstance();
    manager.loadAd().catch((error) => {
      console.warn('Failed to preload rewarded ad:', error);
      onAdFailedToLoad?.();
    });
  }, [onAdFailedToLoad]);

  return null;
}
