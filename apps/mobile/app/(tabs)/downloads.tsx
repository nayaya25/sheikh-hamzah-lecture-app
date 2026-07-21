import { useMemo } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { typography } from "@althaqalayn/theme";
import { DownloadButton } from "@/components/DownloadButton";
import { MediaBadge } from "@/components/MediaBadge";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { CoverArt } from "@/components/ui/CoverArt";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { formatBytes, type Playable } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalogProvider";
import { useDownloads } from "@/lib/downloads";
import { useI18n } from "@/lib/i18n";
import { MINI_PLAYER_GAP, MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from "@/lib/layout";
import { openLecture } from "@/lib/openLecture";
import { usePlayer } from "@/lib/player";
import type { DownloadEntry } from "@/lib/reducers/downloads";
import { downloadedIds, totalBytes } from "@/lib/reducers/downloads";
import { useTheme } from "@/lib/theme";

export default function DownloadsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const { t: msgs, arabic } = useI18n();
  const { play } = usePlayer();
  const { lectureById } = useCatalog();
  const { state, clearAll } = useDownloads();

  // Active (queued/downloading) entries, resolved against the catalog for a
  // title/sub — see `useCatalog().lectureById`, the same id→Playable lookup
  // Home uses to resolve "continue listening" from a saved id.
  const active = useMemo(
    () => Object.values(state).filter((e) => e.status === "queued" || e.status === "downloading"),
    [state],
  );
  const downloaded = useMemo(
    () =>
      downloadedIds(state)
        .map((id) => lectureById(id))
        .filter((l): l is Playable => Boolean(l)),
    [state, lectureById],
  );
  // A downloaded id whose lecture no longer resolves in the catalog (deleted
  // or unpublished) still occupies storage. Don't drop it silently — give it
  // a generic row so it stays individually removable (see OrphanedDownloadRow).
  const orphanedIds = useMemo(
    () => downloadedIds(state).filter((id) => !lectureById(id)),
    [state, lectureById],
  );

  const bytes = totalBytes(state);
  const hasAny = active.length > 0 || downloaded.length > 0 || orphanedIds.length > 0;
  const bottomPadding = insets.bottom + TAB_BAR_HEIGHT + MINI_PLAYER_GAP + MINI_PLAYER_HEIGHT + t.space.lg;
  const statusBarStyle = t.scheme === "dark" ? "light" : "dark";

  const openDownload = (lecture: Playable) => openLecture(router, play, lecture);

  const onClearAll = () => {
    Alert.alert(
      msgs.downloads.clearAllTitle,
      msgs.downloads.clearAllBody,
      [
        { text: msgs.common.cancel, style: "cancel" },
        { text: msgs.downloads.clearAll, style: "destructive", onPress: () => clearAll() },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <StatusBar style={statusBarStyle} />
      <View style={[styles.header, { paddingTop: insets.top + t.space.lg, paddingHorizontal: t.space.screen }]}>
        <AppText variant="screen">{msgs.downloads.title}</AppText>
        <AppText allowFontScaling={false} color="accent" style={{ fontFamily: typography.fonts.arabic, fontSize: 19 }}>
          {arabic.downloads}
        </AppText>
      </View>

      {!hasAny ? (
        <EmptyState
          icon="download-cloud"
          title={msgs.downloads.empty}
          body={msgs.downloads.offlineBody}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>
          {active.length > 0 ? (
            <>
              <SectionLabel>{`${msgs.download.downloading} (${active.length})`}</SectionLabel>
              <View>
                {active.map((e) => (
                  <DownloadingRow key={e.id} entry={e} lecture={lectureById(e.id)} />
                ))}
              </View>
            </>
          ) : null}

          {downloaded.length > 0 || orphanedIds.length > 0 ? (
            <>
              <SectionLabel>{`${msgs.download.downloaded} (${downloaded.length + orphanedIds.length})`}</SectionLabel>
              <View>
                {downloaded.map((lecture) => (
                  <DownloadedRow key={lecture.id} lecture={lecture} onPress={() => openDownload(lecture)} />
                ))}
                {orphanedIds.map((id) => (
                  <OrphanedDownloadRow key={id} id={id} />
                ))}
              </View>
            </>
          ) : null}

          <Card style={{ ...styles.footer, marginHorizontal: t.space.screen }}>
            <View style={styles.footerInfo}>
              <Icon name="hard-drive" size={16} color="textMuted" />
              <AppText variant="body" color="textMuted">
                {formatBytes(bytes)} {msgs.downloads.storageUsed}
              </AppText>
            </View>
            <Touchable
              haptic="light"
              onPress={onClearAll}
              disabled={downloaded.length === 0 && orphanedIds.length === 0}
              accessibilityLabel={msgs.downloads.clearAllA11y}
              style={{ opacity: downloaded.length === 0 && orphanedIds.length === 0 ? 0.4 : 1 }}
            >
              <AppText variant="body" color="accent" style={styles.clearAll}>
                {msgs.downloads.clearAll}
              </AppText>
            </Touchable>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

/** Section heading, matching the Search screen's section labels. */
function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  return (
    <AppText variant="section" style={{ fontSize: 15, paddingHorizontal: t.space.screen - 2, paddingTop: t.space.xl, paddingBottom: t.space.md }}>
      {children}
    </AppText>
  );
}

/** A queued/downloading entry: title (once the catalog resolves it) + a progress bar. */
function DownloadingRow({ entry, lecture }: { entry: DownloadEntry; lecture?: Playable }) {
  const t = useTheme();
  const { t: msgs } = useI18n();
  const pct = Math.round(entry.progress * 100);
  return (
    <View style={styles.downloadingRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="cardTitle" numberOfLines={1} style={{ fontSize: 14 }}>
          {lecture?.title ?? msgs.downloads.resolvingTitle}
        </AppText>
        <View style={[styles.track, { backgroundColor: t.c.trackInactive, marginTop: t.space.sm }]}>
          <View
            style={[
              styles.trackFill,
              { backgroundColor: t.c.accent, width: `${Math.max(4, pct)}%` },
            ]}
          />
        </View>
      </View>
      <AppText variant="caption" color="textMuted" style={styles.pct}>
        {entry.status === "queued" ? msgs.download.queued : `${pct}%`}
      </AppText>
    </View>
  );
}

/** A downloaded lecture: tap plays it; trailing `DownloadButton` confirms + removes. */
function DownloadedRow({ lecture, onPress }: { lecture: Playable; onPress: () => void }) {
  const t = useTheme();
  return (
    <Touchable haptic="light" onPress={onPress} style={styles.row}>
      <CoverArt
        gradient={lecture.gradient ? [lecture.gradient[0], lecture.gradient[1]] : undefined}
        glyph={lecture.ar}
        size={52}
        radius={t.radii.md}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <MediaBadge type={lecture.type} />
        <AppText variant="cardTitle" numberOfLines={1} style={{ fontSize: 14, marginTop: 3 }}>
          {lecture.title}
        </AppText>
        <AppText variant="meta" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
          {lecture.sub}
        </AppText>
      </View>
      <DownloadButton lecture={lecture} size={20} />
    </Touchable>
  );
}

/**
 * A downloaded id that no longer resolves to a catalog lecture (deleted or
 * unpublished on the backend). Its bytes still count toward storage-used, so
 * it gets a neutral title + size (when known) + a standalone remove control
 * — every downloaded id must stay individually removable (Fix 2).
 */
function OrphanedDownloadRow({ id }: { id: string }) {
  const t = useTheme();
  const { t: msgs } = useI18n();
  const { entry, remove } = useDownloads();
  const bytes = entry(id)?.bytes;

  const onRemove = () => {
    Alert.alert(msgs.download.removeTitle, `"${msgs.downloads.unknownItem}" ${msgs.download.removeBodySuffix}`, [
      { text: msgs.common.cancel, style: "cancel" },
      { text: msgs.download.remove, style: "destructive", onPress: () => remove(id) },
    ]);
  };

  return (
    <View style={styles.row}>
      <View style={[styles.orphanIcon, { backgroundColor: t.c.surfaceAlt, borderRadius: t.radii.md }]}>
        <Icon name="file" size={22} color="textFaint" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="cardTitle" numberOfLines={1} style={{ fontSize: 14 }}>
          {msgs.downloads.unknownItem}
        </AppText>
        {typeof bytes === "number" ? (
          <AppText variant="meta" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
            {formatBytes(bytes)}
          </AppText>
        ) : null}
      </View>
      <Touchable
        haptic="light"
        onPress={onRemove}
        hitSlop={8}
        accessibilityLabel={msgs.download.remove}
      >
        <Icon name="trash-2" size={20} color="textFaint" />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, paddingVertical: 11 },
  orphanIcon: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  downloadingRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, paddingVertical: 11 },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  trackFill: { height: "100%", borderRadius: 2 },
  pct: { width: 46, textAlign: "right" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  footerInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  clearAll: { fontWeight: "600" },
});
