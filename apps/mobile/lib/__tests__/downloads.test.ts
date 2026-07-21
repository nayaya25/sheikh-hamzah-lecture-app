import {
  downloadsReducer,
  isDownloaded,
  downloadedIds,
  totalBytes,
  activeCount,
  type DownloadsState,
} from "@/lib/reducers/downloads";

describe("downloadsReducer", () => {
  it("queue sets status queued, progress 0, clears error", () => {
    const state = downloadsReducer({}, { type: "queue", id: "a" });
    expect(state.a).toEqual({ id: "a", status: "queued", progress: 0, error: undefined });
  });

  it("start sets status downloading", () => {
    const queued = downloadsReducer({}, { type: "queue", id: "a" });
    const state = downloadsReducer(queued, { type: "start", id: "a" });
    expect(state.a.status).toBe("downloading");
  });

  it("progress clamps values above 1 down to 1", () => {
    const started = downloadsReducer({}, { type: "start", id: "a" });
    const state = downloadsReducer(started, { type: "progress", id: "a", progress: 1.5 });
    expect(state.a.progress).toBe(1);
    expect(state.a.status).toBe("downloading");
  });

  it("progress clamps values below 0 up to 0", () => {
    const started = downloadsReducer({}, { type: "start", id: "a" });
    const state = downloadsReducer(started, { type: "progress", id: "a", progress: -0.5 });
    expect(state.a.progress).toBe(0);
  });

  it("done sets status downloaded, progress 1, localUri, bytes, clears error", () => {
    let state: DownloadsState = downloadsReducer({}, { type: "queue", id: "a" });
    state = downloadsReducer(state, { type: "fail", id: "a", error: "boom" });
    state = downloadsReducer(state, {
      type: "done",
      id: "a",
      localUri: "file://a.mp3",
      bytes: 1024,
    });
    expect(state.a).toEqual({
      id: "a",
      status: "downloaded",
      progress: 1,
      localUri: "file://a.mp3",
      bytes: 1024,
      error: undefined,
    });
  });

  it("fail sets status failed and records error", () => {
    const started = downloadsReducer({}, { type: "start", id: "a" });
    const state = downloadsReducer(started, { type: "fail", id: "a", error: "network down" });
    expect(state.a.status).toBe("failed");
    expect(state.a.error).toBe("network down");
  });

  it("remove deletes the entry's key entirely", () => {
    const state = downloadsReducer({}, { type: "queue", id: "a" });
    const next = downloadsReducer(state, { type: "remove", id: "a" });
    expect(next).toEqual({});
    expect(Object.prototype.hasOwnProperty.call(next, "a")).toBe(false);
  });

  it("hydrate replaces the entire state", () => {
    const state = downloadsReducer({}, { type: "queue", id: "a" });
    const hydrated: DownloadsState = {
      b: { id: "b", status: "downloaded", progress: 1, bytes: 5 },
    };
    const next = downloadsReducer(state, { type: "hydrate", state: hydrated });
    expect(next).toEqual(hydrated);
    expect(next.a).toBeUndefined();
  });
});

describe("downloads selectors", () => {
  const state: DownloadsState = {
    a: { id: "a", status: "downloaded", progress: 1, bytes: 100 },
    b: { id: "b", status: "downloaded", progress: 1, bytes: 200 },
    c: { id: "c", status: "queued", progress: 0 },
    d: { id: "d", status: "downloading", progress: 0.4 },
    e: { id: "e", status: "failed", progress: 0, error: "x" },
  };

  it("isDownloaded is true only for downloaded entries", () => {
    expect(isDownloaded(state, "a")).toBe(true);
    expect(isDownloaded(state, "c")).toBe(false);
    expect(isDownloaded(state, "missing")).toBe(false);
  });

  it("downloadedIds lists only downloaded ids", () => {
    expect(downloadedIds(state).sort()).toEqual(["a", "b"]);
  });

  it("totalBytes sums bytes only for downloaded entries", () => {
    expect(totalBytes(state)).toBe(300);
  });

  it("totalBytes treats a missing bytes field on a downloaded entry as 0", () => {
    const partial: DownloadsState = { a: { id: "a", status: "downloaded", progress: 1 } };
    expect(totalBytes(partial)).toBe(0);
  });

  it("activeCount counts queued + downloading only", () => {
    expect(activeCount(state)).toBe(2);
  });
});
