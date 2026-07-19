import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import type { MediaType } from "@althaqalayn/types";
import { FilterChips, type Chip } from "@/components/FilterChips";
import { LectureListRow } from "@/components/LectureListRow";
import { SearchField } from "@/components/SearchField";
import { lecturesList } from "@/lib/catalog";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { openLecture } from "@/lib/openLecture";
import { usePlayer } from "@/lib/player";
import { recentSearches, topicChips } from "@/lib/sampleData";

type SearchFilter = "all" | MediaType;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { play } = usePlayer();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");

  const chips: Chip<SearchFilter>[] = (["all", "audio", "video", "text"] as const).map((k) => ({
    key: k,
    label: t.mediaFilter[k],
  }));

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [];
    return lecturesList.filter((l) => {
      if (filter !== "all" && l.type !== filter) return false;
      return `${l.title} ${l.sub}`.toLowerCase().includes(q);
    });
  }, [q, filter]);

  const openById = (lectureId: string) => {
    const lecture = lecturesList.find((l) => l.id === lectureId);
    if (lecture) openLecture(router, play, lecture);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
      >
        <View style={styles.searchWrap}>
          <SearchField value={query} onChangeText={setQuery} placeholder={t.search.placeholder} />
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
              results.map((l) => (
                <LectureListRow
                  key={l.id}
                  lecture={l}
                  coverSize={52}
                  onPress={() => openById(l.id)}
                />
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>{t.search.recentSearches}</Text>
            <View style={styles.recentRow}>
              {recentSearches.map((term) => (
                <Pressable key={term} style={styles.recentChip} onPress={() => setQuery(term)}>
                  <Feather name="clock" size={13} color={colors.faint} />
                  <Text style={styles.recentText}>{term}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>{t.search.browseTopics}</Text>
            <View style={styles.topicGrid}>
              {topicChips.map((topic) => (
                <Pressable
                  key={topic.label}
                  style={styles.topicTile}
                  onPress={() => router.push(`/series/${topic.seriesId}`)}
                >
                  <LinearGradient
                    colors={[topic.gradient[0], topic.gradient[1]]}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 0.85, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.topicAr} allowFontScaling={false}>
                    {topic.ar}
                  </Text>
                  <Text style={styles.topicLabel}>{topic.label}</Text>
                  <Text style={styles.topicMeta}>{topic.meta}</Text>
                </Pressable>
              ))}
            </View>
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
  empty: { fontFamily: font.sans.medium, fontSize: 13, color: colors.faint, paddingHorizontal: 18, paddingTop: 12 },

  sectionLabel: { fontFamily: font.serif.semibold, fontSize: 15, color: colors.ink, paddingHorizontal: 18, paddingTop: 24, paddingBottom: 12 },
  recentRow: { flexDirection: "row", flexWrap: "wrap", gap: 9, paddingHorizontal: 18 },
  recentChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E4DCC9",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  recentText: { fontFamily: font.sans.regular, fontSize: 12.5, color: "#3a463f" },

  topicGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11, paddingHorizontal: 16 },
  topicTile: {
    width: "47.5%",
    flexGrow: 1,
    overflow: "hidden",
    borderRadius: 15,
    padding: 14,
    minHeight: 84,
    justifyContent: "flex-end",
    gap: 5,
  },
  topicAr: { position: "absolute", right: 6, top: 2, fontFamily: font.arabic.regular, fontSize: 40, color: "rgba(255,255,255,0.16)" },
  topicLabel: { fontFamily: font.serif.semibold, fontSize: 14, color: "#fff" },
  topicMeta: { fontFamily: font.sans.regular, fontSize: 10.5, color: "rgba(255,255,255,0.72)" },
});
