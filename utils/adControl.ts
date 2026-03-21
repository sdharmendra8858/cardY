import AsyncStorage from "@react-native-async-storage/async-storage";

const IGNORE_AD_KEY = "ad_suppression_ignore_next";
const IGNORE_AD_TIME_KEY = "ad_suppression_last_request_time";
const GLOBAL_SUPPRESSION_KEY = "ad_suppression_global_active";

let shouldIgnore = false;
let lastIgnoreRequestTime = 0;
let lastConsumptionTime = 0;
let isGlobalSuppressionActive = false;

const EXPIRY_MS = 120000; // 2 minutes (plenty for photo picking or ads)
const FLICKER_BUFFER_MS = 3000; // 3 seconds to handle AppState flickering

/**
 * Request to ignore the next App Open Ad trigger.
 * The flag stays active for up to 2 minutes or until consumed.
 * Persisted to AsyncStorage to survive process death during camera/picker.
 */
export const ignoreNextAppOpenAd = () => {
  const now = Date.now();
  shouldIgnore = true;
  lastIgnoreRequestTime = now;
  
  // Persist to storage immediately
  AsyncStorage.setItem(IGNORE_AD_KEY, "true").catch(() => {});
  AsyncStorage.setItem(IGNORE_AD_TIME_KEY, now.toString()).catch(() => {});
};

/**
 * Enable or disable global ad suppression.
 * Use this for screens where ads should NEVER show (e.g. Add/Edit flows).
 * Persisted to survival process death.
 */
export const setGlobalAdSuppression = (active: boolean) => {
  isGlobalSuppressionActive = active;
  AsyncStorage.setItem(GLOBAL_SUPPRESSION_KEY, active ? "true" : "false").catch(() => {});
};

/**
 * Check if we should ignore the ad. Consumes the flag on the first call,
 * but maintains "ignore" status for FLICKER_BUFFER_MS to handle rapid AppState transitions.
 * Checks both memory and AsyncStorage to handle app restarts.
 */
export const checkAndResetIgnoreAd = async (): Promise<boolean> => {
  const now = Date.now();
  
  // 1. Check in-memory global flag first
  if (isGlobalSuppressionActive) {
    return true;
  }

  // 2. Check AsyncStorage for global flag (survives process death)
  try {
    const storedGlobal = await AsyncStorage.getItem(GLOBAL_SUPPRESSION_KEY);
    if (storedGlobal === "true") {
      isGlobalSuppressionActive = true; // Sync memory
      return true;
    }
  } catch (e) {}

  // 3. Handle rapid flickering transitions (active -> inactive -> active)
  if (now - lastConsumptionTime < FLICKER_BUFFER_MS) {
    return true;
  }

  // 4. Check memory one-shot flag
  if (shouldIgnore && now - lastIgnoreRequestTime < EXPIRY_MS) {
    shouldIgnore = false;
    lastConsumptionTime = now;
    await AsyncStorage.multiRemove([IGNORE_AD_KEY, IGNORE_AD_TIME_KEY]).catch(() => {});
    return true;
  }

  // 5. Fallback: Check AsyncStorage one-shot flag
  try {
    const [storedIgnore, storedTime] = await Promise.all([
      AsyncStorage.getItem(IGNORE_AD_KEY),
      AsyncStorage.getItem(IGNORE_AD_TIME_KEY)
    ]);

    if (storedIgnore === "true" && storedTime) {
      const timeMs = parseInt(storedTime, 10);
      if (now - timeMs < EXPIRY_MS) {
        shouldIgnore = false;
        lastConsumptionTime = now;
        await AsyncStorage.multiRemove([IGNORE_AD_KEY, IGNORE_AD_TIME_KEY]).catch(() => {});
        return true;
      } else {
        await AsyncStorage.multiRemove([IGNORE_AD_KEY, IGNORE_AD_TIME_KEY]).catch(() => {});
      }
    }
  } catch (e) {}
  
  return false;
};
