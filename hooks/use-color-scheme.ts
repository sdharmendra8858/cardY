import { ThemeContext } from "@/context/ThemeContext";
import { useContext } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

export function useColorScheme() {
  const system = useRNColorScheme();
  const { override } = useContext(ThemeContext);
  return override ?? system;
}
