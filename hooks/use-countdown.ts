import { useCallback, useEffect, useState } from "react";
import { isSessionValid } from "../utils/session";
import { formatTimeMMSS } from "../utils/time";

interface UseCountdownResult {
  timeLeft: number;
  isExpired: boolean;
  formatTime: (seconds: number) => string;
}

/**
 * Hook to manage a countdown timer based on an expiration timestamp
 * 
 * @param expiresAt Unix timestamp in seconds
 * @returns { timeLeft, isExpired, formatTime }
 */
export function useCountdown(expiresAt: number | null): UseCountdownResult {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  const calculateTimeLeft = useCallback(() => {
    if (!expiresAt) return 0;
    const now = Math.floor(Date.now() / 1000);
    const remaining = Math.max(0, expiresAt - now);
    return remaining;
  }, [expiresAt]);

  useEffect(() => {
    if (!expiresAt) {
      setTimeLeft(0);
      setIsExpired(false);
      return;
    }

    // Initial calculation
    const initialRemaining = calculateTimeLeft();
    setTimeLeft(initialRemaining);
    setIsExpired(!isSessionValid(expiresAt));

    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setIsExpired(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, calculateTimeLeft]);

  const formatTime = useCallback((seconds: number): string => {
    return formatTimeMMSS(seconds);
  }, []);

  return { timeLeft, isExpired, formatTime };
}
