/**
 * CPA Platform — Mobile Theme Store
 */
import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeMode } from "../theme";

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  loadStoredTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "dark",
  isDark: true,

  setMode: async (mode) => {
    await AsyncStorage.setItem("cpa_theme_mode", mode);
    set({ mode, isDark: mode === "dark" });
  },

  loadStoredTheme: async () => {
    try {
      const stored = await AsyncStorage.getItem("cpa_theme_mode");
      if (stored === "light" || stored === "dark") {
        set({ mode: stored, isDark: stored === "dark" });
      }
    } catch {
      // fallback to dark
    }
  },
}));
