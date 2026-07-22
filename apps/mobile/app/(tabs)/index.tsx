import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "@althaqalayn/theme";
import type { CollectionKind } from "@althaqalayn/types";
import { BrowseGrid, type BrowseTile } from "@/components/BrowseGrid";
import { ContinueCard } from "@/components/ContinueCard";
import { HomeHero } from "@/components/HomeHero";
import { LectureListRow } from "@/components/LectureListRow";
import { SpotlightCard } from "@/components/SpotlightCard";
import { AppText } from "@/components/ui/AppText";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineErrorBanner } from "@/components/ui/InlineErrorBanner";
import { Skeleton } from "@/components/ui/Skeleton";
import { durationLabel } from "@/lib/catalog";
import { useCatalog } from "@/lib/catalogProvider";
import { useI18n } from "@/lib/i18n";
import { MINI_PLAYER_GAP, MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from "@/lib/layout";
import { openLecture } from "@/lib/openLecture";
import { usePlayer } from "@/lib/player";
import { loadJSON, StorageKeys } from "@/lib/storage";
import { useTheme } from "@/lib/theme";

// English gloss for the hero verse — brand copy, kept alongside the Arabic which
// never flips with the language toggle.
const VERSE_ARABIC = "صَدَقَةٌ جَارِيَة";
const VERSE_TRANSLATION = "An ongoing charity — the preserved lectures of the late Sheikh Hamzah (QS)";

// Feather icons for the Browse tiles.
const KIND_ICON: Record<CollectionKind, string> = { occasion: "calendar", series: "layers", topic: "tag" };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const { t: msgs, arabic } = useI18n();
  const { play, progressFor } = usePlayer();
  const { loading, error, refetch, latestLectures, featuredLectures, lectureById } = useCatalog();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // "Continue listening" from real playback history (StorageKeys.lastPlayed), resolved on focus.
  const [contId, setContId] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      void (async () => {
        const last = await loadJSON<{ id: string } | null>(StorageKeys.lastPlayed, null);
        const lecture = last ? lectureById(last.id) : undefined;
        if (active) setContId(lecture ? lecture.id : null);
      })();
      return () => {
        active = false;
      };
    }, [lectureById]),
  );

  const contLecture = contId ? lectureById(contId) : undefined;
  const contProgress = contLecture ? progressFor(contLecture.id) : 0;
  const contMinLeft = contLecture ? Math.round((contLecture.durSec * (1 - contProgress)) / 60) : 0;

  // The featured "lecture of the day": first featured lecture, else the most recent.
  const spotlight = featuredLectures[0] ?? latestLectures[0];

  const open = (id?: string) => {
    if (!id) return;
    const lecture = lectureById(id);
    if (lecture) openLecture(router, play, lecture);
  };

  const browseTiles: BrowseTile[] = [
    { key: "occasion", label: msgs.library.occasions, icon: KIND_ICON.occasion, onPress: () => router.push("/library?segment=occasion") },
    { key: "series", label: msgs.library.series, icon: KIND_ICON.series, onPress: () => router.push("/library?segment=series") },
    { key: "topic", label: msgs.library.topics, icon: KIND_ICON.topic, onPress: () => router.push("/library?segment=topic") },
    { key: "gallery", label: msgs.gallery.title, icon: "image", onPress: () => router.push("/gallery") },
  ];

  const hasData = latestLectures.length > 0 || featuredLectures.length > 0;
  const empty = !contLecture && !hasData;

  return (
    <View style={[styles.root, { backgroundColor: t.c.bg }]}>
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + insets.bottom + MINI_PLAYER_GAP + MINI_PLAYER_HEIGHT + t.space.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={t.c.textPrimary} colors={[colors.greenMid]} />
        }
      >
        <HomeHero
          greeting={arabic.greeting}
          title={msgs.home.greetingTitle}
          poweredByLabel="Powered by"
          foundationName="Althaqalayn Foundation"
          verseArabic={VERSE_ARABIC}
          verseTranslation={VERSE_TRANSLATION}
          topInset={insets.top}
          onPressSettings={() => router.push("/settings")}
          settingsLabel={msgs.settings.title}
        />

        {loading && !hasData ? (
          <HomeSkeleton />
        ) : error && !hasData ? (
          <EmptyState icon="alert-triangle" title={msgs.library.couldntLoad} body={error} action={{ label: msgs.common.retry, onPress: () => void refetch() }} />
        ) : empty ? (
          <EmptyState icon="headphones" title={msgs.library.noLecturesYet} body="Published content will appear here." />
        ) : (
          <>
            {error ? <InlineErrorBanner message={error} onRetry={() => void refetch()} /> : null}

            {/* ── Continue listening (floats over the hero) ── */}
            {contLecture ? (
              <ContinueCard
                lecture={contLecture}
                progress={contProgress}
                minutesLeft={contMinLeft}
                eyebrow={msgs.home.continueListening}
                minutesLeftLabel={msgs.home.minutesLeft}
                onPress={() => open(contLecture.id)}
              />
            ) : (
              <View style={{ marginTop: -46 + 14 }} />
            )}

            {/* ── Featured "lecture of the day" ── */}
            {spotlight ? (
              <>
                <SectionHeader title={msgs.home.featured} />
                <SpotlightCard
                  lecture={spotlight}
                  badgeLabel={msgs.home.lectureOfTheDay}
                  actionLabel={msgs.home.listenNow}
                  metaLabel={`${spotlight.collectionTitle ?? spotlight.sub} · ${durationLabel(spotlight)}`}
                  onPress={() => open(spotlight.id)}
                />
              </>
            ) : null}

            {/* ── Browse ── */}
            <SectionHeader title={msgs.home.browse} arabic="استكشف" />
            <BrowseGrid tiles={browseTiles} />

            {/* ── Latest ── */}
            {latestLectures.length ? (
              <>
                <SectionHeader title={msgs.home.latestLectures} arabic="جديد" action={msgs.common.seeAll} onAction={() => router.push("/library")} />
                <View>
                  {latestLectures.map((l) => (
                    <LectureListRow key={l.id} lecture={l} meta={durationLabel(l)} onPress={() => open(l.id)} />
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

/** Loading placeholders shaped like the composed sections. */
function HomeSkeleton() {
  const t = useTheme();
  return (
    <View>
      <View style={{ marginTop: -46, marginHorizontal: t.space.screen }}>
        <Skeleton height={86} radius={t.radii.lg} />
      </View>
      <View style={{ marginTop: t.space.xl, marginHorizontal: t.space.screen }}>
        <Skeleton height={172} radius={t.radii.hero} />
      </View>
      <View style={[styles.skelRow, { paddingHorizontal: t.space.screen, gap: t.space.md, marginTop: t.space.xl }]}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={56} height={56} radius={t.radii.lg} />
        ))}
      </View>
      <View style={{ marginTop: t.space.xl }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.skelLecture}>
            <Skeleton width={56} height={56} radius={t.radii.md} />
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
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  skelRow: { flexDirection: "row" },
  skelLecture: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, paddingVertical: 11 },
});
