import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { typography } from "@althaqalayn/theme";
import type { CollectionKind } from "@althaqalayn/types";
import { CollectionCard } from "@/components/CollectionCard";
import { LectureListRow } from "@/components/LectureListRow";
import { SearchField } from "@/components/SearchField";
import { AppText } from "@/components/ui/AppText";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { InlineErrorBanner } from "@/components/ui/InlineErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Touchable } from "@/components/ui/Touchable";
import { useBookmarks } from "@/lib/bookmarks";
import { durationLabel, type CollectionVM, type Playable } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalogProvider";
import { useI18n } from "@/lib/i18n";
import { MINI_PLAYER_GAP, MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from "@/lib/layout";
import { openLecture } from "@/lib/openLecture";
import { usePlayer } from "@/lib/player";
import { useTheme } from "@/lib/theme";

// The three collection-kind segments, plus the bookmarked-lectures "Saved" segment.
type Segment = CollectionKind | "saved";
const KIND_SEGMENTS: CollectionKind[] = ["occasion", "series", "topic"];

// 2-column cover-card grid metrics (matches the prototype's .cgrid: 20px gutters, 14px gap).
const GRID_GAP = 14;

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams<{ segment?: string }>();
  const t = useTheme();
  const { t: msgs, arabic } = useI18n();
  const { play, playCollection } = usePlayer();
  const { collections, loading, error, refetch, lectureById, lecturesForCollection } = useCatalog();
  const { ids: bookmarkIds } = useBookmarks();

  const [segment, setSegment] = useState<Segment>("occasion");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Adopt an incoming ?segment= (e.g. tapping a "Browse by kind" tile on Home).
  useEffect(() => {
    if (params.segment && (KIND_SEGMENTS as string[]).includes(params.segment)) {
      setSegment(params.segment as Segment);
    } else if (params.segment === "saved") {
      setSegment("saved");
    }
  }, [params.segment]);

  // Collapsing the field also clears the query — closed search means "not filtering".
  const toggleSearch = () => {
    setSearchOpen((open) => {
      if (open) setQuery("");
      return !open;
    });
  };

  const q = query.trim().toLowerCase();

  // Static per-segment totals (independent of the current query) — a quick
  // sense of how much lives in each segment before picking it.
  const segmentCounts = useMemo(
    () => ({
      occasion: collections.filter((c) => c.kind === "occasion").length,
      series: collections.filter((c) => c.kind === "series").length,
      topic: collections.filter((c) => c.kind === "topic").length,
      saved: bookmarkIds.length,
    }),
    [collections, bookmarkIds],
  );

  const segmentChips: { key: Segment; label: string }[] = [
    { key: "occasion", label: `${msgs.library.occasions} (${segmentCounts.occasion})` },
    { key: "series", label: `${msgs.library.series} (${segmentCounts.series})` },
    { key: "topic", label: `${msgs.library.topics} (${segmentCounts.topic})` },
    { key: "saved", label: `${msgs.library.saved} (${segmentCounts.saved})` },
  ];

  const collectionRows = useMemo(() => {
    if (segment === "saved") return [];
    return collections
      .filter((c) => c.kind === segment)
      .filter((c) => !q || c.title.toLowerCase().includes(q));
  }, [segment, q, collections]);

  const savedLectures = useMemo(() => {
    return bookmarkIds
      .map((id) => lectureById(id))
      .filter((l): l is Playable => Boolean(l))
      .filter((l) => !q || `${l.title} ${l.sub}`.toLowerCase().includes(q));
  }, [bookmarkIds, lectureById, q]);

  const openById = (lectureId: string) => {
    const lecture = lectureById(lectureId);
    if (lecture) openLecture(router, lecture, { play, playCollection, lecturesForCollection });
  };

  const isSaved = segment === "saved";
  const hasData = collections.length > 0 || bookmarkIds.length > 0;
  const showSkeleton = loading && !hasData;
  const bottomPadding = TAB_BAR_HEIGHT + insets.bottom + MINI_PLAYER_GAP + MINI_PLAYER_HEIGHT + t.space.lg;
  const statusBarStyle = t.scheme === "dark" ? "light" : "dark";
  // Background refetch failed but we still have cached data — keep the lists
  // on screen with a small inline banner instead of a full-screen EmptyState.
  const showInlineError = Boolean(error) && hasData;
  const cardWidth = (winW - t.space.screen * 2 - GRID_GAP) / 2;

  const emptyTitle = (isCollections: boolean) =>
    q ? msgs.library.noMatches : isCollections ? msgs.library.nothingHereYet : msgs.library.noLecturesYet;

  const header = (
    <>
      <View style={[styles.header, { paddingTop: insets.top + t.space.lg, paddingHorizontal: t.space.screen }]}>
        <AppText variant="screen">{msgs.library.title}</AppText>
        <AppText allowFontScaling={false} color="accent" style={{ fontFamily: typography.fonts.arabic, fontSize: 19 }}>
          {arabic.library}
        </AppText>
      </View>

      <View style={styles.segmentRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.segmentScroll} contentContainerStyle={styles.segmentScrollContent}>
          {segmentChips.map((c) => (
            <Chip key={c.key} label={c.label} active={c.key === segment} onPress={() => setSegment(c.key)} />
          ))}
        </ScrollView>
        <Touchable
          haptic="light"
          onPress={toggleSearch}
          accessibilityLabel={searchOpen ? msgs.library.closeSearchA11y : msgs.library.filterListA11y}
          style={[styles.searchToggle, { backgroundColor: searchOpen ? t.c.surfaceAlt : "transparent", borderRadius: t.radii.pill }]}
        >
          <Icon name={searchOpen ? "x" : "search"} size={19} color={searchOpen ? "accent" : "textMuted"} />
        </Touchable>
      </View>

      {searchOpen ? (
        <View style={styles.searchWrap}>
          <SearchField value={query} onChangeText={setQuery} placeholder={msgs.library.filterPlaceholder} autoFocus />
        </View>
      ) : null}

      {showInlineError ? <InlineErrorBanner message={error as string} onRetry={() => void refetch()} /> : null}
    </>
  );

  // Full-screen error state only when there's nothing cached to fall back on;
  // otherwise the lists render below with the inline banner from `header`.
  if (error && !hasData) {
    return (
      <View style={[styles.root, { backgroundColor: t.c.bg }]}>
        <StatusBar style={statusBarStyle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>
          {header}
          <EmptyState
            icon="alert-triangle"
            title={msgs.library.couldntLoad}
            body={error}
            action={{ label: msgs.common.retry, onPress: () => void refetch() }}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <StatusBar style={statusBarStyle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>
        {header}
        {showSkeleton ? (
          isSaved ? <LectureRowSkeleton /> : <CollectionGridSkeleton cardWidth={cardWidth} />
        ) : isSaved ? (
          savedLectures.length === 0 ? (
            <EmptyState
              icon="bookmark"
              title={q ? msgs.library.noMatches : msgs.library.noSavedLecturesYet}
            />
          ) : (
            <View>
              {savedLectures.map((l) => (
                <LectureListRow key={l.id} lecture={l} meta={durationLabel(l)} onPress={() => openById(l.id)} />
              ))}
            </View>
          )
        ) : (
          collectionRows.length === 0 ? (
            <View style={styles.collectionsWrap}>
              <EmptyState icon="folder" title={emptyTitle(true)} />
            </View>
          ) : (
            <View style={styles.grid}>
              {collectionRows.map((c: CollectionVM) => (
                <CollectionCard
                  key={c.id}
                  title={c.title}
                  kind={c.kind}
                  gradient={c.cover.gradient}
                  arabic={c.cover.arabic}
                  meta={`${c.count} ${msgs.library.parts} · ${c.language.toUpperCase()}`}
                  width={cardWidth}
                  style={{ marginBottom: GRID_GAP }}
                  onPress={() => router.push(`/collection/${c.id}`)}
                />
              ))}
            </View>
          )
        )}
      </ScrollView>
    </View>
  );
}

/** Loading placeholders shaped like the lecture row, so the layout doesn't jump once data arrives. */
function LectureRowSkeleton() {
  const t = useTheme();
  return (
    <View>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={styles.lectureSkeletonRow}>
          <Skeleton width={56} height={56} radius={t.radii.md} />
          <View style={{ flex: 1, gap: t.space.xs }}>
            <Skeleton width="30%" height={9} />
            <Skeleton width="70%" height={13} />
            <Skeleton width="50%" height={10} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Loading placeholders shaped like the 2-column cover-card grid, used by the Occasions/Series/Topics segments. */
function CollectionGridSkeleton({ cardWidth }: { cardWidth: number }) {
  const t = useTheme();
  return (
    <View style={styles.grid}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          style={[styles.collectionSkeletonCard, { width: cardWidth, borderColor: t.c.borderSubtle, borderRadius: t.radii.lg }]}
        >
          <Skeleton width={cardWidth} height={96} radius={0} />
          <View style={{ paddingHorizontal: 13, paddingTop: 12, paddingBottom: 14, gap: t.space.xs }}>
            <Skeleton width="35%" height={9} />
            <Skeleton width="85%" height={14} />
            <Skeleton width="60%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 4 },
  segmentRow: { flexDirection: "row", alignItems: "center", paddingTop: 14, paddingBottom: 4, paddingRight: 8 },
  segmentScroll: { flex: 1 },
  segmentScrollContent: { gap: 8, paddingHorizontal: 18, paddingVertical: 2 },
  searchToggle: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  searchWrap: { paddingHorizontal: 16, paddingTop: 8 },
  collectionsWrap: { paddingHorizontal: 16, paddingTop: 8 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  lectureSkeletonRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, paddingVertical: 11 },
  collectionSkeletonCard: { overflow: "hidden", borderWidth: 1, marginBottom: 14 },
});
