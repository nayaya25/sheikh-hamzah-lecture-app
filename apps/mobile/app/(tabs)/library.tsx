import { useMemo, useState } from "react";
import { ScrollView, SectionList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { typography } from "@althaqalayn/theme";
import type { MediaType, SeriesKind } from "@althaqalayn/types";
import { FilterChips, type Chip as ChipDef } from "@/components/FilterChips";
import { LectureListRow } from "@/components/LectureListRow";
import { SearchField } from "@/components/SearchField";
import { SeriesListRow } from "@/components/SeriesListRow";
import { AppText } from "@/components/ui/AppText";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { Touchable } from "@/components/ui/Touchable";
import { durationLabel, type SampleSeries } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalogProvider";
import { useI18n } from "@/lib/i18n";
import { TAB_BAR_HEIGHT } from "@/lib/layout";
import { openLecture } from "@/lib/openLecture";
import { usePlayer } from "@/lib/player";
import { useTheme } from "@/lib/theme";

type Segment = "recent" | "occasions" | "topics" | "series";
type MediaFilter = "all" | MediaType;

// Occasions/Topics filter series by kind; "Series" shows all series.
const SEGMENT_KIND: Partial<Record<Segment, SeriesKind>> = {
  occasions: "occasion",
  topics: "topic",
};

const MEDIA_DOTS: Record<MediaFilter, string> = {
  all: "#0B4634",
  audio: "#12634E",
  video: "#a23e3e",
  text: "#6a4f9c",
};

interface YearSection {
  title: string;
  data: SampleSeries[];
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const { t: msgs, arabic } = useI18n();
  const { play } = usePlayer();
  const { lectures: lecturesList, series, loading, error, refetch } = useCatalog();

  const [segment, setSegment] = useState<Segment>("recent");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

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
      recent: lecturesList.length,
      occasions: series.filter((s) => s.kindRaw === "occasion").length,
      topics: series.filter((s) => s.kindRaw === "topic").length,
      series: series.length,
    }),
    [lecturesList, series],
  );

  const segmentChips: { key: Segment; label: string }[] = [
    { key: "recent", label: `${msgs.library.recent} (${segmentCounts.recent})` },
    { key: "occasions", label: `${msgs.library.occasions} (${segmentCounts.occasions})` },
    { key: "topics", label: `${msgs.library.topics} (${segmentCounts.topics})` },
    { key: "series", label: `${msgs.library.series} (${segmentCounts.series})` },
  ];

  const mediaChips: ChipDef<MediaFilter>[] = (["all", "audio", "video", "text"] as const).map((k) => ({
    key: k,
    label: msgs.mediaFilter[k],
    dotColor: MEDIA_DOTS[k],
  }));

  const lectures = useMemo(() => {
    return lecturesList.filter((l) => {
      if (mediaFilter !== "all" && l.type !== mediaFilter) return false;
      return !q || `${l.title} ${l.sub}`.toLowerCase().includes(q);
    });
  }, [mediaFilter, q, lecturesList]);

  const seriesRows = useMemo(() => {
    if (segment === "recent") return [];
    const kind = SEGMENT_KIND[segment];
    return series
      .filter((s) => (kind ? s.kindRaw === kind : true))
      .filter((s) => !q || `${s.title} ${s.kind}`.toLowerCase().includes(q));
  }, [segment, q, series]);

  // Series segment only: group the filtered rows by year, newest first, with
  // undated series trailing in their own section.
  const seriesSections = useMemo<YearSection[]>(() => {
    if (segment !== "series") return [];
    const groups = new Map<string, SampleSeries[]>();
    for (const s of seriesRows) {
      const key = s.year.trim() || "Undated";
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }
    const keys = Array.from(groups.keys()).sort((a, b) => {
      if (a === "Undated") return 1;
      if (b === "Undated") return -1;
      return b.localeCompare(a);
    });
    return keys.map((key) => ({ title: key, data: groups.get(key) ?? [] }));
  }, [segment, seriesRows]);

  const openById = (lectureId: string) => {
    const lecture = lecturesList.find((l) => l.id === lectureId);
    if (lecture) openLecture(router, play, lecture);
  };

  const hasData = lecturesList.length > 0 || series.length > 0;
  const showSkeleton = loading && !hasData;
  const bottomPadding = TAB_BAR_HEIGHT + insets.bottom + t.space.lg;
  const statusBarStyle = t.scheme === "dark" ? "light" : "dark";

  const emptyTitle = (isSeries: boolean) => (q ? "No matches." : isSeries ? "Nothing here yet." : "No lectures yet.");

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
          accessibilityLabel={searchOpen ? "Close search" : "Filter this list"}
          style={[styles.searchToggle, { backgroundColor: searchOpen ? t.c.surfaceAlt : "transparent", borderRadius: t.radii.pill }]}
        >
          <Icon name={searchOpen ? "x" : "search"} size={19} color={searchOpen ? "accent" : "textMuted"} />
        </Touchable>
      </View>

      {searchOpen ? (
        <View style={styles.searchWrap}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Filter this list…" autoFocus />
        </View>
      ) : null}

      {segment === "recent" && !showSkeleton && !error ? (
        <View style={styles.mediaWrap}>
          <FilterChips chips={mediaChips} active={mediaFilter} onPick={setMediaFilter} />
        </View>
      ) : null}
    </>
  );

  if (error) {
    return (
      <View style={[styles.root, { backgroundColor: t.c.bg }]}>
        <StatusBar style={statusBarStyle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>
          {header}
          <EmptyState
            icon="alert-triangle"
            title="Couldn't load content"
            body={error}
            action={{ label: "Retry", onPress: () => void refetch() }}
          />
        </ScrollView>
      </View>
    );
  }

  if (segment === "series") {
    return (
      <View style={[styles.root, { backgroundColor: t.c.bg }]}>
        <StatusBar style={statusBarStyle} />
        <SectionList
          sections={showSkeleton ? [] : seriesSections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          ListHeaderComponent={
            <>
              {header}
              {showSkeleton ? <SeriesRowSkeleton /> : null}
            </>
          }
          ListEmptyComponent={!showSkeleton ? <EmptyState icon="folder" title={emptyTitle(true)} /> : null}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: t.c.bg }]}>
              <AppText variant="meta" color="textFaint" style={{ fontWeight: "700", letterSpacing: 0.4 }}>
                {section.title}
              </AppText>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.rowWrap}>
              <SeriesListRow series={item} onPress={() => router.push(`/series/${item.id}`)} />
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <StatusBar style={statusBarStyle} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomPadding }}>
        {header}
        {showSkeleton ? (
          segment === "recent" ? <LectureRowSkeleton /> : <SeriesRowSkeleton />
        ) : segment === "recent" ? (
          lectures.length === 0 ? (
            <EmptyState icon="headphones" title={emptyTitle(false)} />
          ) : (
            <View>
              {lectures.map((l) => (
                <LectureListRow key={l.id} lecture={l} meta={durationLabel(l)} onPress={() => openById(l.id)} />
              ))}
            </View>
          )
        ) : (
          <View style={styles.seriesWrap}>
            {seriesRows.length === 0 ? (
              <EmptyState icon="folder" title={emptyTitle(true)} />
            ) : (
              seriesRows.map((s) => <SeriesListRow key={s.id} series={s} onPress={() => router.push(`/series/${s.id}`)} />)
            )}
          </View>
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

/** Loading placeholders shaped like the series card row, used by Occasions/Topics/Series segments. */
function SeriesRowSkeleton() {
  const t = useTheme();
  return (
    <View style={styles.seriesWrap}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={[styles.seriesSkeletonRow, { borderColor: t.c.borderSubtle }]}>
          <Skeleton width={70} height={70} radius={t.radii.lg} />
          <View style={{ flex: 1, gap: t.space.xs }}>
            <Skeleton width="25%" height={9} />
            <Skeleton width="80%" height={14} />
            <Skeleton width="55%" height={11} />
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
  mediaWrap: { paddingTop: 4, paddingBottom: 6 },
  seriesWrap: { paddingHorizontal: 16, paddingTop: 8 },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  rowWrap: { paddingHorizontal: 16 },
  lectureSkeletonRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, paddingVertical: 11 },
  seriesSkeletonRow: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderRadius: 18, padding: 12, marginBottom: 12 },
});
