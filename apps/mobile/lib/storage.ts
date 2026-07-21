// Thin typed wrapper over AsyncStorage for persisting small JSON preferences
// (language, playback speed, resume positions). Failures are swallowed — a
// preference that can't be read/written should never crash the app.

import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "althaqalayn:";

export const StorageKeys = {
  language: "language",
  speed: "speed",
  resume: "resume", // Record<lectureId, positionFraction>
  lastPlayed: "lastPlayed", // { id: string } — most recent track for "Continue listening"
  recentSearches: "recentSearches", // string[] — recent search queries
  themeMode: "themeMode", // "system" | "light" | "dark"
  downloads: "downloads", // DownloadsState — persisted offline-download entries
  bookmarks: "bookmarks", // string[] — saved/bookmarked lecture ids
  readerTheme: "readerTheme", // "light" | "dark" | null — local override for the reader's reading theme
  readerScroll: "readerScroll", // Record<lectureId, scrollFraction> — reader scroll position, 0..1
  readerFont: "readerFont", // number — reader body text scale factor
} as const;

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Best-effort; ignore write failures.
  }
}
