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
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import type { Playable } from "@/lib/catalog";
import { useDownloads } from "@/lib/downloads";
import { loadJSON, saveJSON, StorageKeys } from "@/lib/storage";

const SPEEDS = [1, 1.25, 1.5, 2, 0.75] as const;
const SLEEPS = [0, 15, 30, 45, 60] as const;

export type RepeatMode = "off" | "one" | "all";
const REPEAT_ORDER: RepeatMode[] = ["off", "all", "one"];

const clamp = (n: number) => Math.min(1, Math.max(0, n));

interface PlayerValue {
  current: Playable | null;
  isPlaying: boolean;
  /** 0–1 fraction played. */
  position: number;
  /** Real elapsed time, in seconds (from audio status; falls back to position×duration). */
  elapsedSec: number;
  /** Real track duration, in seconds (from audio status; falls back to `current.durSec`). */
  durationSec: number;
  speed: number;
  /** Sleep timer minutes; 0 = off. */
  sleep: number;
  /** Live sleep-timer countdown, in seconds; 0 when off. */
  sleepRemainingSec: number;
  /** Whether the active player is currently buffering/loading. */
  buffering: boolean;
  /** Repeat mode: off (advance/stop), one (loop current), all (loop the queue). */
  repeat: RepeatMode;
  /** The current play queue (a collection's lectures), and the index of `current` within it. */
  queue: Playable[];
  queueIndex: number;
  hasNext: boolean;
  hasPrev: boolean;
  play: (lecture: Playable) => void;
  /** Set the queue to `lectures` and play `lectures[startIndex]`. */
  playCollection: (lectures: Playable[], startIndex: number) => void;
  /** Jump to a specific index in the current queue. */
  playAt: (index: number) => void;
  /** Reorder the session queue, keeping `queueIndex` pointed at the same track. */
  moveQueueItem: (from: number, to: number) => void;
  next: () => void;
  prev: () => void;
  togglePlay: () => void;
  seekTo: (fraction: number) => void;
  /** Seek by an absolute number of seconds (± = forward/back), clamped to [0, duration]. */
  seekBySeconds: (sec: number) => void;
  /** Cycle repeat mode off → all → one → off. */
  cycleRepeat: () => void;
  /** Nudge position by a fraction (±0.05 = the 15/30s buttons in the prototype). */
  nudge: (delta: number) => void;
  /** Saved resume fraction (0–1) for a lecture id, or 0 if none saved. */
  progressFor: (id: string) => number;
  cycleSpeed: () => void;
  setSpeedValue: (s: number) => void;
  cycleSleep: () => void;
  setSleepMinutes: (min: number) => void;
}

