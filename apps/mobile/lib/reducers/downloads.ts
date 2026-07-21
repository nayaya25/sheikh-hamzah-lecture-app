export type DownloadStatus = "idle" | "queued" | "downloading" | "downloaded" | "failed";
export interface DownloadEntry { id: string; status: DownloadStatus; progress: number; localUri?: string; bytes?: number; error?: string; }
export type DownloadsState = Record<string, DownloadEntry>;

export type DownloadsAction =
  | { type: "queue"; id: string }
  | { type: "start"; id: string }
  | { type: "progress"; id: string; progress: number }
  | { type: "done"; id: string; localUri: string; bytes?: number }
  | { type: "fail"; id: string; error: string }
  | { type: "remove"; id: string }
  | { type: "hydrate"; state: DownloadsState };

const upsert = (s: DownloadsState, id: string, patch: Partial<DownloadEntry>): DownloadsState => ({
  ...s,
  [id]: Object.assign({ id, status: "idle" as const, progress: 0 }, s[id], patch),
});

export function downloadsReducer(state: DownloadsState, a: DownloadsAction): DownloadsState {
  switch (a.type) {
    case "queue": return upsert(state, a.id, { status: "queued", progress: 0, error: undefined });
    case "start": return upsert(state, a.id, { status: "downloading" });
    case "progress": return upsert(state, a.id, { status: "downloading", progress: Math.min(1, Math.max(0, a.progress)) });
    case "done": return upsert(state, a.id, { status: "downloaded", progress: 1, localUri: a.localUri, bytes: a.bytes, error: undefined });
    case "fail": return upsert(state, a.id, { status: "failed", error: a.error });
    case "remove": { const next = { ...state }; delete next[a.id]; return next; }
    case "hydrate": return a.state;
    default: return state;
  }
}

export const isDownloaded = (s: DownloadsState, id: string) => s[id]?.status === "downloaded";
export const downloadedIds = (s: DownloadsState) => Object.values(s).filter((e) => e.status === "downloaded").map((e) => e.id);
export const totalBytes = (s: DownloadsState) => Object.values(s).reduce((n, e) => n + (e.status === "downloaded" ? e.bytes ?? 0 : 0), 0);
export const activeCount = (s: DownloadsState) => Object.values(s).filter((e) => e.status === "queued" || e.status === "downloading").length;
