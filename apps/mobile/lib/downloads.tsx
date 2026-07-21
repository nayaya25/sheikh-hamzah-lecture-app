// Offline-download engine. Wraps the pure `downloadsReducer` (Task 1) with the
// real side effects: hitting the network, writing files under the app's
// document directory, persisting state, and capping concurrency.
//
// expo-file-system API note (v57 / installed 57.0.1): this version ships the
// new class-based `File`/`Directory`/`Paths` API as its default export (the
// old `FileSystem.createDownloadResumable`/`downloadAsync`/`documentDirectory`
// surface only exists under the `expo-file-system/legacy` deep import). We use
// the new API: `Paths.document` for the app documents dir, `Directory`/`File`
// instances with a synchronous `.exists` getter and `.create()`/`.delete()`,
// and `File.downloadFileAsync(url, destination, { onProgress, idempotent })`
// for a download-with-progress call that resolves to a `File` (whose `.size`
// gives us the byte count for storage-used).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { Directory, File, Paths } from "expo-file-system";
import { getNetworkStateAsync, NetworkStateType } from "expo-network";
import type { Playable } from "@/lib/catalog";
import { useI18n } from "@/lib/i18n";
import {
  downloadsReducer,
  type DownloadEntry,
  type DownloadsState,
} from "@/lib/reducers/downloads";
import { loadJSON, saveJSON, StorageKeys } from "@/lib/storage";

/** At most this many downloads run at once; the rest sit "queued". */
const CONCURRENCY = 2;

const bump = () => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

/** The directory downloads are written into: `<docdir>/lectures/`. */
function lecturesDir(): Directory {
  return new Directory(Paths.document, "lectures");
}

/** `.mp3` / `.mp4` / etc — from the URL if it has one, else a type-based guess. */
function extensionFor(l: Playable): string {
  const fromUrl = l.mediaUrl ? Paths.extname(l.mediaUrl) : "";
  if (fromUrl) return fromUrl;
  if (l.type === "video") return ".mp4";
  if (l.type === "text") return ".html";
  return ".mp3";
}

/** `.exists` can throw for malformed/unsupported URIs — never let that crash reconcile. */
function safeExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

interface DownloadsValue {
  state: DownloadsState;
  /**
   * Start (or resume queueing) a download; no-op if already
   * downloaded/downloading/queued. Async internally (checks the "Wi-Fi only"
   * preference + live connection type) but fire-and-forget for the caller —
   * on cellular with the preference on, it alerts the user and never queues.
   */
  download: (l: Playable) => void;
  /** Delete the local file (best-effort) and drop the entry. */
  remove: (id: string) => void;
  /** Delete every downloaded file and reset all state. */
  clearAll: () => void;
  entry: (id: string) => DownloadEntry | undefined;
  /** The local file uri for a downloaded lecture, else undefined. */
  localUri: (id: string) => string | undefined;
}

const DownloadsContext = createContext<DownloadsValue | null>(null);

