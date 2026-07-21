import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { resolveTheme, type ColorScheme, type ResolvedTheme } from "@althaqalayn/theme";
import { StorageKeys, loadJSON, saveJSON } from "@/lib/storage";

export type ThemeMode = "system" | "light" | "dark";

interface Ctx {
  theme: ResolvedTheme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // "light" | "dark" | null
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    void loadJSON<ThemeMode>(StorageKeys.themeMode, "system").then(setModeState);
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    void saveJSON(StorageKeys.themeMode, m);
  };

  const scheme: ColorScheme = mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
  const theme = useMemo(() => resolveTheme(scheme), [scheme]);

  return (
    <ThemeCtx.Provider value={{ theme, mode, setMode }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme(): ResolvedTheme {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx.theme;
}

export function useThemeMode() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeProvider");
  return { mode: ctx.mode, setMode: ctx.setMode };
}
