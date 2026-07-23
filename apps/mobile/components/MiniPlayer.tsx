import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { AppText } from "@/components/ui/AppText";
import { CoverArt } from "@/components/ui/CoverArt";
import { EqBars } from "@/components/EqBars";
import { Scrubber } from "@/components/player/Scrubber";
import { formatTime } from "@/lib/catalog";
import { font } from "@/lib/fonts";
import { MINI_PLAYER_GAP, TAB_BAR_HEIGHT } from "@/lib/layout";
import { usePlayer } from "@/lib/player";
import { useTheme } from "@/lib/theme";

/**
 * Green bar above the tab nav showing the current track. Rendered once in the
 * root layout so it survives tab switches. Hidden with nothing loaded or while
 * the full player is open. Tapping the cover/title expands the full player; the
 * play button and the interactive scrubber act in place.
 *
 * The outer container is a plain View (not a Pressable): the scrubber owns a
 * pan gesture and the play button its own press, so making the whole bar a
 * Pressable would swallow/argue with those. Only the cover+title strip opens
 * the player.
 *
 * NOTE on shared-element morph: Reanimated 4 (installed 4.5.0, RN 0.86) reworks
 * shared-element transitions around a new native `SharedTransitionBoundary`
 * component that the navigator tree must be wrapped in — it's not automatic
 * from `sharedTransitionTag` alone like Reanimated 2/3. This mini-player is
 * also a persistent overlay rendered once in the root layout (outside the
 * Stack), not a mounted/unmounted stack screen, so it never participates in
 * the screen-transition lifecycle the shared-element mechanism keys off of.
 * Wiring a boundary would mean touching the root layout/navigator, outside
 * this task's file scope. Falling back to the existing slide_from_bottom
 * route animation (already configured in app/_layout.tsx) per the brief.
 */
export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTheme();
  const { current, isPlaying, position, seekTo, togglePlay } = usePlayer();

  if (!current || pathname === "/player") return null;

  const durSec = current.durSec ?? 0;

  return (
    <View style={[styles.bar, { bottom: insets.bottom + TAB_BAR_HEIGHT + MINI_PLAYER_GAP }]}>
      <View style={styles.mainRow}>
        <Pressable style={styles.main} onPress={() => router.push("/player")}>
          <View style={styles.cover}>
            <CoverArt
              gradient={current.gradient ? [current.gradient[0], current.gradient[1]] : undefined}
              glyph={current.ar}
              size={42}
              radius={t.radii.md}
            />
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <View style={styles.eqWrap}>
                <EqBars playing={isPlaying} />
              </View>
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="onBrand" style={styles.title} numberOfLines={1}>
              {current.title}
            </AppText>
            <AppText color="rgba(228,199,123,0.9)" style={styles.sub} numberOfLines={1}>
              {current.sub}
            </AppText>
          </View>
        </Pressable>
        <Pressable hitSlop={8} onPress={togglePlay} style={styles.playBtn}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={18} color={colors.greenDeep} />
        </Pressable>
      </View>

      <View style={styles.scrubRow}>
        <AppText color="rgba(255,255,255,0.7)" style={styles.time}>
          {formatTime(position * durSec)}
        </AppText>
        <View style={styles.scrubWrap}>
          <Scrubber position={position} durationSec={durSec} onSeek={seekTo} />
        </View>
        <AppText color="rgba(255,255,255,0.7)" style={styles.time}>
          {formatTime(durSec)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 8,
    right: 8,
    zIndex: 40,
    backgroundColor: colors.greenDeep,
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingTop: 9,
    paddingBottom: 8,
    shadowColor: "#0B4634",
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  mainRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingRight: 1 },
  main: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 11 },
  cover: { width: 42, height: 42 },
  eqWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.serif.semibold, fontSize: 13 },
  sub: { fontFamily: font.sans.regular, fontSize: 10.5 },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
  scrubRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  // Scrubber ships a 26px top pad (room for its drag bubble); pull it up so the
  // mini-player stays compact — the track then sits centered against the times.
  scrubWrap: { flex: 1, marginTop: -22 },
  time: {
    fontFamily: font.sans.regular,
    fontSize: 10,
    minWidth: 30,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
});
