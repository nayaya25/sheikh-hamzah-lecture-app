// Bookmarks (a.k.a. "Saved lectures"). A single persisted `string[]` of
// lecture ids — deliberately simpler than the downloads engine (no reducer,
// no side effects beyond storage) since there's nothing to reconcile against
// the filesystem or network.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as Haptics from "expo-haptics";
import { loadJSON, saveJSON, StorageKeys } from "@/lib/storage";

/** Pure add/remove: drops `id` if present, appends it if absent. */
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}

interface BookmarksValue {
  ids: string[];
  isBookmarked: (id: string) => boolean;
  toggle: (id: string) => void;
}

const BookmarksContext = createContext<BookmarksValue | null>(null);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);
  const hydrated = useRef(false);

  // Hydrate once on mount; persistence below is skipped until this settles
  // so we never overwrite the stored list with the initial empty state.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const persisted = await loadJSON<string[]>(StorageKeys.bookmarks, []);
      if (cancelled) return;
      setIds(persisted);
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    void saveJSON(StorageKeys.bookmarks, ids);
  }, [ids]);

  const isBookmarked = useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIds((prev) => toggleId(prev, id));
  }, []);

  const value = useMemo<BookmarksValue>(
    () => ({ ids, isBookmarked, toggle }),
    [ids, isBookmarked, toggle],
  );

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

export function useBookmarks(): BookmarksValue {
  const ctx = useContext(BookmarksContext);
  if (!ctx) throw new Error("useBookmarks must be used within a BookmarksProvider");
  return ctx;
}
