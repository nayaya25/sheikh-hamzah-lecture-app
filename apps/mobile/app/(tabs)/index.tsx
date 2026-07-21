import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { GradientCover } from "@/components/GradientCover";
import { MediaBadge } from "@/components/MediaBadge";
import { logos } from "@/lib/assets";
import { useCatalog } from "@/lib/catalogProvider";
import type { Playable } from "@/lib/catalog";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { TAB_BAR_HEIGHT } from "@/lib/layout";
import { openLecture } from "@/lib/openLecture";
import { usePlayer } from "@/lib/player";
import { loadJSON, StorageKeys } from "@/lib/storage";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, arabic } = useI18n();
  const { play } = usePlayer();
  const { loading, categories, albums, homeFeatured, homeLatest, lectureById } = useCatalog();

  const [cont, setCont] = useState<{ lecture: Playable; progress: number; left: string } | null>(null);

  // Resolve the "continue listening" card from real playback history on focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const last = await loadJSON<{ id: string } | null>(StorageKeys.lastPlayed, null);
        const resume = await loadJSON<Record<string, number>>(StorageKeys.resume, {});
        const lecture = last ? lectureById(last.id) : undefined;
        if (!active || !lecture) {
          setCont(null);
          return;
        }
        const frac = resume[lecture.id] ?? 0;
        const leftMin = Math.round((lecture.durSec * (1 - frac)) / 60);
        setCont({ lecture, progress: frac, left: `${leftMin} ${t.home.minutesLeft}` });
      })();
      return () => {
        active = false;
      };
    }, [lectureById, t.home.minutesLeft]),
  );

  const openById = (id: string) => {
    const lecture = lectureById(id);
    if (lecture) openLecture(router, play, lecture);
  };
  const openSeries = (id: string) => router.push(`/series/${id}`);
  const searchFor = (q: string) => router.push(`/search?q=${encodeURIComponent(q)}`);

  const empty = !loading && !cont && !categories.length && !homeFeatured.length && !albums.length && !homeLatest.length;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 16 }]}>
        {/* ── Green header ─────────────────────────────────────────── */}
        <LinearGradient
          colors={[colors.greenDeep, colors.greenMid, colors.greenHighlight]}
          locations={[0, 0.68, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={[styles.header, { paddingTop: insets.top + 18 }]}
        >
          <Text style={styles.headerWatermark} allowFontScaling={false}>
            {arabic.allah}
          </Text>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting} allowFontScaling={false}>
                {arabic.greeting}
              </Text>
              <Text style={styles.appTitle}>{t.home.greetingTitle}</Text>
              <Text style={styles.subtitle}>{t.home.subtitle}</Text>
            </View>
            <Pressable style={styles.emblem} onPress={() => router.push("/settings")}>
              <Image source={logos.icon} style={styles.emblemImg} resizeMode="contain" />
            </Pressable>
          </View>

          <Pressable style={styles.searchBar} onPress={() => router.push("/search")}>
            <Feather name="search" size={18} color="rgba(255,255,255,0.8)" />
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              {t.search.placeholder}
            </Text>
            <Pressable
              hitSlop={8}
              style={styles.langPill}
              onPress={(e) => {
                e.stopPropagation();
                router.push("/language");
              }}
            >
              <Text style={styles.langPillText}>{lang.toUpperCase()}</Text>
            </Pressable>
          </Pressable>
        </LinearGradient>

        {loading ? (
          <ActivityIndicator color={colors.greenMid} style={{ marginTop: 40 }} />
        ) : empty ? (
          <View style={styles.emptyWrap}>
            <Feather name="headphones" size={30} color={colors.faint} />
            <Text style={styles.emptyTitle}>No lectures yet</Text>
            <Text style={styles.emptyBody}>Published content will appear here.</Text>
          </View>
        ) : (
          <>
            {/* ── Continue listening ─────────────────────────────────── */}
            {cont ? (
              <Pressable style={styles.continueCard} onPress={() => openById(cont.lecture.id)}>
                <GradientCover gradient={cont.lecture.gradient ?? ["#4a2f5e", "#7a4f9c"]} style={styles.continueCover}>
                  <Ionicons name="play" size={20} color="#fff" />
                </GradientCover>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.overline}>{t.home.continueListening.toUpperCase()}</Text>
                  <Text style={styles.continueTitle} numberOfLines={1}>
                    {cont.lecture.title}
                  </Text>
                  <View style={styles.progressRow}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.round(cont.progress * 100)}%` }]} />
                    </View>
                    <Text style={styles.continueLeft}>{cont.left}</Text>
                  </View>
                </View>
              </Pressable>
            ) : null}

            {/* ── Explore ────────────────────────────────────────────── */}
            {categories.length ? (
              <>
                <SectionHeader title={t.home.explore} arabic="استكشف" />
                <View style={styles.grid}>
                  {categories.map((cat) => (
                    <Pressable key={cat.label} style={styles.categoryTile} onPress={() => searchFor(cat.label)}>
                      <Text style={styles.categoryAr} allowFontScaling={false}>
                        {cat.ar}
                      </Text>
                      <Text style={styles.categoryLabel}>{cat.label}</Text>
                      {cat.meta ? <Text style={styles.categoryMeta}>{cat.meta}</Text> : null}
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {/* ── Featured series ────────────────────────────────────── */}
            {homeFeatured.length ? (
              <>
                <SectionHeader title={t.home.featuredSeries} action={t.common.seeAll} onAction={() => router.push("/library")} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
                  {homeFeatured.map((s) => (
                    <Pressable key={s.id} style={styles.featuredCard} onPress={() => openSeries(s.id)}>
                      <GradientCover gradient={s.gradient} style={styles.featuredCover} arabic={s.ar}>
                        <View style={styles.kindChip}>
                          <Text style={styles.kindChipText}>{s.kind}</Text>
                        </View>
                      </GradientCover>
                      <Text style={styles.featuredTitle} numberOfLines={2}>
                        {s.title}
                      </Text>
                      <Text style={styles.featuredMeta}>{s.metaShort}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* ── Events & photos ────────────────────────────────────── */}
            {albums.length ? (
              <>
                <SectionHeader title={t.home.eventsPhotos} action={t.common.seeAll} onAction={() => router.push("/gallery")} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
                  {albums.map((g) => (
                    <Pressable key={g.id} style={styles.albumCard} onPress={() => router.push(`/gallery/${g.id}`)}>
                      <View style={styles.albumCover}>
                        {g.cover ? (
                          <Image source={{ uri: g.cover }} style={styles.albumCoverImg} />
                        ) : (
                          <GradientCover gradient={g.gradient ?? ["#0B4634", "#17795E"]} style={StyleSheet.absoluteFill} />
                        )}
                        <View style={styles.countChip}>
                          <Feather name="image" size={12} color="#fff" />
                          <Text style={styles.countChipText}>{g.count}</Text>
                        </View>
                      </View>
                      <Text style={styles.albumTitle} numberOfLines={1}>
                        {g.title}
                      </Text>
                      <Text style={styles.albumDate}>{g.date}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* ── Latest lectures ────────────────────────────────────── */}
            {homeLatest.length ? (
              <>
                <SectionHeader title={t.home.latestLectures} arabic="جديد" />
                <View>
                  {homeLatest.map((l) => (
                    <Pressable key={l.id} style={styles.lectureRow} onPress={() => openById(l.id)}>
                      <GradientCover gradient={l.gradient} style={styles.lectureCover} arabic={l.ar} arabicSize={34}>
                        <Ionicons name="play" size={18} color="#fff" />
                      </GradientCover>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.lectureMetaRow}>
                          <MediaBadge type={l.type} />
                          <Text style={styles.lectureDate}>{l.date}</Text>
                        </View>
                        <Text style={styles.lectureTitle} numberOfLines={1}>
                          {l.title}
                        </Text>
                        <Text style={styles.lectureSub} numberOfLines={1}>
                          {l.sub}
                        </Text>
                      </View>
                      <Feather name="more-vertical" size={20} color="#c4ccc5" />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, arabic, action, onAction }: { title: string; arabic?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {arabic ? (
        <Text style={styles.sectionArabic} allowFontScaling={false}>
          {arabic}
        </Text>
      ) : null}
      {action ? (
        <Text style={styles.sectionAction} onPress={onAction}>
          {action}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { paddingBottom: 32 },
  header: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingHorizontal: 20, paddingBottom: 24, overflow: "hidden" },
  headerWatermark: { position: "absolute", right: -30, top: 20, fontFamily: font.arabic.regular, fontSize: 150, color: "rgba(255,255,255,0.05)" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontFamily: font.arabic.regular, color: colors.goldLight, fontSize: 16, letterSpacing: 0.3 },
  appTitle: { fontFamily: font.serif.semibold, color: "#fff", fontSize: 23, marginTop: 3, lineHeight: 26 },
  subtitle: { color: "rgba(255,255,255,0.62)", fontFamily: font.sans.regular, fontSize: 12, marginTop: 5 },
  emblem: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: "rgba(228,199,123,0.6)", alignItems: "center", justifyContent: "center" },
  emblemImg: { width: 34, height: 34 },
  searchBar: { marginTop: 20, backgroundColor: "rgba(255,255,255,0.13)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", borderRadius: 15, paddingHorizontal: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", gap: 11 },
  searchPlaceholder: { flex: 1, color: "rgba(255,255,255,0.65)", fontFamily: font.sans.regular, fontSize: 13.5 },
  langPill: { borderWidth: 1, borderColor: "rgba(228,199,123,0.5)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  langPillText: { fontFamily: font.sans.bold, fontSize: 10.5, color: colors.goldLight },

  emptyWrap: { alignItems: "center", paddingTop: 60, paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontFamily: font.serif.semibold, fontSize: 17, color: colors.ink, marginTop: 6 },
  emptyBody: { fontFamily: font.sans.regular, fontSize: 13, color: colors.muted, textAlign: "center" },

  continueCard: { marginTop: -26, marginHorizontal: 16, backgroundColor: "#fff", borderRadius: 20, padding: 13, flexDirection: "row", alignItems: "center", gap: 13, shadowColor: "#0B4634", shadowOpacity: 0.16, shadowRadius: 20, shadowOffset: { width: 0, height: 14 }, elevation: 6 },
  continueCover: { width: 58, height: 58, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  overline: { fontFamily: font.sans.extrabold, fontSize: 10, letterSpacing: 1, color: colors.gold },
  continueTitle: { fontFamily: font.serif.semibold, fontSize: 14.5, color: colors.ink, marginTop: 2 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  progressTrack: { flex: 1, height: 4, backgroundColor: "#EAE3D4", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.gold, borderRadius: 2 },
  continueLeft: { fontFamily: font.sans.regular, fontSize: 10.5, color: "#94a099" },

  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 27, paddingBottom: 13 },
  sectionTitle: { flex: 1, fontFamily: font.serif.semibold, fontSize: 18, color: colors.ink },
  sectionArabic: { fontFamily: font.arabic.regular, fontSize: 16, color: colors.gold },
  sectionAction: { fontFamily: font.sans.bold, fontSize: 12, color: colors.greenMid },

  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 11 },
  categoryTile: { width: "31%", backgroundColor: "#fff", borderWidth: 1, borderColor: colors.hairline, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 11, alignItems: "center", gap: 7 },
  categoryAr: { fontFamily: font.arabic.regular, fontSize: 25, color: colors.gold },
  categoryLabel: { fontFamily: font.sans.bold, fontSize: 12, color: colors.ink, textAlign: "center" },
  categoryMeta: { fontFamily: font.sans.regular, fontSize: 9.5, color: colors.faint, textAlign: "center" },

  railContent: { paddingHorizontal: 16, gap: 14, paddingBottom: 4 },
  featuredCard: { width: 178 },
  featuredCover: { height: 118, borderRadius: 18, justifyContent: "flex-end", padding: 12 },
  kindChip: { alignSelf: "flex-start", backgroundColor: "rgba(0,0,0,0.22)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  kindChipText: { fontFamily: font.sans.extrabold, fontSize: 9.5, letterSpacing: 0.6, color: "#fff" },
  featuredTitle: { fontFamily: font.serif.semibold, fontSize: 14, color: colors.ink, marginTop: 9, lineHeight: 18 },
  featuredMeta: { fontFamily: font.sans.regular, fontSize: 11, color: "#94a099", marginTop: 3 },

  albumCard: { width: 152 },
  albumCover: { height: 104, borderRadius: 16, overflow: "hidden", position: "relative", backgroundColor: colors.hairline },
  albumCoverImg: { width: "100%", height: "100%" },
  countChip: { position: "absolute", left: 9, top: 9, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  countChipText: { fontFamily: font.sans.bold, fontSize: 9.5, color: "#fff" },
  albumTitle: { fontFamily: font.serif.semibold, fontSize: 13, color: colors.ink, marginTop: 8 },
  albumDate: { fontFamily: font.sans.regular, fontSize: 10.5, color: "#94a099", marginTop: 2 },

  lectureRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, paddingVertical: 11 },
  lectureCover: { width: 60, height: 60, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  lectureMetaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  lectureDate: { fontFamily: font.sans.regular, fontSize: 10.5, color: colors.faintAlt },
  lectureTitle: { fontFamily: font.serif.semibold, fontSize: 14.5, color: colors.ink, marginTop: 3 },
  lectureSub: { fontFamily: font.sans.regular, fontSize: 11.5, color: colors.mutedAlt, marginTop: 3 },
});