export function DownloadsProvider({ children }: { children: ReactNode }) {
  const { t: msgs } = useI18n();
  const [state, dispatch] = useReducer(downloadsReducer, {} as DownloadsState);

  // Refs mirror `state`/side-book-keeping so callbacks with stable identities
  // (and the drain effect) can read the latest values without re-subscribing.
  const stateRef = useRef(state);
  stateRef.current = state;
  const hydrated = useRef(false);
  // ids currently occupying a concurrency slot (a real download in flight).
  const inFlight = useRef<Set<string>>(new Set());
  // Full Playable for every queued/in-flight id — the reducer state only
  // tracks {id, status, progress, ...}, not the source url/type, so we keep
  // the object that `download()` was called with until the transfer settles.
  const playables = useRef<Map<string, Playable>>(new Map());

  // Hydrate from storage once, then reconcile against the real filesystem:
  // drop "downloaded" entries whose file no longer exists, and unstick any
  // "queued"/"downloading" entries left behind by a previous session (no
  // task backs them anymore since the app just started).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const persisted = await loadJSON<DownloadsState>(StorageKeys.downloads, {});
      if (cancelled) return;
      dispatch({ type: "hydrate", state: persisted });
      for (const e of Object.values(persisted)) {
        if (e.status === "downloaded") {
          if (!e.localUri || !safeExists(e.localUri)) {
            dispatch({ type: "remove", id: e.id });
          }
        } else if (e.status === "queued" || e.status === "downloading") {
          dispatch({ type: "fail", id: e.id, error: "Download interrupted" });
        }
      }
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on every change, once past the initial hydrate+reconcile.
  useEffect(() => {
    if (!hydrated.current) return;
    void saveJSON(StorageKeys.downloads, state);
  }, [state]);

  const runDownload = useCallback((l: Playable) => {
    dispatch({ type: "start", id: l.id });
    bump();
    void (async () => {
      try {
        const dir = lecturesDir();
        if (!dir.exists) dir.create({ intermediates: true });
        const dest = new File(dir, `${l.id}${extensionFor(l)}`);
        const file = await File.downloadFileAsync(l.mediaUrl!, dest, {
          idempotent: true,
          onProgress: ({ bytesWritten, totalBytes }) => {
            if (totalBytes > 0) {
              dispatch({ type: "progress", id: l.id, progress: bytesWritten / totalBytes });
            }
          },
        });
        dispatch({ type: "done", id: l.id, localUri: file.uri, bytes: file.size ?? undefined });
        bump();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        dispatch({
          type: "fail",
          id: l.id,
          error: message,
        });
        Alert.alert("Download failed", message);
      } finally {
        inFlight.current.delete(l.id);
        playables.current.delete(l.id);
      }
    })();
  }, []);

  // Drain: whenever state changes (a download finished, or a new one was
  // queued), fill any free concurrency slots with queued entries.
  useEffect(() => {
    if (!hydrated.current) return;
    for (const e of Object.values(state)) {
      if (inFlight.current.size >= CONCURRENCY) break;
      if (e.status !== "queued" || inFlight.current.has(e.id)) continue;
      const playable = playables.current.get(e.id);
      if (!playable) continue;
      inFlight.current.add(e.id);
      runDownload(playable);
    }
  }, [state, runDownload]);

  const download = useCallback(
    (l: Playable) => {
      if (!l.mediaUrl) {
        Alert.alert("Can't download", "This lecture has no media file yet.");
        return;
      }
      const existing = stateRef.current[l.id]?.status;
      if (existing === "downloaded" || existing === "queued" || existing === "downloading") return;
      // Enforce "download over Wi-Fi only": read the fresh preference (rather
      // than a hydrated-on-mount value) so a toggle made in Settings this
      // session is honored immediately, then check the live connection type.
      void (async () => {
        try {
          const wifiOnly = await loadJSON<boolean>(StorageKeys.wifiOnly, false);
          if (wifiOnly) {
            const net = await getNetworkStateAsync();
            if (net.type === NetworkStateType.CELLULAR) {
              Alert.alert(msgs.download.wifiOnlyTitle, msgs.download.wifiOnlyBody);
              return;
            }
          }
        } catch {
          // check failed — fail open, proceed to download
        }
        playables.current.set(l.id, l);
        dispatch({ type: "queue", id: l.id });
      })().catch(() => {});
    },
    [msgs],
  );

  const remove = useCallback((id: string) => {
    const uri = stateRef.current[id]?.localUri;
    if (uri) {
      try {
        const f = new File(uri);
        if (f.exists) f.delete();
      } catch {
        // best-effort
      }
    }
    playables.current.delete(id);
    inFlight.current.delete(id);
    dispatch({ type: "remove", id });
  }, []);

  const clearAll = useCallback(() => {
    for (const e of Object.values(stateRef.current)) {
      if (!e.localUri) continue;
      try {
        const f = new File(e.localUri);
        if (f.exists) f.delete();
      } catch {
        // best-effort
      }
    }
    try {
      const dir = lecturesDir();
      if (dir.exists) dir.delete();
    } catch {
      // best-effort
    }
    playables.current.clear();
    inFlight.current.clear();
    dispatch({ type: "hydrate", state: {} });
  }, []);

  const entry = useCallback((id: string) => state[id], [state]);
  const localUri = useCallback(
    (id: string) => (state[id]?.status === "downloaded" ? state[id]?.localUri : undefined),
    [state],
  );

  const value = useMemo<DownloadsValue>(
    () => ({ state, download, remove, clearAll, entry, localUri }),
    [state, download, remove, clearAll, entry, localUri],
  );

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

export function useDownloads(): DownloadsValue {
  const ctx = useContext(DownloadsContext);
  if (!ctx) throw new Error("useDownloads must be used within a DownloadsProvider");
  return ctx;
}
