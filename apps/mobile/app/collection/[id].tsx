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
import { durationLabel, type LectureGroup, type Playable } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalogProvider";
import { useDownloads } from "@/lib/downloads";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { MINI_PLAYER_GAP, MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from "@/lib/layout";
import { usePlayer } from "@/lib/player";
import { useTheme } from "@/lib/theme";

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const { t: msgs } = useI18n();
  const { current, isPlaying, progressFor, playCollection } = usePlayer();
  const { download } = useDownloads();
  const { collectionById, lecturesForCollection } = useCatalog();

  const collection = collectionById(id);

  // `lecturesForCollection` is a flat `sort`-ordered list for `series`
  // collections, or `{label, lectures}[]` groups (by `groupLabel`, in
  // first-appearance order) for `occasion`/`topic`. Flatten it once into a
  // single play-queue order — used for Continue/Play All/Download All and as
  // the queue handed to `playCollection` — while keeping the grouped shape
  // around for rendering occasion/topic sections.
  const raw = useMemo(() => (collection ? lecturesForCollection(collection.id) : []), [collection, lecturesForCollection]);
  const isFlat = collection?.kind === "series";
  const groups = isFlat ? [] : (raw as LectureGroup[]);
  const lectures = useMemo<Playable[]>(
    () => (isFlat ? (raw as Playable[]) : groups.flatMap((g) => g.lectures)),
    [isFlat, raw, groups],
  );
  const indexById = useMemo(() => new Map(lectures.map((l, i) => [l.id, i])), [lectures]);

  // Last-played-with-progress lecture in this collection drives the Continue
  // chip: the one with the highest resume fraction that's neither fresh (0)
  // nor effectively finished (>=0.98).
  const continueIdx = useMemo(() => {
    let idx = -1;
    let best = 0;
    lectures.forEach((l, i) => {
      const p = progressFor(l.id);
      if (p > 0 && p < 0.98 && p > best) {
        best = p;
        idx = i;
      }
    });
    return idx;
  }, [lectures, progressFor]);
  const continueLecture = continueIdx >= 0 ? lectures[continueIdx] : null;
  const continueMinLeft = continueLecture
    ? Math.round(((1 - progressFor(continueLecture.id)) * continueLecture.durSec) / 60)
    : 0;

  if (!collection) {
    return (
      <View style={[styles.missing, { backgroundColor: t.c.bg }]}>
        <StatusBar style={t.scheme === "dark" ? "light" : "dark"} />
        <AppText color="textMuted" style={styles.missingText}>
          {msgs.series.notFound}
        </AppText>
      </View>
    );
  }

  // Tapping a row (or Play All / Continue) loads the *whole collection* as the
  // play queue at that index, so prev/next in the mini-player and full player
  // walk the collection in order. Text lectures still open the reader instead —
  // they never touch the audio queue (README: text never hits the player).
  const openLectureAt = (index: number) => {
    const l = lectures[index];
    if (!l) return;
    if (l.type === "text") {
      router.push(`/reader/${l.id}`);
      return;
    }
    playCollection(lectures, index);
    router.push("/player");
  };

  const gradient = collection.cover.gradient;

  const renderRow = (l: Playable, i: number) => {
    const isCurrent = current?.id === l.id;
    const progress = progressFor(l.id);
    const played = !isCurrent && progress >= 0.98;
    const inProgress = !isCurrent && progress > 0 && progress < 0.98;

    return (
      <View
        key={l.id}
        style={[
          styles.lectureRow,
          { borderTopColor: t.c.borderSubtle },
          isCurrent ? { backgroundColor: "rgba(199,154,59,0.12)" } : null,
        ]}
      >
        <Touchable onPress={() => openLectureAt(i)} style={styles.lectureMain}>
          <View style={[styles.numChip, { backgroundColor: t.c.surfaceAlt }]}>
            <AppText style={styles.numChipText} color={t.c.accent}>
              {i + 1}
            </AppText>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText
              style={styles.lectureTitle}
              color={isCurrent ? "accent" : "textPrimary"}
              numberOfLines={1}
            >
              {l.title}
            </AppText>
            <View style={styles.lectureMeta}>
              <MediaBadge type={l.type} />
              {played ? (
                <View style={styles.playedMeta}>
                  <Icon name="check-circle" size={11} color="textFaint" />
                  <AppText style={styles.lectureDur} color="textFaint">
                    {msgs.series.played}
                  </AppText>
                </View>
              ) : (
                <AppText style={styles.lectureDur} color="textMuted">
                  {durationLabel(l)}
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
        </Touchable>
        <View style={styles.trailing}>
          {isCurrent ? <EqBars playing={isPlaying} /> : null}
          {l.type !== "text" ? <DownloadButton lecture={l} size={18} /> : null}
        </View>
      </View>
    );
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
            colors={[gradient[0], gradient[1]]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <AppText allowFontScaling={false} style={styles.heroWatermark}>
            {collection.cover.arabic ?? ""}
          </AppText>

          <Touchable onPress={() => router.back()} accessibilityLabel={msgs.common.goBack} style={styles.backBtn}>
            <Icon name="chevron-left" size={20} color="onBrand" />
          </Touchable>

          <View style={styles.kindChip}>
            <AppText color="onBrand" style={styles.kindChipText}>
              {collection.kind}
            </AppText>
          </View>
          <AppText color="onBrand" style={styles.heroTitle}>
            {collection.title}
          </AppText>
          <AppText color="rgba(255,255,255,0.78)" style={styles.heroMeta}>
            {collection.count} {msgs.library.parts} · {collection.language.toUpperCase()}
          </AppText>
          {collection.description ? (
            <AppText color="rgba(255,255,255,0.85)" style={styles.heroDesc}>
              {collection.description}
            </AppText>
          ) : null}

          {continueLecture ? (
            <Touchable
              onPress={() => openLectureAt(continueIdx)}
              haptic="light"
              accessibilityLabel={msgs.home.continueListening}
              style={styles.continueChip}
            >
              <Icon name="play" size={13} color={colors.greenDeep} />
              <AppText style={styles.continueChipText} color={colors.greenDeep}>
                {`${msgs.series.continuePrefix} · ${msgs.series.episodePrefix} ${continueIdx + 1} · ${continueMinLeft} ${msgs.home.minutesLeft}`}
              </AppText>
            </Touchable>
          ) : null}

          <View style={styles.actions}>
            <Touchable
              onPress={() => lectures.length > 0 && openLectureAt(0)}
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
              onPress={() => lectures.filter((l) => l.type !== "text").forEach((l) => download(l))}
              disabled={lectures.length === 0 || lectures.every((l) => l.type === "text")}
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

        {/* Lectures */}
        <View style={styles.listHeader}>
          <AppText color="textPrimary" style={styles.listCount}>
            {msgs.series.allPrefix} {collection.count} {msgs.library.parts}
          </AppText>
          <AppText color={t.c.textMuted} style={styles.newestFirst}>
            {msgs.common.newestFirst}
          </AppText>
        </View>

        {lectures.length === 0 ? (
          <AppText color="textFaint" style={styles.noLectures}>
            {msgs.series.noEpisodesYet}
          </AppText>
        ) : null}

        {isFlat
          ? lectures.map((l, i) => renderRow(l, i))
          : groups.map((g) => (
              <View key={g.label}>
                <View style={styles.groupHeader}>
                  <AppText variant="meta" color="textFaint" style={styles.groupHeaderText}>
                    {g.label}
                  </AppText>
                </View>
                {g.lectures.map((l) => renderRow(l, indexById.get(l.id) ?? 0))}
              </View>
            ))}
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
    textTransform: "capitalize",
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
  noLectures: {
    fontFamily: font.sans.medium,
    fontSize: typePresets.body.fontSize,
    textAlign: "center",
    paddingVertical: 24,
  },
  newestFirst: { fontFamily: font.sans.bold, fontSize: typePresets.caption.fontSize },

  groupHeader: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 4 },
  groupHeaderText: { fontWeight: "700", letterSpacing: 0.4 },

  lectureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  lectureMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    gap: 13,
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
  lectureTitle: { fontFamily: font.serif.semibold, fontSize: typePresets.body.fontSize },
  lectureMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  lectureDur: { fontFamily: font.sans.regular, fontSize: typePresets.caption.fontSize },
  playedMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  progressTrack: { height: 3, borderRadius: 2, overflow: "hidden", marginTop: 6 },
  progressFill: { height: "100%", borderRadius: 2 },
});
