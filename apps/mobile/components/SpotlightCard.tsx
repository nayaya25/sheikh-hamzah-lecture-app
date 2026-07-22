import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography } from "@althaqalayn/theme";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { type Playable } from "@/lib/catalog";
import { useTheme } from "@/lib/theme";

export interface SpotlightCardProps {
  /** The featured "lecture of the day". */
  lecture: Playable;
  /** Gold pill label, e.g. "Lecture of the day". */
  badgeLabel: string;
  /** Call-to-action label, e.g. "Listen now". */
  actionLabel: string;
  /** Meta line under the title (collection · duration). */
  metaLabel?: string;
  /** Arabic watermark glyph (defaults to the lecture's cover glyph). */
  watermark?: string;
  onPress: () => void;
}

/**
 * Featured "lecture of the day" spotlight — a dark-green gradient card with a
 * gold badge, the lecture's Arabic mark, title, meta, and a "Listen" action.
 * Prop-driven so the caller decides which lecture is featured.
 */
export function SpotlightCard({ lecture, badgeLabel, actionLabel, metaLabel, watermark, onPress }: SpotlightCardProps) {
  const t = useTheme();
  const glyph = watermark ?? lecture.ar;
  return (
    <Touchable haptic="light" onPress={onPress} accessibilityLabel={`${badgeLabel}: ${lecture.title}`} style={{ marginHorizontal: t.space.screen }}>
      <LinearGradient
        colors={[colors.greenHighlight, colors.greenDeepest]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[styles.card, { borderRadius: t.radii.hero }]}
      >
        {glyph ? (
          <AppText allowFontScaling={false} style={styles.watermark} numberOfLines={1}>
            {glyph}
          </AppText>
        ) : null}

        <View style={[styles.badge, { backgroundColor: colors.goldLight, borderRadius: t.radii.pill }]}>
          <AppText allowFontScaling={false} color={colors.greenDeepest} style={styles.badgeText}>
            {badgeLabel.toUpperCase()}
          </AppText>
        </View>

        {lecture.ar ? (
          <AppText allowFontScaling={false} color={colors.goldLight} style={styles.arabic} numberOfLines={1}>
            {lecture.ar}
          </AppText>
        ) : null}

        <AppText color="onBrand" style={styles.title} numberOfLines={2}>
          {lecture.title}
        </AppText>

        {metaLabel ? (
          <AppText variant="meta" color="rgba(255,255,255,0.7)" style={{ marginTop: 6 }} numberOfLines={1}>
            {metaLabel}
          </AppText>
        ) : null}

        <View style={[styles.action, { borderRadius: t.radii.pill }]}>
          <Icon name="play" size={14} color="onBrand" />
          <AppText variant="meta" color="onBrand" style={{ fontWeight: "700" }}>
            {actionLabel}
          </AppText>
        </View>
      </LinearGradient>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: { padding: 20, overflow: "hidden" },
  watermark: {
    position: "absolute",
    right: -10,
    bottom: -28,
    fontFamily: typography.fonts.arabic,
    fontSize: 130,
    color: "rgba(228,199,123,0.08)",
  },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  arabic: { fontFamily: typography.fonts.arabic, fontSize: 20, marginTop: 12, textAlign: "right", writingDirection: "rtl" },
  title: { fontFamily: typography.fonts.serif, fontSize: 17, fontWeight: "700", marginTop: 8, lineHeight: 23 },
  action: {
    marginTop: 14,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
});
