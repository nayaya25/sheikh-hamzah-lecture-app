"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface ThemeValue {
  dark: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);
const KEY = "althaqalayn-admin-theme";
const SYSTEM_DARK = "(prefers-color-scheme: dark)";

/**
 * Light/dark toggle. Applies `.dark` on <html> (drives the CSS vars) + persists.
 * On first load with no stored preference, follows the OS theme; a stored choice
 * always wins, and the OS is only tracked live while the user hasn't chosen.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    if (stored === "dark" || stored === "light") {
      setDark(stored === "dark");
      return; // a stored choice always overrides the system
    }
    // No stored preference → follow the OS, and keep following it live.
    const mq = window.matchMedia(SYSTEM_DARK);
    setDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(KEY)) return; // user has since chosen — stop following
      setDark(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggle = () =>
    setDark((d) => {
      const next = !d;
      localStorage.setItem(KEY, next ? "dark" : "light");
      return next;
    });

  return <ThemeContext.Provider value={{ dark, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
