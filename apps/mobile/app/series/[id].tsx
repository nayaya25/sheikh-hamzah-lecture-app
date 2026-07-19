import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { MediaBadge } from "@/components/MediaBadge";
import { durationLabel } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalogProvider";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { openLecture } from "@/lib/openLecture";
import { usePlayer } from "@/lib/player";

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { play } = usePlayer();
  const { seriesById, episodesForSeries } = useCatalog();

  const series = seriesById(id);
  if (!series) {
    return (
      <View style={styles.missing}>
        <StatusBar style="dark" />
        <Text style={styles.missingText}>Series not found</Text>
      </View>
    );
  }

  const episodes = episodesForSeries(series);
  const openEpisode = (episodeId: string) => {
    const ep = episodes.find((e) => e.id === episodeId);
    if (ep) openLecture(router, play, ep);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Colored hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
          <LinearGradient
            colors={[series.gradient[0], series.gradient[1]]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.heroWatermark} allowFontScaling={false}>
            {series.ar}
          </Text>

          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="chevron-left" size={20} color="#fff" />
          </Pressable>

          <View style={styles.kindChip}>
            <Text style={styles.kindChipText}>{series.kind}</Text>
          </View>
          <Text style={styles.heroTitle}>{series.title}</Text>
          <Text style={styles.heroMeta}>
            {series.count} {t.library.parts} · {series.media} · {series.lang} · {series.year}
          </Text>
          <Text style={styles.heroDesc}>{series.desc}</Text>

          <View style={styles.actions}>
            <Pressable
              style={styles.playAll}
              onPress={() => episodes[0] && openEpisode(episodes[0].id)}
            >
              <Ionicons name="play" size={16} color={colors.greenDeep} />
              <Text style={styles.playAllText}>{t.common.playAll}</Text>
            </Pressable>
            <Pressable style={styles.downloadAll}>
              <Feather name="download" size={16} color="#fff" />
              <Text style={styles.downloadAllText}>{t.common.downloadAll}</Text>
            </Pressable>
          </View>
        </View>

        {/* Episodes */}
        <View style={styles.listHeader}>
          <Text style={styles.listCount}>
            All {series.count} {t.library.parts}
          </Text>
          <Text style={styles.newestFirst}>{t.common.newestFirst}</Text>
        </View>

        {episodes.map((ep) => (
          <Pressable key={ep.id} style={styles.episodeRow} onPress={() => openEpisode(ep.id)}>
            <View style={styles.numChip}>
              <Text style={styles.numChipText}>{ep.id.split("-").pop()}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.episodeTitle} numberOfLines={1}>
                {ep.title}
              </Text>
              <View style={styles.episodeMeta}>
                <MediaBadge type={ep.type} />
                <Text style={styles.episodeDur}>{durationLabel(ep)}</Text>
              </View>
            </View>
            <Feather name="download" size={20} color={colors.greenMid} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  missing: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.cream },
  missingText: { fontFamily: font.sans.medium, fontSize: 14, color: colors.muted },

  hero: { paddingHorizontal: 18, paddingBottom: 22, overflow: "hidden" },
  heroWatermark: {
    position: "absolute",
    right: -24,
    top: 6,
    fontFamily: font.arabic.regular,
    fontSize: 150,
    color: "rgba(255,255,255,0.1)",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    alignItems: "center",
    justifyContent: "center",
  },
  kindChip: {
    alignSelf: "flex-start",
    marginTop: 20,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  kindChipText: { fontFamily: font.sans.extrabold, fontSize: 10, letterSpacing: 0.8, color: "#fff" },
  heroTitle: { fontFamily: font.serif.semibold, fontSize: 25, color: "#fff", marginTop: 12, lineHeight: 29 },
  heroMeta: { fontFamily: font.sans.regular, fontSize: 12.5, color: "rgba(255,255,255,0.78)", marginTop: 8 },
  heroDesc: { fontFamily: font.sans.regular, fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 12, lineHeight: 20, maxWidth: 300 },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  playAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  playAllText: { fontFamily: font.sans.bold, fontSize: 13.5, color: colors.greenDeep },
  downloadAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  downloadAllText: { fontFamily: font.sans.bold, fontSize: 13.5, color: "#fff" },

  listHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 8,
  },
  listCount: { fontFamily: font.serif.semibold, fontSize: 16, color: colors.ink },
  newestFirst: { fontFamily: font.sans.bold, fontSize: 11.5, color: colors.greenMid },

  episodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: "#EFE8D8",
  },
  numChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEF4F1",
    alignItems: "center",
    justifyContent: "center",
  },
  numChipText: { fontFamily: font.sans.extrabold, fontSize: 13, color: colors.greenMid },
  episodeTitle: { fontFamily: font.serif.semibold, fontSize: 14, color: colors.ink },
  episodeMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  episodeDur: { fontFamily: font.sans.regular, fontSize: 11, color: colors.mutedAlt },
});
