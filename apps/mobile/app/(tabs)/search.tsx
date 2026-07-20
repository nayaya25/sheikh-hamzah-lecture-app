import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import type { MediaType } from "@althaqalayn/types";
import { FilterChips, type Chip } from "@/components/FilterChips";
import { GradientCover } from "@/components/GradientCover";
import { LectureListRow } from "@/components/LectureListRow";
import { SearchField } from "@/components/SearchField";
import { useCatalog } from "@/lib/catalogProvider";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { openLecture } from "@/lib/openLecture";
import { usePlayer } from "@/lib/player";
import { loadJSON, saveJSON, StorageKeys } from "@/lib/storage";

type SearchFilter = "all" | MediaType;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const { t } = useI18n();
  const { play } = usePlayer();
  const { lectures, series } = useCatalog();

  const [query, setQuery] = useState(params.q ?? "");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [recent, setRecent] = useState<string[]>([]);

  // Adopt an incoming ?q= (e.g. tapping an Explore category on Home).
  useEffect(() => {
    if (params.q) setQuery(params.q);
  }, [params.q]);

  useEffect(() => {
    void loadJSON<string[]>(StorageKeys.recentSearches, []).then(setRecent);
  }, []);

  const chips: Chip<SearchFilter>[] = (["all", "audio", "video", "text"] as const).map((k) => ({ key: k, label: t.mediaFilter[k] }));

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return lectures.filter((l) => {
      if (filter !== "all" && l.type !== filter) return false;
      return `${l.title} ${l.sub}`.toLowerCase().includes(q);
    });
  }, [q, filter, lectures]);

  const saveRecent = (term: string) => {
    const next = [term, ...recent.filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    setRecent(next);
    void saveJSON(StorageKeys.recentSearches, next);
  };

  const openResult = (id: string) => {
    const lecture = lectures.find((l) => l.id === id);
    if (!lecture) return;
    if (query.trim()) saveRecent(query.trim());
    openLecture(router, play, lecture);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}>
        <View style={styles.searchWrap}>
          <SearchField value={query} onChangeText={setQuery} placeholder={t.search.placeholder} autoFocus={!params.q} />
        </View>
        <View style={styles.chipsWrap}>
          <FilterChips chips={chips} active={filter} onPick={setFilter} />
        </View>

        {q ? (
          <>
            <Text style={styles.resultCount}>
              {results.length} {results.length === 1 ? "result" : t.search.results}
            </Text>
            {results.length === 0 ? (
              <Text style={styles.empty}>{t.search.noResults}</Text>
            ) : (
              results.map((l) => <LectureListRow key={l.id} lecture={l} coverSize={52} onPress={() => openResult(l.id)} />)
            )}
          </>
        ) : (
          <>
            {recent.length ? (
              <>
                <Text style={styles.sectionLabel}>{t.search.recentSearches}</Text>
                <View style={styles.recentRow}>
                  {recent.map((term) => (
                    <Pressable key={term} style={styles.recentChip} onPress={() => setQuery(term)}>
                      <Feather name="clock" size={13} color={colors.faint} />
                      <Text style={styles.recentText}>{term}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {series.length ? (
              <>
                <Text style={styles.sectionLabel}>{t.search.browseTopics}</Text>
                <View style={styles.topicGrid}>
                  {series.slice(0, 6).map((s) => (
                    <Pressable key={s.id} style={styles.topicTile} onPress={() => router.push(`/series/${s.id}`)}>
                      <GradientCover gradient={s.gradient} style={StyleSheet.absoluteFill} arabic={s.ar} arabicSize={40} />
                      <Text style={styles.topicLabel}>{s.title}</Text>
                      <Text style={styles.topicMeta}>{s.kind}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {!recent.length && !series.length ? (
              <Text style={styles.empty}>Search published lectures, series and topics.</Text>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  searchWrap: { paddingHorizontal: 16 },
  chipsWrap: { paddingTop: 12, paddingBottom: 2 },
  resultCount: { fontFamily: font.sans.regular, fontSize: 12, color: colors.mutedAlt, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4 },
  empty: { fontFamily: font.sans.medium, fontSize: 13, color: colors.faint, paddingHorizontal: 18, paddingTop: 24 },
  sectionLabel: { fontFamily: font.serif.semibold, fontSize: 15, color: colors.ink, paddingHorizontal: 18, paddingTop: 24, paddingBottom: 12 },
  recentRow: { flexDirection: "row", flexWrap: "wrap", gap: 9, paddingHorizontal: 18 },
  recentChip: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#fff", borderWidth: 1, borderColor: "#E4DCC9", borderRadius: 20, paddingHorizontal: 13, paddingVertical: 8 },
  recentText: { fontFamily: font.sans.regular, fontSize: 12.5, color: "#3a463f" },
  topicGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11, paddingHorizontal: 16 },
  topicTile: { width: "47.5%", flexGrow: 1, overflow: "hidden", borderRadius: 15, padding: 14, minHeight: 84, justifyContent: "flex-end", gap: 5 },
  topicLabel: { fontFamily: font.serif.semibold, fontSize: 14, color: "#fff" },
  topicMeta: { fontFamily: font.sans.regular, fontSize: 10.5, color: "rgba(255,255,255,0.72)" },
});
