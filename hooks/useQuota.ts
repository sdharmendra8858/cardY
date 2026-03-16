import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export type QuotaType = 'card' | 'id';

interface QuotaData {
  count: number;
  lastDate: string; // ISO date YYYY-MM-DD
}

export const useQuota = (type: QuotaType) => {
  const [quotaData, setQuotaData] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);

  const QUOTA_STORAGE_KEY = `@cardy_view_quota_${type}`;
  const MAX_FREE_VIEWS = 5;

  const getTodayString = () => new Date().toISOString().split("T")[0];

  const loadQuota = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(QUOTA_STORAGE_KEY);
      const today = getTodayString();
      
      if (saved) {
        const parsed: QuotaData = JSON.parse(saved);
        if (parsed.lastDate === today) {
          setQuotaData(parsed);
        } else {
          // Reset for new day
          const newData = { count: 0, lastDate: today };
          await AsyncStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(newData));
          setQuotaData(newData);
        }
      } else {
        const newData = { count: 0, lastDate: today };
        await AsyncStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(newData));
        setQuotaData(newData);
      }
    } catch (e) {
      console.error(`Error loading ${type} quota:`, e);
    } finally {
      setLoading(false);
    }
  }, [type, QUOTA_STORAGE_KEY]);

  useEffect(() => {
    loadQuota();
  }, [loadQuota]);

  const incrementViews = useCallback(async () => {
    setQuotaData(prev => {
      if (!prev) return prev;
      
      const today = getTodayString();
      const newData = {
        count: prev.count + 1,
        lastDate: today
      };
      
      // Fire and forget storage update
      AsyncStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(newData)).catch(e => {
        console.error(`Error saving ${type} quota:`, e);
      });
      
      return newData;
    });
  }, [QUOTA_STORAGE_KEY, type]);

  const isQuotaExceededValue = quotaData ? quotaData.count >= MAX_FREE_VIEWS : false;

  return {
    viewsCount: quotaData?.count ?? 0,
    isQuotaExceeded: isQuotaExceededValue,
    incrementViews,
    loading,
    maxFreeViews: MAX_FREE_VIEWS
  };
};
