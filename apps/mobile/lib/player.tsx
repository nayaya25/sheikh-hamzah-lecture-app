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
import { seriesById, type Playable, type SampleSeries } from "@/lib/catalog";

const SPEEDS = [1, 1.25, 1.5, 2, 0.75] as const;
const SLEEPS = [0, 15, 30, 45] as const;

interface PlayerValue {
  current: Playable | null;
  currentSeries: SampleSeries | undefined;
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

  // Simulated playback clock. Real audio (expo-audio) replaces this once media
  // URLs are wired; the context surface stays the same.
  const durRef = useRef(0);
  durRef.current = current?.durSec ?? 0;
  useEffect(() => {
    if (!isPlaying || !current) return;
    const id = setInterval(() => {
      setPosition((p) => {
        const next = p + (speed * 1) / (durRef.current || 1);
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying, current, speed]);

  const play = useCallback((lecture: Playable) => {
    setCurrent((prev) => {
      if (!prev || prev.id !== lecture.id) setPosition(0);
      return lecture;
    });
    setIsPlaying(true);
  }, []);

  const value = useMemo<PlayerValue>(
    () => ({
      current,
      currentSeries: current ? seriesById(current.seriesId) : undefined,
      isPlaying,
      position,
      speed,
      sleep,
      transcriptOpen,
      play,
      togglePlay: () => setIsPlaying((p) => !p),
      seekTo: (f) => setPosition(Math.min(1, Math.max(0, f))),
      nudge: (d) => setPosition((p) => Math.min(1, Math.max(0, p + d))),
      cycleSpeed: () => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]),
      cycleSleep: () => setSleep((s) => SLEEPS[(SLEEPS.indexOf(s as (typeof SLEEPS)[number]) + 1) % SLEEPS.length]),
      toggleTranscript: () => setTranscriptOpen((t) => !t),
    }),
    [current, isPlaying, position, speed, sleep, transcriptOpen, play],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}
