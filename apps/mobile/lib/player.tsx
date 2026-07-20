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
import { loadJSON, saveJSON, StorageKeys } from "@/lib/storage";

const SPEEDS = [1, 1.25, 1.5, 2, 0.75] as const;
const SLEEPS = [0, 15, 30, 45] as const;

const clamp = (n: number) => Math.min(1, Math.max(0, n));

interface PlayerValue {
  current: Playable | null;
  isPlaying: boolean;
  /** 0–1 fraction played. */
  position: number;
  speed: number;
  /** Sleep timer minutes; 0 = off. */
  sleep: number;
  transcriptOpen: boolean;
  play: (lecture: Playable) => void;
  togglePlay: () => void;
  seekTo: (fraction: number) => void;
  /** Nudge position by a fraction (±0.05 = the 15/30s buttons in the prototype). */
  nudge: (delta: number) => void;
  cycleSpeed: () => void;
  cycleSleep: () => void;
  toggleTranscript: () => void;
}

const PlayerContext = createContext<PlayerValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Playable | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [sleep, setSleep] = useState(0);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  // Real audio player (used when the current lecture has a mediaUrl).
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const hasAudio = Boolean(current?.mediaUrl);

  // Saved resume positions (lectureId → fraction), loaded once.
  const resumeRef = useRef<Record<string, number>>({});

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

  // Real audio: mirror native status into the exposed position/isPlaying.
  useEffect(() => {
    if (!hasAudio) return;
    if (status.isLoaded && status.duration > 0) {
      setPosition(clamp(status.currentTime / status.duration));
    }
    setIsPlaying(status.playing);
  }, [hasAudio, status.currentTime, status.duration, status.playing, status.isLoaded]);

  // Simulated clock: only when the current lecture has no real media.
  useEffect(() => {
    if (hasAudio || !isPlaying || !current) return;
    const dur = current.durSec || 1;
    const id = setInterval(() => {
      setPosition((p) => {
        const next = p + speed / dur;
        if (next >= 1) {
          setIsPlaying(false);
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

  const play = useCallback(
    (lecture: Playable) => {
      const resume = resumeRef.current[lecture.id] ?? 0;
      setCurrent(lecture);
      setPosition(resume);
      void saveJSON(StorageKeys.lastPlayed, { id: lecture.id });
      if (lecture.mediaUrl) {
        player.replace({ uri: lecture.mediaUrl });
        if (resume > 0 && lecture.durSec) player.seekTo(resume * lecture.durSec);
        player.play();
      } else {
        setIsPlaying(true);
      }
    },
    [player],
  );

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

  const value = useMemo<PlayerValue>(
    () => ({
      current,
      isPlaying,
      position,
      speed,
      sleep,
      transcriptOpen,
      play,
      togglePlay,
      seekTo,
      nudge,
      cycleSpeed: () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]),
      cycleSleep: () => setSleep((s) => SLEEPS[(SLEEPS.indexOf(s as (typeof SLEEPS)[number]) + 1) % SLEEPS.length]),
      toggleTranscript: () => setTranscriptOpen((t) => !t),
    }),
    [current, isPlaying, position, speed, sleep, transcriptOpen, play, togglePlay, seekTo, nudge],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}
