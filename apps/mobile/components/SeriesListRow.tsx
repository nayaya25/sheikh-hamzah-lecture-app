import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { GradientCover } from "@/components/GradientCover";
import type { SampleSeries } from "@/lib/catalog";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

/** Series row for Library's Occasions/Topics/Series segments: cover + kind + meta. */
export function SeriesListRow({ series, onPress }: { series: SampleSeries; onPress?: () => void }) {
  const t = useTheme();
  const { t: msgs } = useI18n();
  return (
    <Pressable style={[styles.row, { backgroundColor: t.c.surface, borderColor: t.c.border }]} onPress={onPress}>
      <GradientCover gradient={series.gradient} style={styles.cover}>
        <Text style={styles.ar} allowFontScaling={false}>
          {series.ar}
        </Text>
      </GradientCover>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.kind, { color: t.c.accent }]}>{series.kind}</Text>
        <Text style={[styles.title, { color: t.c.textPrimary }]} numberOfLines={2}>
          {series.title}
        </Text>
        <Text style={[styles.meta, { color: t.c.textMuted }]}>
          {series.count} {msgs.library.parts} · {series.media} · {series.year}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color={t.c.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  cover: { width: 70, height: 70, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  ar: { fontFamily: font.arabic.regular, fontSize: 30, color: "rgba(255,255,255,0.9)" },
  kind: { fontFamily: font.sans.extrabold, fontSize: 9.5, letterSpacing: 0.6 },
  title: { fontFamily: font.serif.semibold, fontSize: 15, marginTop: 3, lineHeight: 18 },
  meta: { fontFamily: font.sans.regular, fontSize: 11.5, marginTop: 4 },
});
