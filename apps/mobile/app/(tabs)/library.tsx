import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import type { MediaType, SeriesKind } from "@althaqalayn/types";
import { FilterChips, type Chip } from "@/components/FilterChips";
import { LectureListRow } from "@/components/LectureListRow";
import { SearchField } from "@/components/SearchField";
import { SeriesListRow } from "@/components/SeriesListRow";
import { durationLabel } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalogProvider";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { openLecture } from "@/lib/openLecture";
import { usePlayer } from "@/lib/player";

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

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, arabic } = useI18n();
  const { play } = usePlayer();
  const { lectures: lecturesList, series, loading } = useCatalog();

  const [segment, setSegment] = useState<Segment>("recent");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [query, setQuery] = useState("");

  const segmentChips: Chip<Segment>[] = [
    { key: "recent", label: t.library.recent },
    { key: "occasions", label: t.library.occasions },
    { key: "topics", label: t.library.topics },
    { key: "series", label: t.library.series },
  ];
  const mediaChips: Chip<MediaFilter>[] = (["all", "audio", "video", "text"] as const).map((k) => ({
    key: k,
    label: t.mediaFilter[k],
    dotColor: MEDIA_DOTS[k],
  }));

  const q = query.trim().toLowerCase();

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

  const openById = (lectureId: string) => {
    const lecture = lecturesList.find((l) => l.id === lectureId);
    if (lecture) openLecture(router, play, lecture);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.title}>{t.library.title}</Text>
          <Text style={styles.arabic} allowFontScaling={false}>
            {arabic.library}
          </Text>
        </View>

        <View style={styles.segments}>
          <FilterChips chips={segmentChips} active={segment} onPick={setSegment} />
        </View>

        <View style={styles.searchWrap}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Filter this list…" />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.greenMid} style={{ marginTop: 40 }} />
        ) : segment === "recent" ? (
          <>
            <View style={styles.mediaWrap}>
              <FilterChips chips={mediaChips} active={mediaFilter} onPick={setMediaFilter} />
            </View>
            {lectures.length === 0 ? (
              <Text style={styles.empty}>{q ? "No matches." : "No lectures yet."}</Text>
            ) : (
              lectures.map((l) => (
                <LectureListRow key={l.id} lecture={l} meta={durationLabel(l)} onPress={() => openById(l.id)} />
              ))
            )}
          </>
        ) : (
          <View style={styles.seriesWrap}>
            {seriesRows.length === 0 ? (
              <Text style={styles.empty}>{q ? "No matches." : "Nothing here yet."}</Text>
            ) : (
              seriesRows.map((s) => (
                <SeriesListRow key={s.id} series={s} onPress={() => router.push(`/series/${s.id}`)} />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  title: { fontFamily: font.serif.semibold, fontSize: 26, color: colors.ink },
  arabic: { fontFamily: font.arabic.regular, fontSize: 19, color: colors.gold },
  segments: { paddingTop: 14, paddingBottom: 4 },
  searchWrap: { paddingHorizontal: 16, paddingVertical: 4 },
  mediaWrap: { paddingTop: 4, paddingBottom: 6 },
  empty: { fontFamily: font.sans.medium, fontSize: 13, color: colors.faint, textAlign: "center", paddingTop: 30 },
  seriesWrap: { paddingHorizontal: 16, paddingTop: 8 },
});