const PlayerContext = createContext<PlayerValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const downloads = useDownloads();
  const [current, setCurrent] = useState<Playable | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [sleep, setSleep] = useState(0);
  const [sleepRemainingSec, setSleepRemainingSec] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [queue, setQueue] = useState<Playable[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);

  // Real audio player (used when the current lecture has a mediaUrl).
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const hasAudio = Boolean(current?.mediaUrl);

  // Real duration/elapsed, driven by the audio status (SECONDS). Metadata
  // `durSec` is often 0, so prefer the loaded status duration; fall back to
  // metadata for no-media/simulated items. `elapsedSec` derives from the
  // (already status-driven) `position` fraction so it stays in lockstep with
  // the bars without adding another status field to every dependency list.
  const durationSec =
    hasAudio && status.isLoaded && status.duration > 0 ? status.duration : current?.durSec ?? 0;
  const elapsedSec = position * durationSec;

  // Saved resume positions (lectureId → fraction), loaded once.
  const resumeRef = useRef<Record<string, number>>({});

  // Mirror downloads to avoid recreating playback callbacks on each download progress tick.
  const downloadsRef = useRef(downloads);
  downloadsRef.current = downloads;

  // Configure background/lock-screen audio + restore saved prefs on mount.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch(() => {});
    void (async () => {
      resumeRef.current = await loadJSON<Record<string, number>>(StorageKeys.resume, {});
      setSpeed(await loadJSON<number>(StorageKeys.speed, 1));
      setRepeat(await loadJSON<RepeatMode>(StorageKeys.repeat, "off"));
    })();
  }, []);

  // Keep the exposed playback rate applied to the native player.
  useEffect(() => {
    try {
      player.setPlaybackRate(speed);
    } catch {
      // player not ready with a source yet
    }
    void saveJSON(StorageKeys.speed, speed);
  }, [speed, player]);

  // Real audio: mirror native status into the exposed position/isPlaying/buffering.
  useEffect(() => {
    if (!hasAudio) {
      setBuffering(false);
      return;
    }
    if (status.isLoaded && status.duration > 0) {
      setPosition(clamp(status.currentTime / status.duration));
    }
    setIsPlaying(status.playing);
    setBuffering(!status.isLoaded || status.isBuffering === true);
  }, [hasAudio, status.currentTime, status.duration, status.playing, status.isLoaded, status.isBuffering]);

  // Simulated clock: only when the current lecture has no real media.
  useEffect(() => {
    if (hasAudio || !isPlaying || !current) return;
    const dur = current.durSec || 1;
    const id = setInterval(() => {
      setPosition((p) => {
        const next = p + speed / dur;
        if (next >= 1) {
          // End of a simulated track — hand off to the repeat/advance logic
          // (only on the first crossing, not on subsequent idle ticks).
          if (p < 1) handleTrackEndRef.current();
          return 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [hasAudio, isPlaying, current, speed]);

  // Track the latest position per lecture, and persist on pause.
  useEffect(() => {
    if (current) resumeRef.current[current.id] = position;
  }, [current, position]);
  useEffect(() => {
    if (!isPlaying) void saveJSON(StorageKeys.resume, resumeRef.current);
  }, [isPlaying]);

  // Core playback: loads + starts a lecture without touching the queue.
  // Kept separate from `play` so `playCollection`/`playAt` can drive the queue
  // themselves without the queue reset below stomping their multi-item queue.
  const startPlayback = useCallback(
    (lecture: Playable) => {
      const resume = resumeRef.current[lecture.id] ?? 0;
      setCurrent(lecture);
      setPosition(resume);
      void saveJSON(StorageKeys.lastPlayed, { id: lecture.id });
      if (lecture.mediaUrl) {
        const src = downloadsRef.current.localUri(lecture.id) ?? lecture.mediaUrl;
        player.replace({ uri: src });
        if (resume > 0 && lecture.durSec) player.seekTo(resume * lecture.durSec);
        player.play();
      } else {
        setIsPlaying(true);
      }
    },
    [player],
  );

  const play = useCallback(
    (lecture: Playable) => {
      // Single-lecture play always resets the queue to just this item, so
      // mini-player/Home single plays don't leave a stale multi-episode queue.
      setQueue([lecture]);
      setQueueIndex(0);
      startPlayback(lecture);
    },
    [startPlayback],
  );

  const playAt = useCallback(
    (index: number) => {
      if (index < 0 || index >= queue.length) return;
      setQueueIndex(index);
      startPlayback(queue[index]);
    },
    [queue, startPlayback],
  );

  const playCollection = useCallback(
    (lectures: Playable[], startIndex: number) => {
      setQueue(lectures);
      setQueueIndex(startIndex);
      startPlayback(lectures[startIndex]);
    },
    [startPlayback],
  );

  const next = useCallback(() => playAt(queueIndex + 1), [playAt, queueIndex]);
  const prev = useCallback(() => playAt(queueIndex - 1), [playAt, queueIndex]);
  const hasNext = queueIndex >= 0 && queueIndex < queue.length - 1;
  const hasPrev = queueIndex > 0;

  const progressFor = useCallback((id: string) => resumeRef.current[id] ?? 0, []);

  // What to do when a track reaches its end (real audio: `status.didJustFinish`;
  // simulated: the clock hits 1). `one` loops the current track; `all` advances
  // and wraps last→first; `off` advances if possible, else stops.
  const handleTrackEnd = useCallback(() => {
    if (repeat === "one") {
      if (hasAudio) {
        void player.seekTo(0);
        player.play();
      } else {
        setPosition(0);
        setIsPlaying(true);
      }
      return;
    }
    if (repeat === "all") {
      if (hasNext) next();
      else playAt(0);
      return;
    }
    // off
    if (hasNext) next();
    else {
      if (hasAudio) player.pause();
      setIsPlaying(false);
    }
  }, [repeat, hasAudio, hasNext, next, playAt, player]);

  // Keep a live ref so the simulated clock (whose interval captures stale
  // closures) always calls the latest handler.
  const handleTrackEndRef = useRef(handleTrackEnd);
  handleTrackEndRef.current = handleTrackEnd;

  // Real audio auto-advance: fire once each time the track finishes.
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!hasAudio) return;
    if (status.didJustFinish && !finishedRef.current) {
      finishedRef.current = true;
      handleTrackEnd();
    } else if (!status.didJustFinish) {
      finishedRef.current = false;
    }
  }, [hasAudio, status.didJustFinish, handleTrackEnd]);

  const togglePlay = useCallback(() => {
    if (hasAudio) {
      if (status.playing) player.pause();
      else player.play();
    } else {
      setIsPlaying((p) => !p);
    }
  }, [hasAudio, status.playing, player]);

  const seekTo = useCallback(
    (fraction: number) => {
      const f = clamp(fraction);
      if (hasAudio && current?.durSec) player.seekTo(f * current.durSec);
      else setPosition(f);
    },
    [hasAudio, current, player],
  );

  const nudge = useCallback(
    (delta: number) => seekTo(position + delta),
    [seekTo, position],
  );

  // Seek by an absolute number of seconds, driven by the REAL audio clock so
  // the 15s/30s buttons move even when metadata `durSec` is 0. Clamped to
  // [0, duration]. Simulated items nudge the fraction by sec/duration.
  const seekBySeconds = useCallback(
    (sec: number) => {
      if (hasAudio) {
        const dur = durationSec;
        const base = status.isLoaded ? status.currentTime : position * dur;
        const target = dur > 0 ? Math.min(dur, Math.max(0, base + sec)) : Math.max(0, base + sec);
        player.seekTo(target);
      } else {
        const dur = durationSec || 1;
        setPosition((p) => clamp(p + sec / dur));
      }
    },
    [hasAudio, durationSec, status.isLoaded, status.currentTime, position, player],
  );

  const moveQueueItem = useCallback((from: number, to: number) => {
    setQueue((q) => {
      if (from < 0 || from >= q.length || to < 0 || to >= q.length || from === to) return q;
      const next = q.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    // Keep queueIndex on the same track after the reorder (remove-then-insert).
    setQueueIndex((idx) => {
      if (from === to) return idx;
      if (idx === from) return to;
      let n = idx > from ? idx - 1 : idx;
      if (n >= to) n += 1;
      return n;
    });
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => {
      const next = REPEAT_ORDER[(REPEAT_ORDER.indexOf(r) + 1) % REPEAT_ORDER.length];
      void saveJSON(StorageKeys.repeat, next);
      return next;
    });
  }, []);

  const setSpeedValue = useCallback((s: number) => setSpeed(s), []);

  const setSleepMinutes = useCallback((min: number) => {
    setSleep(min);
    setSleepRemainingSec(min * 60);
  }, []);

  // Sleep-timer countdown: ticks only while playing and armed; pauses
  // playback (real or simulated) when it reaches 0.
  useEffect(() => {
    if (sleep <= 0 || !isPlaying) return;
    const id = setInterval(() => {
      setSleepRemainingSec((s) => {
        if (s <= 1) {
          if (hasAudio) player.pause();
          else setIsPlaying(false);
          setSleep(0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [sleep, isPlaying, hasAudio, player]);

  // Lock-screen (Now Playing) metadata. Activates once when a track with real
  // media first becomes current, then just pushes updated metadata on later
  // track changes — deactivating and reactivating on every change (the
  // previous approach) made the OS Now-Playing UI blink on every track
  // switch. Only deactivates when playback is cleared, or on unmount.
  const lockScreenActiveRef = useRef(false);

  useEffect(() => {
    if (!current || !current.mediaUrl) {
      if (lockScreenActiveRef.current) {
        try {
          player.setActiveForLockScreen(false);
        } catch {
          // ignore
        }
        lockScreenActiveRef.current = false;
      }
      return;
    }
    // Wait for the source to actually be loaded — activating (or refreshing)
    // the moment `current` changes but before `player.replace({uri})` has
    // finished loading is a no-op on the native side, which is why the
    // lock-screen/notification controls never appeared.
    if (!status.isLoaded) return;
    const metadata = {
      title: current.title,
      artist: current.collectionTitle ?? current.sub,
      albumTitle: current.collectionTitle ?? "Althaqalayn Lectures",
      // artworkUrl: omitted for now — generated covers have no URL.
    };
    try {
      if (!lockScreenActiveRef.current) {
        // Ask the OS to surface seek-backward/forward controls alongside
        // play/pause (expo-audio exposes no next/prev remote command).
        player.setActiveForLockScreen(true, metadata, {
          showSeekBackward: true,
          showSeekForward: true,
        });
        lockScreenActiveRef.current = true;
      } else {
        player.updateLockScreenMetadata(metadata);
      }
    } catch {
      // API shape guard — swallow if unsupported on this platform/build.
    }
  }, [current, status.isLoaded, player]);

  // Deactivate on unmount only (not on every `current` change — see above).
  useEffect(() => {
    return () => {
      if (lockScreenActiveRef.current) {
        try {
          player.setActiveForLockScreen(false);
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<PlayerValue>(
    () => ({
      current,
      isPlaying,
      position,
      elapsedSec,
      durationSec,
      speed,
      sleep,
      sleepRemainingSec,
      buffering,
      repeat,
      queue,
      queueIndex,
      hasNext,
      hasPrev,
      play,
      playCollection,
      playAt,
      moveQueueItem,
      next,
      prev,
      togglePlay,
      seekTo,
      seekBySeconds,
      cycleRepeat,
      nudge,
      progressFor,
      cycleSpeed: () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]),
      setSpeedValue,
      cycleSleep: () => setSleepMinutes(SLEEPS[(SLEEPS.indexOf(sleep as (typeof SLEEPS)[number]) + 1) % SLEEPS.length]),
      setSleepMinutes,
    }),
    [
      current,
      isPlaying,
      position,
      elapsedSec,
      durationSec,
      speed,
      sleep,
      sleepRemainingSec,
      buffering,
      repeat,
      queue,
      queueIndex,
      hasNext,
      hasPrev,
      play,
      playCollection,
      playAt,
      moveQueueItem,
      next,
      prev,
      togglePlay,
      seekTo,
      seekBySeconds,
      cycleRepeat,
      nudge,
      progressFor,
      setSpeedValue,
      setSleepMinutes,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}
