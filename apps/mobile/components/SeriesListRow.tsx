import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "@althaqalayn/theme";
import { GradientCover } from "@/components/GradientCover";
import type { SampleSeries } from "@/lib/catalog";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";

/** Series row for Library's Occasions/Topics/Series segments: cover + kind + meta. */
export function SeriesListRow({ series, onPress }: { series: SampleSeries; onPress?: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <GradientCover gradient={series.gradient} style={styles.cover}>
        <Text style={styles.ar} allowFontScaling={false}>
          {series.ar}
        </Text>
      </GradientCover>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.kind}>{series.kind}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {series.title}
        </Text>
        <Text style={styles.meta}>
          {series.count} {t.library.parts} · {series.media} · {series.year}
        </Text>
      </View>
      <Feather name="chevron-right" size={20} color="#c4ccc5" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  cover: { width: 70, height: 70, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  ar: { fontFamily: font.arabic.regular, fontSize: 30, color: "rgba(255,255,255,0.9)" },
  kind: { fontFamily: font.sans.extrabold, fontSize: 9.5, letterSpacing: 0.6, color: colors.gold },
  title: { fontFamily: font.serif.semibold, fontSize: 15, color: colors.ink, marginTop: 3, lineHeight: 18 },
  meta: { fontFamily: font.sans.regular, fontSize: 11.5, color: colors.mutedAlt, marginTop: 4 },
});
