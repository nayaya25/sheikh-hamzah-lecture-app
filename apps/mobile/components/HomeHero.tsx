import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography } from "@althaqalayn/theme";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { MosqueSilhouette } from "@/components/MosqueSilhouette";
import { useTheme } from "@/lib/theme";

export interface HomeHeroProps {
  /** Arabic salutation kicker (rendered in the Amiri serif). */
  greeting: string;
  /** Serif welcome / brand line. */
  title: string;
  /** "Powered by" caption. */
  poweredByLabel: string;
  /** Foundation name (gold accent). */
  foundationName: string;
  /** Arabic verse (Amiri serif, gold). */
  verseArabic: string;
  /** English gloss beneath the verse. */
  verseTranslation: string;
  /** Safe-area top inset, applied as top padding. */
  topInset: number;
  /** Settings affordance — preserves the route previously reached from the header emblem. */
  onPressSettings?: () => void;
  settingsLabel?: string;
}

/**
 * Green gradient home header: greeting + "Powered by Althaqalayn Cultural Foundation",
 * a soft gold crescent, a subtle dotted pattern, a mosque silhouette along the
 * base, and the صدقة جارية verse. All decoration is drawn with RN primitives
 * (gradient + Views) so it themes to the brand greens without extra deps.
 */
export function HomeHero({
  greeting,
  title,
  poweredByLabel,
  foundationName,
  verseArabic,
  verseTranslation,
  topInset,
  onPressSettings,
  settingsLabel = "Settings",
}: HomeHeroProps) {
  const t = useTheme();
  return (
    <LinearGradient
      colors={[colors.greenHighlight, colors.greenMid, colors.greenDeepest]}
      locations={[0, 0.45, 1]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.7, y: 1 }}
      style={[
        styles.hero,
        {
          paddingTop: topInset + t.space.lg,
          borderBottomLeftRadius: t.radii.hero,
          borderBottomRightRadius: t.radii.hero,
        },
      ]}
    >
      <DotPattern />
      <Crescent />
      <View style={styles.silhouette} pointerEvents="none">
        <MosqueSilhouette color="rgba(4,24,18,0.28)" height={92} />
      </View>

      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <AppText allowFontScaling={false} color={colors.goldLight} style={styles.greeting}>
            {greeting}
          </AppText>
          <AppText variant="screen" color="onBrand" style={{ marginTop: 3 }} numberOfLines={1}>
            {title}
          </AppText>
        </View>
        <View style={styles.topRight}>
          {onPressSettings ? (
            <Touchable
              haptic="light"
              onPress={onPressSettings}
              accessibilityLabel={settingsLabel}
              style={[styles.settingsBtn, { borderRadius: t.radii.pill }]}
            >
              <Icon name="settings" size={17} color="rgba(255,255,255,0.9)" />
            </Touchable>
          ) : null}
          <AppText variant="caption" color="rgba(255,255,255,0.6)" style={styles.poweredKicker}>
            {poweredByLabel}
          </AppText>
          <AppText allowFontScaling={false} color={colors.goldLight} style={styles.poweredName}>
            {foundationName}
          </AppText>
        </View>
      </View>

      <View style={styles.verse}>
        <AppText allowFontScaling={false} color={colors.goldLight} style={styles.verseArabic}>
          {verseArabic}
        </AppText>
        <AppText variant="meta" color="rgba(255,255,255,0.72)" style={styles.verseTr}>
          {verseTranslation}
        </AppText>
      </View>
    </LinearGradient>
  );
}

/** Semi-transparent gold disc with a carved crescent, echoing the prototype's moon. */
function Crescent() {
  return (
    <View style={styles.crescentWrap} pointerEvents="none">
      <View style={styles.crescentMoon} />
      <View style={styles.crescentCut} />
    </View>
  );
}

/** A faint grid of dots — the "subtle dotted pattern" from the hero spec. */
const DOT_ROWS = 6;
const DOT_COLS = 12;
function DotPattern() {
  return (
    <View style={styles.dots} pointerEvents="none">
      {Array.from({ length: DOT_ROWS }).map((_, r) => (
        <View key={r} style={styles.dotRow}>
          {Array.from({ length: DOT_COLS }).map((__, c) => (
            <View key={c} style={styles.dot} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 64, overflow: "hidden" },

  dots: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "space-evenly", opacity: 0.5 },
  dotRow: { flexDirection: "row", justifyContent: "space-evenly" },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.5)" },

  crescentWrap: { position: "absolute", right: 22, top: 6, width: 60, height: 52, opacity: 0.5 },
  crescentMoon: { position: "absolute", right: 0, top: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.goldLight },
  crescentCut: { position: "absolute", right: 12, top: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.greenDeepest },

  topRow: { position: "relative", zIndex: 3, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  greeting: { fontFamily: typography.fonts.arabic, fontSize: 17, letterSpacing: 0.3 },
  topRight: { alignItems: "flex-end", gap: 2 },
  settingsBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 4,
  },
  poweredKicker: { fontSize: 10 },
  poweredName: { fontFamily: typography.fonts.sans, fontSize: 11.5, fontWeight: "800" },

  verse: { position: "relative", zIndex: 3, marginTop: 20 },
  verseArabic: { fontFamily: typography.fonts.arabic, fontSize: 24, lineHeight: 40, textAlign: "right", writingDirection: "rtl" },
  verseTr: { marginTop: 6, fontStyle: "italic" },

  silhouette: { position: "absolute", left: 0, right: 0, bottom: 0 },
});
