import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typePresets } from "@althaqalayn/theme";
import { DownloadButton } from "@/components/DownloadButton";
import { EqBars } from "@/components/EqBars";
import { MediaBadge } from "@/components/MediaBadge";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { durationLabel } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalogProvider";
import { useDownloads } from "@/lib/downloads";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { MINI_PLAYER_GAP, MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from "@/lib/layout";
import { usePlayer } from "@/lib/player";
import { useTheme } from "@/lib/theme";

export default function SeriesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const { t: msgs } = useI18n();
  const { current, isPlaying, progressFor, playSeries } = usePlayer();
  const { download } = useDownloads();
  const { seriesById, episodesForSeries } = useCatalog();

  const series = seriesById(id);
  const episodes = useMemo(
    () => (series ? episodesForSeries(series) : []),
    [series, episodesForSeries],
  );

  // Last-played-with-progress episode in this series drives the Continue chip:
  // the one with the highest resume fraction that's neither fresh (0) nor
  // effectively finished (>=0.98).
  const continueIdx = useMemo(() => {
    let idx = -1;
    let best = 0;
    episodes.forEach((ep, i) => {
      const p = progressFor(ep.id);
      if (p > 0 && p < 0.98 && p > best) {
        best = p;
        idx = i;
      }
    });
    return idx;
  }, [episodes, progressFor]);
  const continueEp = continueIdx >= 0 ? episodes[continueIdx] : null;
  const continueMinLeft = continueEp
    ? Math.round(((1 - progressFor(continueEp.id)) * continueEp.durSec) / 60)
    : 0;

  if (!series) {
    return (
      <View style={[styles.missing, { backgroundColor: t.c.bg }]}>
        <StatusBar style="dark" />
        <AppText color="textMuted" style={styles.missingText}>
          Series not found
        </AppText>
      </View>
    );
  }

  // Tapping a row (or Play All / Continue) loads the *whole series* as the
  // play queue at that index, so prev/next in the mini-player and full player
  // walk the series in order. Text lectures still open the reader instead —
  // they never touch the audio queue (README: text never hits the player).
  const openEpisodeAt = (index: number) => {
    const ep = episodes[index];
    if (!ep) return;
    if (ep.type === "text") {
      router.push(`/reader/${ep.id}`);
      return;
    }
    playSeries(episodes, index);
    router.push("/player");
  };

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + TAB_BAR_HEIGHT + MINI_PLAYER_GAP + MINI_PLAYER_HEIGHT + t.space.lg,
        }}
      >
        {/* Colored hero */}
        <View style={[styles.hero, { paddingTop: insets.top + t.space.md }]}>
          <LinearGradient
            colors={[series.gradient[0], series.gradient[1]]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppText allowFontScaling={false} style={styles.heroWatermark}>
            {series.ar}
          </AppText>

          <Touchable onPress={() => router.back()} accessibilityLabel="Go back" style={styles.backBtn}>
            <Icon name="chevron-left" size={20} color="onBrand" />
          </Touchable>

          <View style={styles.kindChip}>
            <AppText color="onBrand" style={styles.kindChipText}>
              {series.kind}
            </AppText>
          </View>
          <AppText color="onBrand" style={styles.heroTitle}>
            {series.title}
          </AppText>
          <AppText color="rgba(255,255,255,0.78)" style={styles.heroMeta}>
            {series.count} {msgs.library.parts} · {series.media} · {series.lang} · {series.year}
          </AppText>
          <AppText color="rgba(255,255,255,0.85)" style={styles.heroDesc}>
            {series.desc}
          </AppText>

          {continueEp ? (
            <Touchable
              onPress={() => openEpisodeAt(continueIdx)}
              haptic="light"
              accessibilityLabel="Continue listening"
              style={styles.continueChip}
            >
              <Icon name="play" size={13} color={colors.greenDeep} />
              <AppText style={styles.continueChipText} color={colors.greenDeep}>
                {`Continue · Ep ${continueEp.episode ?? continueIdx + 1} · ${continueMinLeft} min left`}
              </AppText>
            </Touchable>
          ) : null}

          <View style={styles.actions}>
            <Touchable
              onPress={() => episodes.length > 0 && openEpisodeAt(0)}
              haptic="light"
              accessibilityLabel={msgs.common.playAll}
              style={styles.playAll}
            >
              <Icon name="play" size={16} color={colors.greenDeep} />
              <AppText style={styles.playAllText} color={colors.greenDeep}>
                {msgs.common.playAll}
              </AppText>
            </Touchable>
            <Touchable
              onPress={() => episodes.filter((ep) => ep.type !== "text").forEach((ep) => download(ep))}
              disabled={episodes.length === 0 || episodes.every((ep) => ep.type === "text")}
              haptic="light"
              accessibilityLabel={msgs.common.downloadAll}
              style={styles.downloadAll}
            >
              <Icon name="download" size={16} color="onBrand" />
              <AppText style={styles.downloadAllText} color="onBrand">
                {msgs.common.downloadAll}
              </AppText>
            </Touchable>
          </View>
        </View>

        {/* Episodes */}
        <View style={styles.listHeader}>
          <AppText color="textPrimary" style={styles.listCount}>
            All {series.count} {msgs.library.parts}
          </AppText>
          <AppText color={t.c.textMuted} style={styles.newestFirst}>
            {msgs.common.newestFirst}
          </AppText>
        </View>

        {episodes.length === 0 ? (
          <AppText color="textFaint" style={styles.noEpisodes}>
            No episodes published yet.
          </AppText>
        ) : null}
        {episodes.map((ep, i) => {
          const isCurrent = current?.id === ep.id;
          const progress = progressFor(ep.id);
          const played = !isCurrent && progress >= 0.98;
          const inProgress = !isCurrent && progress > 0 && progress < 0.98;

          return (
            <Touchable
              key={ep.id}
              onPress={() => openEpisodeAt(i)}
              style={[
                styles.episodeRow,
                { borderTopColor: t.c.borderSubtle },
                isCurrent ? { backgroundColor: "rgba(199,154,59,0.12)" } : null,
              ]}
            >
              <View style={[styles.numChip, { backgroundColor: t.c.surfaceAlt }]}>
                <AppText style={styles.numChipText} color={t.c.accent}>
                  {ep.episode ?? i + 1}
                </AppText>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText
                  style={styles.episodeTitle}
                  color={isCurrent ? "accent" : "textPrimary"}
                  numberOfLines={1}
                >
                  {ep.title}
                </AppText>
                <View style={styles.episodeMeta}>
                  <MediaBadge type={ep.type} />
                  {played ? (
                    <View style={styles.playedMeta}>
                      <Icon name="check-circle" size={11} color="textFaint" />
                      <AppText style={styles.episodeDur} color="textFaint">
                        Played
                      </AppText>
                    </View>
                  ) : (
                    <AppText style={styles.episodeDur} color="textMuted">
                      {durationLabel(ep)}
                    </AppText>
                  )}
                </View>
                {inProgress ? (
                  <View style={[styles.progressTrack, { backgroundColor: t.c.trackInactive }]}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.gold },
                      ]}
                    />
                  </View>
                ) : null}
              </View>
              <View style={styles.trailing}>
                {isCurrent ? <EqBars playing={isPlaying} /> : null}
                {ep.type !== "text" ? <DownloadButton lecture={ep} size={18} /> : null}
              </View>
            </Touchable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  missing: { flex: 1, alignItems: "center", justifyContent: "center" },
  missingText: { fontFamily: font.sans.medium, fontSize: typePresets.body.fontSize },

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
  kindChipText: {
    fontFamily: font.sans.extrabold,
    fontSize: typePresets.caption.fontSize,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontFamily: font.serif.semibold,
    fontSize: typePresets.screen.fontSize,
    lineHeight: typePresets.screen.lineHeight,
    marginTop: 12,
  },
  heroMeta: { fontFamily: font.sans.regular, fontSize: typePresets.meta.fontSize, marginTop: 8 },
  heroDesc: {
    fontFamily: font.sans.regular,
    fontSize: typePresets.body.fontSize,
    lineHeight: typePresets.body.lineHeight,
    marginTop: 12,
    maxWidth: 300,
  },
  continueChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.goldLight,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 14,
  },
  continueChipText: { fontFamily: font.sans.bold, fontSize: typePresets.meta.fontSize },
  actions: { flexDirection: "row", gap: 10, marginTop: 16 },
  playAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  playAllText: { fontFamily: font.sans.bold, fontSize: typePresets.meta.fontSize + 1 },
  downloadAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  downloadAllText: { fontFamily: font.sans.bold, fontSize: typePresets.meta.fontSize + 1 },

  listHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 8,
  },
  listCount: { fontFamily: font.serif.semibold, fontSize: typePresets.cardTitle.fontSize },
  noEpisodes: {
    fontFamily: font.sans.medium,
    fontSize: typePresets.body.fontSize,
    textAlign: "center",
    paddingVertical: 24,
  },
  newestFirst: { fontFamily: font.sans.bold, fontSize: typePresets.caption.fontSize },

  episodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  numChip: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  numChipText: { fontFamily: font.sans.extrabold, fontSize: typePresets.meta.fontSize },
  trailing: { flexDirection: "row", alignItems: "center", gap: 10 },
  episodeTitle: { fontFamily: font.serif.semibold, fontSize: typePresets.body.fontSize },
  episodeMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  episodeDur: { fontFamily: font.sans.regular, fontSize: typePresets.caption.fontSize },
  playedMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  progressTrack: { height: 3, borderRadius: 2, overflow: "hidden", marginTop: 6 },
  progressFill: { height: "100%", borderRadius: 2 },
});
