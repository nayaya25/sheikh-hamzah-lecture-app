import { useCallback, useState } from "react";
import { Image, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "@althaqalayn/theme";
import { MediaBadge } from "@/components/MediaBadge";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { CoverArt } from "@/components/ui/CoverArt";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { InlineErrorBanner } from "@/components/ui/InlineErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { Touchable } from "@/components/ui/Touchable";
import { logos } from "@/lib/assets";
import { useCatalog } from "@/lib/catalogProvider";
import { useI18n } from "@/lib/i18n";
import { MINI_PLAYER_GAP, MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from "@/lib/layout";
import { openLecture } from "@/lib/openLecture";
import { usePlayer } from "@/lib/player";
import { loadJSON, StorageKeys } from "@/lib/storage";
import { useTheme } from "@/lib/theme";

const DEFAULT_ALBUM_GRADIENT: [string, string] = [colors.greenDeep, colors.greenHighlightAlt];

// Scroll distance (px) over which the hero fades and the compact bar takes over.
const COMPACT_START = 70;
const COMPACT_END = 130;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const isDark = t.scheme === "dark";
  const { t: msgs, lang, arabic } = useI18n();
  const { play, progressFor } = usePlayer();
  const { loading, error, refetch, categories, albums, homeFeatured, homeLatest, lectureById } = useCatalog();

  const [contId, setContId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Resolve the "continue listening" lecture from real playback history on focus.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const last = await loadJSON<{ id: string } | null>(StorageKeys.lastPlayed, null);
        const lecture = last ? lectureById(last.id) : undefined;
        if (!active) return;
        setContId(lecture ? lecture.id : null);
      })();
      return () => {
        active = false;
      };
    }, [lectureById]),
  );

  const contLecture = contId ? lectureById(contId) : undefined;
  const contProgress = contLecture ? progressFor(contLecture.id) : 0;
  const contMinLeft = contLecture ? Math.round((contLecture.durSec * (1 - contProgress)) / 60) : 0;

  const openById = (id: string) => {
    const lecture = lectureById(id);
    if (lecture) openLecture(router, play, lecture);
  };
  const openSeries = (id: string) => router.push(`/series/${id}`);
  const searchFor = (q: string) => router.push(`/search?q=${encodeURIComponent(q)}`);

  const empty = !contLecture && !categories.length && !homeFeatured.length && !albums.length && !homeLatest.length;
  const hasData = homeLatest.length > 0 || homeFeatured.length > 0 || categories.length > 0;

  // ── Collapsing header ──────────────────────────────────────────────────
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const heroAnimStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [-140, 0], [1.12, 1], Extrapolation.CLAMP);
    const opacity = interpolate(scrollY.value, [0, COMPACT_END], [1, 0.1], Extrapolation.CLAMP);
    return { opacity, transform: [{ scale }] };
  });

  const compactBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [COMPACT_START, COMPACT_END], [0, 1], Extrapolation.CLAMP),
  }));

  // Only let the compact bar intercept touches once it's actually visible,
  // so it never blocks taps on the hero content underneath while faded out.
  const [compactInteractive, setCompactInteractive] = useState(false);
  useAnimatedReaction(
    () => scrollY.value > COMPACT_END,
    (show, prev) => {
      if (show !== prev) runOnJS(setCompactInteractive)(show);
    },
  );

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <StatusBar style="light" />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: TAB_BAR_HEIGHT + insets.bottom + MINI_PLAYER_GAP + MINI_PLAYER_HEIGHT + t.space.lg },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.c.textPrimary} colors={[colors.greenMid]} />
        }
      >
        {/* ── Green hero header ────────────────────────────────────── */}
        <Animated.View style={heroAnimStyle}>
          <LinearGradient
            colors={[colors.greenDeep, colors.greenMid, colors.greenHighlight]}
            locations={[0, 0.68, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.7, y: 1 }}
            style={[styles.header, { paddingTop: insets.top + t.space.lg, borderBottomLeftRadius: t.radii.hero, borderBottomRightRadius: t.radii.hero }]}
          >
            <AppText allowFontScaling={false} style={styles.headerWatermark}>
              {arabic.allah}
            </AppText>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <AppText allowFontScaling={false} color={colors.goldLight} style={styles.greeting}>
                  {arabic.greeting}
                </AppText>
                <AppText variant="screen" color="onBrand" style={{ marginTop: 3 }}>
                  {msgs.home.greetingTitle}
                </AppText>
                <AppText variant="meta" color="rgba(255,255,255,0.62)" style={{ marginTop: t.space.xs + 1 }}>
                  {msgs.home.subtitle}
                </AppText>
              </View>
              <Touchable
                haptic="light"
                onPress={() => router.push("/settings")}
                accessibilityLabel="Settings"
                style={[styles.emblem, { borderRadius: t.radii.pill }]}
              >
                <Image source={logos.icon} style={styles.emblemImg} resizeMode="contain" />
              </Touchable>
            </View>

            <Touchable onPress={() => router.push("/search")} accessibilityLabel={msgs.search.placeholder} style={[styles.searchBar, { borderRadius: t.radii.md }]}>
              <Icon name="search" size={18} color="rgba(255,255,255,0.8)" />
              <AppText variant="body" color="rgba(255,255,255,0.65)" style={{ flex: 1 }} numberOfLines={1}>
                {msgs.search.placeholder}
              </AppText>
              <Touchable
                haptic="none"
                hitSlop={8}
                style={[styles.langPill, { borderRadius: t.radii.sm }]}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push("/language");
                }}
              >
                <AppText variant="caption" color={colors.goldLight} style={{ fontWeight: "800" }}>
                  {lang.toUpperCase()}
                </AppText>
              </Touchable>
            </Touchable>
          </LinearGradient>
        </Animated.View>

        {loading && !hasData ? (
          <HomeSkeleton />
        ) : error && !hasData ? (
          <EmptyState
            icon="alert-triangle"
            title="Couldn't load content"
            body={error}
            action={{ label: "Retry", onPress: () => void refetch() }}
          />
        ) : empty ? (
          <EmptyState icon="headphones" title="No lectures yet" body="Published content will appear here." />
        ) : (
          <>
            {error ? <InlineErrorBanner message={error} onRetry={() => void refetch()} /> : null}

            {/* ── Continue listening ─────────────────────────────────── */}
            {contLecture ? (
              <Touchable haptic="light" onPress={() => openById(contLecture.id)} style={styles.continueWrap}>
                <Card elevation="md" style={styles.continueCard}>
                  <View style={styles.continueCover}>
                    <CoverArt gradient={contLecture.gradient ? [contLecture.gradient[0], contLecture.gradient[1]] : undefined} size={58} radius={t.radii.md} />
                    <View style={styles.coverPlayOverlay} pointerEvents="none">
                      <Icon name="play" size={18} color="onBrand" />
                    </View>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="caption" color="accent" style={{ fontWeight: "800", letterSpacing: 1 }}>
                      {msgs.home.continueListening.toUpperCase()}
                    </AppText>
                    <AppText variant="body" style={{ marginTop: 2 }} numberOfLines={1}>
                      {contLecture.title}
                    </AppText>
                    <View style={styles.progressRow}>
                      <View style={[styles.progressTrack, { backgroundColor: t.c.trackInactive }]}>
                        <View style={[styles.progressFill, { width: `${Math.round(contProgress * 100)}%`, backgroundColor: t.c.accent }]} />
                      </View>
                      <AppText variant="caption" color="textFaint">{`${contMinLeft} ${msgs.home.minutesLeft}`}</AppText>
                    </View>
                  </View>
                </Card>
              </Touchable>
            ) : null}

            {/* ── Explore ────────────────────────────────────────────── */}
            {categories.length ? (
              <>
                <SectionHeader title={msgs.home.explore} arabic="استكشف" />
                <View style={styles.grid}>
                  {categories.map((cat) => (
                    <Touchable key={cat.label} haptic="light" onPress={() => searchFor(cat.label)} style={styles.categoryTile}>
                      <Card elevation="none" padded={false} style={styles.categoryCard}>
                        <AppText allowFontScaling={false} color="accent" style={styles.categoryAr}>
                          {cat.ar}
                        </AppText>
                        <AppText variant="cardTitle" style={{ fontSize: 12, textAlign: "center" }}>
                          {cat.label}
                        </AppText>
                        {cat.meta ? (
                          <AppText variant="caption" color="textFaint" style={{ fontSize: 9.5, textAlign: "center" }}>
                            {cat.meta}
                          </AppText>
                        ) : null}
                      </Card>
                    </Touchable>
                  ))}
                </View>
              </>
            ) : null}

            {/* ── Featured series ────────────────────────────────────── */}
            {homeFeatured.length ? (
              <>
                <SectionHeader title={msgs.home.featuredSeries} action={msgs.common.seeAll} onAction={() => router.push("/library")} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
                  {homeFeatured.map((s) => (
                    <Touchable key={s.id} haptic="light" onPress={() => openSeries(s.id)} style={styles.featuredCard}>
                      <View style={styles.featuredCoverWrap}>
                        <CoverArt gradient={[s.gradient[0], s.gradient[1]]} glyph={s.ar} size={118} radius={t.radii.lg} style={styles.coverFill} />
                        <View style={styles.kindBadge} pointerEvents="none">
                          <AppText variant="caption" color="onBrand" style={{ fontWeight: "800", letterSpacing: 0.6, fontSize: 9.5 }}>
                            {s.kind}
                          </AppText>
                        </View>
                      </View>
                      <AppText variant="cardTitle" style={{ fontSize: 14, marginTop: t.space.sm, lineHeight: 18 }} numberOfLines={2}>
                        {s.title}
                      </AppText>
                      <AppText variant="meta" color="textFaint" style={{ marginTop: 3 }}>
                        {s.metaShort}
                      </AppText>
                    </Touchable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* ── Events & photos ────────────────────────────────────── */}
            {albums.length ? (
              <>
                <SectionHeader title={msgs.home.eventsPhotos} action={msgs.common.seeAll} onAction={() => router.push("/gallery")} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railContent}>
                  {albums.map((g) => (
                    <Touchable key={g.id} haptic="light" onPress={() => router.push(`/gallery/${g.id}`)} style={styles.albumCard}>
                      <View style={[styles.albumCoverWrap, { backgroundColor: t.c.surfaceAlt, borderRadius: t.radii.lg }]}>
                        {g.cover ? (
                          <Image source={{ uri: g.cover }} style={styles.albumCoverImg} />
                        ) : (
                          <CoverArt gradient={g.gradient ? [g.gradient[0], g.gradient[1]] : DEFAULT_ALBUM_GRADIENT} size={104} radius={t.radii.lg} style={styles.coverFill} />
                        )}
                        <View style={styles.countBadge}>
                          <Icon name="image" size={12} color="onBrand" />
                          <AppText variant="caption" color="onBrand" style={{ fontWeight: "700", fontSize: 9.5 }}>
                            {g.count}
                          </AppText>
                        </View>
                      </View>
                      <AppText variant="cardTitle" style={{ fontSize: 13, marginTop: t.space.sm }} numberOfLines={1}>
                        {g.title}
                      </AppText>
                      <AppText variant="meta" color="textFaint" style={{ marginTop: 2 }}>
                        {g.date}
                      </AppText>
                    </Touchable>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {/* ── Latest lectures ────────────────────────────────────── */}
            {homeLatest.length ? (
              <>
                <SectionHeader title={msgs.home.latestLectures} arabic="جديد" />
                <View>
                  {homeLatest.map((l) => (
                    <Touchable key={l.id} haptic="light" onPress={() => openById(l.id)} style={styles.lectureRow}>
                      <View style={styles.lectureCoverWrap}>
                        <CoverArt gradient={[l.gradient[0], l.gradient[1]]} glyph={l.ar} size={60} radius={t.radii.md} />
                        <View style={styles.coverPlayOverlay} pointerEvents="none">
                          <Icon name="play" size={16} color="onBrand" />
                        </View>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.lectureMetaRow}>
                          <MediaBadge type={l.type} />
                          <AppText variant="caption" color="textFaint">
                            {l.date}
                          </AppText>
                        </View>
                        <AppText variant="cardTitle" style={{ fontSize: 14.5, marginTop: 3 }} numberOfLines={1}>
                          {l.title}
                        </AppText>
                        <AppText variant="meta" color="textMuted" style={{ marginTop: 3 }} numberOfLines={1}>
                          {l.sub}
                        </AppText>
                      </View>
                    </Touchable>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </Animated.ScrollView>

      {/* ── Slim translucent bar — fades in once the hero scrolls past ── */}
      <Animated.View
        pointerEvents={compactInteractive ? "auto" : "none"}
        style={[styles.compactBar, { paddingTop: insets.top }, compactBarStyle]}
      >
        <BlurView intensity={80} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <View style={[styles.compactRow, { borderBottomColor: t.c.borderSubtle }]}>
          <Image source={logos.icon} style={styles.compactLogo} resizeMode="contain" />
          <AppText variant="cardTitle" style={{ flex: 1, fontSize: 15 }} numberOfLines={1}>
            {msgs.home.greetingTitle}
          </AppText>
          <Touchable
            haptic="light"
            onPress={() => router.push("/search")}
            accessibilityLabel={msgs.search.placeholder}
            style={[styles.compactSearchBtn, { backgroundColor: t.c.surfaceAlt, borderRadius: t.radii.pill }]}
          >
            <Icon name="search" size={17} color="textPrimary" />
          </Touchable>
        </View>
      </Animated.View>
    </View>
  );
}

function SectionHeader({ title, arabic, action, onAction }: { title: string; arabic?: string; action?: string; onAction?: () => void }) {
  const t = useTheme();
  return (
    <View style={[styles.sectionHeader, { paddingHorizontal: t.space.screen, paddingTop: t.space.xl + 3, paddingBottom: t.space.md + 1 }]}>
      <AppText variant="section" style={{ flex: 1, fontSize: 18 }}>
        {title}
      </AppText>
      {arabic ? (
        <AppText allowFontScaling={false} color="accent" style={{ fontFamily: typography.fonts.arabic, fontSize: 16 }}>
          {arabic}
        </AppText>
      ) : null}
      {action ? (
        <AppText variant="meta" color={t.c.accent} style={{ fontWeight: "700" }} onPress={onAction}>
          {action}
        </AppText>
      ) : null}
    </View>
  );
}

/** Loading placeholders shaped like each rail, so the layout doesn't jump once data arrives. */
function HomeSkeleton() {
  const t = useTheme();
  return (
    <View>
      <View style={styles.continueWrap}>
        <Skeleton height={84} radius={t.radii.lg} />
      </View>

      <View style={styles.grid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width="31%" height={96} radius={t.radii.lg} />
        ))}
      </View>

      <View style={[styles.railContent, { flexDirection: "row" }]}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width={178} height={118} radius={t.radii.lg} />
        ))}
      </View>

      <View style={{ marginTop: t.space.md }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={styles.lectureRow}>
            <Skeleton width={60} height={60} radius={t.radii.md} />
            <View style={{ flex: 1, gap: t.space.xs }}>
              <Skeleton width="35%" height={10} />
              <Skeleton width="75%" height={14} />
              <Skeleton width="55%" height={11} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 32 },
  header: { paddingHorizontal: 20, paddingBottom: 24, overflow: "hidden" },
  headerWatermark: { position: "absolute", right: -30, top: 20, fontFamily: typography.fonts.arabic, fontSize: 150, color: "rgba(255,255,255,0.05)" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontFamily: typography.fonts.arabic, fontSize: 16, letterSpacing: 0.3 },
  emblem: { width: 46, height: 46, borderWidth: 1.5, borderColor: "rgba(228,199,123,0.6)", alignItems: "center", justifyContent: "center" },
  emblemImg: { width: 34, height: 34 },
  searchBar: { marginTop: 20, backgroundColor: "rgba(255,255,255,0.13)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", gap: 11 },
  langPill: { borderWidth: 1, borderColor: "rgba(228,199,123,0.5)", paddingHorizontal: 6, paddingVertical: 2 },

  continueWrap: { marginTop: -26, marginHorizontal: 16 },
  continueCard: { flexDirection: "row", alignItems: "center", gap: 13 },
  continueCover: { width: 58, height: 58 },
  coverPlayOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },

  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },

  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 11 },
  categoryTile: { width: "31%" },
  categoryCard: { alignItems: "center", gap: 7, paddingVertical: 15, paddingHorizontal: 11 },
  categoryAr: { fontFamily: typography.fonts.arabic, fontSize: 25 },

  railContent: { paddingHorizontal: 16, gap: 14, paddingBottom: 4 },
  featuredCard: { width: 178 },
  featuredCoverWrap: { height: 118, width: "100%" },
  coverFill: { width: "100%" },
  kindBadge: { position: "absolute", left: 12, bottom: 12, backgroundColor: "rgba(0,0,0,0.28)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },

  albumCard: { width: 152 },
  albumCoverWrap: { height: 104, overflow: "hidden", position: "relative" },
  albumCoverImg: { width: "100%", height: "100%" },
  countBadge: { position: "absolute", left: 9, top: 9, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },

  lectureRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, paddingVertical: 11 },
  lectureCoverWrap: { width: 60, height: 60 },
  lectureMetaRow: { flexDirection: "row", alignItems: "center", gap: 7 },

  compactBar: { position: "absolute", top: 0, left: 0, right: 0, overflow: "hidden", zIndex: 20 },
  compactRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  compactLogo: { width: 26, height: 26 },
  compactSearchBtn: { width: 34, height: 34, alignItems: "center", justifyContent: "center" },
});
