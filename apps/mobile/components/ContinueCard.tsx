import { StyleSheet, View } from "react-native";
import { colors } from "@althaqalayn/theme";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { CoverArt } from "@/components/ui/CoverArt";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { gradientForLecture, type Playable } from "@/lib/catalog";
import { useTheme } from "@/lib/theme";

export interface ContinueCardProps {
  /** The lecture to resume. */
  lecture: Playable;
  /** Fraction played, 0–1. */
  progress: number;
  /** Minutes remaining, already computed by the caller. */
  minutesLeft: number;
  /** Eyebrow label, e.g. "Continue listening". */
  eyebrow: string;
  /** Trailing "min left" unit label. */
  minutesLeftLabel: string;
  onPress: () => void;
}

/**
 * Resume-last card that floats over the hero's lower edge: cover (with a play
 * overlay) + eyebrow + title + a progress bar and a solid-green play button.
 * The caller owns the "what to resume" decision (real playback history) and
 * simply hides this when there's nothing to continue.
 */
export function ContinueCard({ lecture, progress, minutesLeft, eyebrow, minutesLeftLabel, onPress }: ContinueCardProps) {
  const t = useTheme();
  return (
    <Touchable haptic="light" onPress={onPress} style={styles.wrap} accessibilityLabel={`${eyebrow}: ${lecture.title}`}>
      <Card elevation="lg" style={styles.card}>
        <View style={styles.cover}>
          <CoverArt gradient={[gradientForLecture(lecture)[0], gradientForLecture(lecture)[1]]} glyph={lecture.ar} size={58} radius={t.radii.md} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText variant="caption" color="accent" style={styles.eyebrow}>
            {eyebrow.toUpperCase()}
          </AppText>
          <AppText variant="body" style={{ marginTop: 2, fontWeight: "700" }} numberOfLines={1}>
            {lecture.title}
          </AppText>
          <View style={styles.progressRow}>
            <View style={[styles.track, { backgroundColor: t.c.trackInactive }]}>
              <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`, backgroundColor: t.c.accent }]} />
            </View>
            <AppText variant="caption" color="textFaint">{`${minutesLeft} ${minutesLeftLabel}`}</AppText>
          </View>
        </View>
        <View style={styles.playBtn}>
          <Icon name="play" size={18} color="onBrand" />
        </View>
      </Card>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: -46, marginHorizontal: 20, zIndex: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 13, padding: 14 },
  cover: { width: 58, height: 58 },
  eyebrow: { fontWeight: "800", letterSpacing: 1 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.greenDeep,
    alignItems: "center",
    justifyContent: "center",
  },
});
