// User-created, on-device playlists. A single persisted `Playlist[]` — mirrors
// `bookmarks.tsx` (hydrate-once + persist-on-change, no reducer, no filesystem
// reconciliation), just storing an array of named lecture-id collections
// instead of a flat id list.

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

export interface Playlist {
  id: string;
  name: string;
  lectureIds: string[];
  createdAt: number;
}

/** Pure array-move (remove-then-insert), clamped to valid indices. */
export function movePlaylistItem(ids: string[], from: number, to: number): string[] {
  if (from < 0 || from >= ids.length || to < 0 || to >= ids.length || from === to) return ids;
  const next = ids.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

interface PlaylistsValue {
  playlists: Playlist[];
  /** Create a playlist and return its new id. */
  createPlaylist: (name: string) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  /** Append a lecture to a playlist (no duplicates). */
  addToPlaylist: (id: string, lectureId: string) => void;
  removeFromPlaylist: (id: string, lectureId: string) => void;
  reorderPlaylist: (id: string, from: number, to: number) => void;
  isInPlaylist: (id: string, lectureId: string) => boolean;
}

const PlaylistsContext = createContext<PlaylistsValue | null>(null);

// Reasonably-unique id without pulling in a uuid dependency.
const newId = () => `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const hydrated = useRef(false);

  // Hydrate once on mount; persistence below is skipped until this settles so
  // we never overwrite the stored list with the initial empty state.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const persisted = await loadJSON<Playlist[]>(StorageKeys.playlists, []);
      if (cancelled) return;
      setPlaylists(persisted);
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    void saveJSON(StorageKeys.playlists, playlists);
  }, [playlists]);

  const createPlaylist = useCallback((name: string) => {
    const id = newId();
    const playlist: Playlist = { id, name: name.trim(), lectureIds: [], createdAt: Date.now() };
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPlaylists((prev) => [playlist, ...prev]);
    return id;
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)));
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addToPlaylist = useCallback((id: string, lectureId: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === id && !p.lectureIds.includes(lectureId)
          ? { ...p, lectureIds: [...p.lectureIds, lectureId] }
          : p,
      ),
    );
  }, []);

  const removeFromPlaylist = useCallback((id: string, lectureId: string) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, lectureIds: p.lectureIds.filter((x) => x !== lectureId) } : p,
      ),
    );
  }, []);

  const reorderPlaylist = useCallback((id: string, from: number, to: number) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, lectureIds: movePlaylistItem(p.lectureIds, from, to) } : p)),
    );
  }, []);

  const isInPlaylist = useCallback(
    (id: string, lectureId: string) => playlists.find((p) => p.id === id)?.lectureIds.includes(lectureId) ?? false,
    [playlists],
  );

  const value = useMemo<PlaylistsValue>(
    () => ({
      playlists,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      reorderPlaylist,
      isInPlaylist,
    }),
    [
      playlists,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addToPlaylist,
      removeFromPlaylist,
      reorderPlaylist,
      isInPlaylist,
    ],
  );

  return <PlaylistsContext.Provider value={value}>{children}</PlaylistsContext.Provider>;
}

export function usePlaylists(): PlaylistsValue {
  const ctx = useContext(PlaylistsContext);
  if (!ctx) throw new Error("usePlaylists must be used within a PlaylistsProvider");
  return ctx;
}
