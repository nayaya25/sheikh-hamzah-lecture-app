import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { MediaType } from "@althaqalayn/types";
import { FilterChips, type Chip as ChipDef } from "@/components/FilterChips";
import { MediaBadge } from "@/components/MediaBadge";
import { SearchField } from "@/components/SearchField";
import { AppText } from "@/components/ui/AppText";
import { Chip } from "@/components/ui/Chip";
import { CoverArt } from "@/components/ui/CoverArt";
import { EmptyState } from "@/components/ui/EmptyState";
import { Touchable } from "@/components/ui/Touchable";
import type { CollectionVM, Playable } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalogProvider";
import { useI18n } from "@/lib/i18n";
import { MINI_PLAYER_GAP, MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from "@/lib/layout";
import { openLecture } from "@/lib/openLecture";
import { usePlayer } from "@/lib/player";
import { loadJSON, saveJSON, StorageKeys } from "@/lib/storage";
import { useTheme } from "@/lib/theme";

type SearchFilter = "all" | MediaType;

// How long to wait after the last keystroke before re-filtering — smooths
// typing at current catalog scale without adding a dependency.
const DEBOUNCE_MS = 200;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const t = useTheme();
  const { t: msgs } = useI18n();
  const { play, playCollection } = usePlayer();
  const { lectures, collections, lecturesForCollection } = useCatalog();

  const [query, setQuery] = useState(params.q ?? "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [recent, setRecent] = useState<string[]>([]);

  // Adopt an incoming ?q= (e.g. tapping a recent search elsewhere).
  useEffect(() => {
    if (params.q) setQuery(params.q);
  }, [params.q]);

  useEffect(() => {
    void loadJSON<string[]>(StorageKeys.recentSearches, []).then(setRecent);
  }, []);

  // Debounce the query before it drives filtering, so fast typing doesn't
  // re-filter the catalog on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [query]);

  const chips: ChipDef<SearchFilter>[] = (["all", "audio", "video", "text"] as const).map((k) => ({ key: k, label: msgs.mediaFilter[k] }));

  const q = debouncedQuery.trim().toLowerCase();

  const lectureResults = useMemo(() => {
    if (!q) return [];
    return lectures.filter((l) => {
      if (filter !== "all" && l.type !== filter) return false;
      return `${l.title} ${l.sub}`.toLowerCase().includes(q);
    });
  }, [q, filter, lectures]);

  // Collections are searched by title only — media-type filtering doesn't
  // apply to a collection, so a filter narrower than "all" hides them.
  const collectionResults = useMemo(() => {
    if (!q || filter !== "all") return [];
    return collections.filter((c) => c.title.toLowerCase().includes(q));
  }, [q, filter, collections]);

  const totalResults = lectureResults.length + collectionResults.length;

  const saveRecent = (term: string) => {
    const next = [term, ...recent.filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    setRecent(next);
    void saveJSON(StorageKeys.recentSearches, next);
  };

  const openLectureResult = (id: string) => {
    const lecture = lectures.find((l) => l.id === id);
    if (!lecture) return;
    if (query.trim()) saveRecent(query.trim());
    openLecture(router, lecture, { play, playCollection, lecturesForCollection });
  };

  const openCollectionResult = (id: string) => {
    if (query.trim()) saveRecent(query.trim());
    router.push(`/collection/${id}`);
  };

  const bottomPadding = insets.bottom + TAB_BAR_HEIGHT + MINI_PLAYER_GAP + MINI_PLAYER_HEIGHT + t.space.lg;
  const statusBarStyle = t.scheme === "dark" ? "light" : "dark";

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <StatusBar style={statusBarStyle} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + t.space.md, paddingBottom: bottomPadding }}
      >
        <View style={[styles.searchWrap, { paddingHorizontal: t.space.screen - 4 }]}>
          <SearchField value={query} onChangeText={setQuery} placeholder={msgs.search.placeholder} autoFocus={!params.q} />
        </View>
        <View style={styles.chipsWrap}>
          <FilterChips chips={chips} active={filter} onPick={setFilter} />
        </View>

        {q ? (
          <>
            <AppText variant="meta" color="textMuted" style={[styles.resultCount, { paddingHorizontal: t.space.screen - 2 }]}>
              {totalResults} {totalResults === 1 ? "result" : msgs.search.results}
            </AppText>
            {totalResults === 0 ? (
              <EmptyState icon="search" title={`${msgs.search.noResults} for "${query.trim()}"`} />
            ) : (
              <View>
                {collectionResults.map((c) => (
                  <CollectionResultRow key={c.id} collection={c} query={q} onPress={() => openCollectionResult(c.id)} />
                ))}
                {lectureResults.map((l) => (
                  <LectureResultRow key={l.id} lecture={l} query={q} onPress={() => openLectureResult(l.id)} />
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {recent.length ? (
              <>
                <SectionLabel>{msgs.search.recentSearches}</SectionLabel>
                <View style={[styles.recentRow, { paddingHorizontal: t.space.screen - 2, gap: t.space.sm + 1 }]}>
                  {recent.map((term) => (
                    <Chip key={term} label={term} onPress={() => setQuery(term)} />
                  ))}
                </View>
              </>
            ) : (
              <EmptyState icon="search" title="Search published lectures, occasions, series and topics." />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** Splits `title` on the first case-insensitive match of `q`, so the caller can
 * render the matched substring with its own style. Returns the whole title as
 * one unmatched segment when `q` is empty or absent. */
function splitTitleMatch(title: string, q: string): { text: string; match: boolean }[] {
  if (!q) return [{ text: title, match: false }];
  const idx = title.toLowerCase().indexOf(q);
  if (idx === -1) return [{ text: title, match: false }];
  const segments: { text: string; match: boolean }[] = [];
  if (idx > 0) segments.push({ text: title.slice(0, idx), match: false });
  segments.push({ text: title.slice(idx, idx + q.length), match: true });
  if (idx + q.length < title.length) segments.push({ text: title.slice(idx + q.length), match: false });
  return segments;
}

/** Highlights the matched substring of `title` in accent/bold, shared by the lecture and collection result rows. */
function HighlightedTitle({ title, query }: { title: string; query: string }) {
  const t = useTheme();
  const segments = splitTitleMatch(title, query);
  return (
    <>
      {segments.map((seg, i) =>
        seg.match ? (
          <Text key={i} style={{ color: t.c.accent, fontWeight: "700" }}>
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        ),
      )}
    </>
  );
}

/** Lecture result row with the matched substring of the title picked out. */
function LectureResultRow({ lecture, query, onPress }: { lecture: Playable; query: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Touchable haptic="light" onPress={onPress} style={styles.resultRow}>
      <CoverArt gradient={lecture.gradient ? [lecture.gradient[0], lecture.gradient[1]] : undefined} glyph={lecture.ar} size={52} radius={t.radii.md} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <MediaBadge type={lecture.type} />
        <AppText variant="cardTitle" numberOfLines={1} style={{ fontSize: 14, marginTop: 3 }}>
          <HighlightedTitle title={lecture.title} query={query} />
        </AppText>
        <AppText variant="meta" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
          {lecture.sub}
        </AppText>
      </View>
    </Touchable>
  );
}

/** Collection result row with the matched substring of the title picked out. */
function CollectionResultRow({ collection, query, onPress }: { collection: CollectionVM; query: string; onPress: () => void }) {
  const t = useTheme();
  const { t: msgs } = useI18n();
  return (
    <Touchable haptic="light" onPress={onPress} style={styles.resultRow}>
      <CoverArt gradient={[collection.cover.gradient[0], collection.cover.gradient[1]]} glyph={collection.cover.arabic} size={52} radius={t.radii.md} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText variant="caption" color="accent" style={styles.collectionKind}>
          {collection.kind}
        </AppText>
        <AppText variant="cardTitle" numberOfLines={1} style={{ fontSize: 14, marginTop: 3 }}>
          <HighlightedTitle title={collection.title} query={query} />
        </AppText>
        <AppText variant="meta" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
          {collection.count} {msgs.library.parts}
        </AppText>
      </View>
    </Touchable>
  );
}

function SectionLabel({ children }: { children: string }) {
  const t = useTheme();
  return (
    <AppText variant="section" style={{ fontSize: 15, paddingHorizontal: t.space.screen - 2, paddingTop: t.space.xl, paddingBottom: t.space.md }}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: {},
  chipsWrap: { paddingTop: 12, paddingBottom: 2 },
  resultCount: { paddingTop: 8, paddingBottom: 4 },
  recentRow: { flexDirection: "row", flexWrap: "wrap" },
  collectionKind: { fontWeight: "800", letterSpacing: 0.4, textTransform: "capitalize" },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, paddingVertical: 11 },
});
