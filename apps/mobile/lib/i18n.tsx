import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Language } from "@althaqalayn/types";
import { arabic, getMessages, type Messages } from "@althaqalayn/i18n";
import { loadJSON, saveJSON, StorageKeys } from "@/lib/storage";

interface I18nValue {
  /** Active UI language. English-first with a Hausa toggle. */
  lang: Language;
  setLang: (lang: Language) => void;
  /** Message catalog for the active language. */
  t: Messages;
  /** Constant decorative Arabic strings (do not flip with `lang`). */
  arabic: typeof arabic;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Holds the active UI language and exposes the matching catalog. Wraps the app
 * so any screen can `useI18n()`. Persistence to local storage is a later step.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  // Restore the saved language on mount.
  useEffect(() => {
    void loadJSON<Language>(StorageKeys.language, "en").then(setLangState);
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    void saveJSON(StorageKeys.language, next);
  };

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t: getMessages(lang), arabic }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
