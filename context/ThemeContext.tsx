import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Scheme = "light" | "dark";

type ThemeContextValue = {
  override: Scheme | null; // null => follow system
  setOverride: (scheme: Scheme | null) => void;
  toggle: () => void;
};

const STORAGE_KEY = "@cardy_wall_theme_override"; // "light" | "dark" | "system"

export const ThemeContext = createContext<ThemeContextValue>({
  override: null,
  setOverride: () => {},
  toggle: () => {},
});

export function ThemeOverrideProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [override, setOverride] = useState<Scheme | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === "light" || saved === "dark") setOverride(saved);
        // any other value => system (null)
      } catch {}
    })();
  }, []);

  const setOverridePersist = useCallback(async (scheme: Scheme | null) => {
    setOverride(scheme);
    try {
      if (scheme === null) await AsyncStorage.setItem(STORAGE_KEY, "system");
      else await AsyncStorage.setItem(STORAGE_KEY, scheme);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setOverride((prev) => {
      const next: Scheme = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ override, setOverride: setOverridePersist, toggle }),
    [override, setOverridePersist, toggle]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeController() {
  return useContext(ThemeContext);
}
