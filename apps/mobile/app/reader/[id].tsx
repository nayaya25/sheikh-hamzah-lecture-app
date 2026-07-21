import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { getLecture } from "@althaqalayn/api";
import { languageNames } from "@althaqalayn/i18n";
import type { ColorScheme } from "@althaqalayn/theme";
import type { Lecture } from "@althaqalayn/types";
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView, type BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBookmarks } from "@/lib/bookmarks";
import { useCatalog } from "@/lib/catalogProvider";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { getClient } from "@/lib/supabase";
import { loadJSON, saveJSON, StorageKeys } from "@/lib/storage";
import { useTheme } from "@/lib/theme";

const FONT_SIZES = [
  { key: "sm", label: "Small", scale: 0.85 },
  { key: "md", label: "Medium", scale: 1 },
  { key: "lg", label: "Large", scale: 1.2 },
  { key: "xl", label: "Extra large", scale: 1.5 },
];
const DEFAULT_FONT_SCALE = 1;
const SAVE_SCROLL_DEBOUNCE_MS = 400;

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

/** Reading-surface colors, distinct from the app chrome theme — driven by the resolved reader scheme (app scheme, unless locally overridden). */
const READER_PALETTES: Record<ColorScheme, Record<string, string>> = {
  light: {
    bg: "#F4ECD8",
    topBar: "rgba(244,236,216,0.96)",
    border: "#e2d3ab",
    iconBg: "#fff",
    icon: "#3a2c10",
    reading: "#8a6f3a",
    bismillah: "#b98f35",
    title: "#2a2008",
    sub: "#8a6f3a",
    rule: "#c9ab5f",
    star: "#b98f35",
    dropCap: "#b98f35",
    body: "#3a2c10",
    empty: "#8a6f3a",
    accent: "#b98f35",
    progressTrack: "#e2d3ab",
    sheetBg: "#F4ECD8",
    sheetRowBorder: "#e2d3ab",
  },
  dark: {
    bg: "#1B1712",
    topBar: "rgba(27,23,18,0.96)",
    border: "#3A2F22",
    iconBg: "#241E17",
    icon: "#EFE6D0",
    reading: "#C9AD73",
    bismillah: "#D9B65C",
    title: "#F1E7CE",
    sub: "#C9AD73",
    rule: "#5A4A30",
    star: "#D9B65C",
    dropCap: "#D9B65C",
    body: "#E8DFC8",
    empty: "#B8A981",
    accent: "#D9B65C",
    progressTrack: "#3A2F22",
    sheetBg: "#241E17",
    sheetRowBorder: "#3A2F22",
  },
};

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useI18n();
  const { lectureById } = useCatalog();
  const appTheme = useTheme();
  const { isBookmarked, toggle: toggleBookmark } = useBookmarks();

  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontScale, setFontScale] = useState(DEFAULT_FONT_SCALE);
  const [themeOverride, setThemeOverride] = useState<ColorScheme | null>(null);
  const [progress, setProgress] = useState(0);

  const fontSheetRef = useRef<BottomSheetModal>(null);
  const scrollRef = useRef<ScrollView>(null);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const savedFractionRef = useRef<number | null>(null);
  const restoredScrollRef = useRef(false);
  const saveScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheme: ColorScheme = themeOverride ?? appTheme.scheme;
  const pal = READER_PALETTES[scheme];

  useEffect(() => {
    void (async () => {
      try {
        const client = getClient();
        if (client) setLecture(await getLecture(client, id));
      } catch {
        // leave null → empty state
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Reading preferences: font size + local theme override, both persisted independent of any single lecture.
  useEffect(() => {
    void loadJSON<number>(StorageKeys.readerFont, DEFAULT_FONT_SCALE).then(setFontScale);
    void loadJSON<ColorScheme | null>(StorageKeys.readerTheme, null).then(setThemeOverride);
  }, []);

  // Saved scroll position for this lecture (a 0..1 fraction, like the audio resume map) — restored once both the
  // stored value and the ScrollView's layout/content sizes are known.
  useEffect(() => {
    restoredScrollRef.current = false;
    contentHeightRef.current = 0;
    layoutHeightRef.current = 0;
    savedFractionRef.current = null;
    void loadJSON<Record<string, number>>(StorageKeys.readerScroll, {}).then((map) => {
      savedFractionRef.current = map[id] ?? null;
      tryRestoreScroll();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(
    () => () => {
      if (saveScrollTimeoutRef.current) clearTimeout(saveScrollTimeoutRef.current);
    },
    [],
  );

  const tryRestoreScroll = useCallback(() => {
    if (restoredScrollRef.current) return;
    if (layoutHeightRef.current <= 0 || contentHeightRef.current <= 0) return;
    const frac = savedFractionRef.current;
    restoredScrollRef.current = true;
    if (frac == null) return;
    const maxOffset = contentHeightRef.current - layoutHeightRef.current;
    if (maxOffset > 0) scrollRef.current?.scrollTo({ y: clamp(frac, 0, 1) * maxOffset, animated: false });
  }, []);

  const scheduleSaveScroll = useCallback(
    (lectureId: string, fraction: number) => {
      if (saveScrollTimeoutRef.current) clearTimeout(saveScrollTimeoutRef.current);
      saveScrollTimeoutRef.current = setTimeout(() => {
        void (async () => {
          const map = await loadJSON<Record<string, number>>(StorageKeys.readerScroll, {});
          map[lectureId] = fraction;
          await saveJSON(StorageKeys.readerScroll, map);
        })();
      }, SAVE_SCROLL_DEBOUNCE_MS);
    },
    [],
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const maxOffset = contentHeightRef.current - layoutHeightRef.current;
      const frac = maxOffset > 0 ? clamp(y / maxOffset, 0, 1) : 0;
      setProgress(frac);
      scheduleSaveScroll(id, frac);
    },
    [id, scheduleSaveScroll],
  );

  const onContentSizeChange = useCallback(
    (_w: number, h: number) => {
      contentHeightRef.current = h;
      tryRestoreScroll();
    },
    [tryRestoreScroll],
  );

  const onLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      layoutHeightRef.current = e.nativeEvent.layout.height;
      tryRestoreScroll();
    },
    [tryRestoreScroll],
  );

  const selectFontSize = useCallback((scale: number) => {
    setFontScale(scale);
    void saveJSON(StorageKeys.readerFont, scale);
    fontSheetRef.current?.dismiss();
  }, []);

  const toggleReaderTheme = useCallback(() => {
    const next: ColorScheme = scheme === "dark" ? "light" : "dark";
    setThemeOverride(next);
    void saveJSON(StorageKeys.readerTheme, next);
  }, [scheme]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  const meta = lectureById(id);
  const title = lecture ? (lecture.title.en ?? lecture.title.ha ?? "") : (meta?.title ?? "Reading");
  const body = lang === "ha" ? lecture?.body?.ha ?? lecture?.body?.en : lecture?.body?.en ?? lecture?.body?.ha;
  const paragraphs = (body ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  const bodySize = 15 * fontScale;
  const bodyStyle = { fontFamily: font.serif.regular, fontSize: bodySize, lineHeight: bodySize * 1.9, color: pal.body };
  const bookmarked = isBookmarked(id);

  return (
    <View style={[styles.root, { backgroundColor: pal.bg }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <View style={[styles.topBar, { paddingTop: insets.top + 8, backgroundColor: pal.topBar, borderBottomColor: pal.border }]}>
        <Pressable style={[styles.iconBtn, { backgroundColor: pal.iconBg, borderColor: pal.border }]} onPress={() => router.back()}>
          <Feather name="chevron-left" size={19} color={pal.icon} />
        </Pressable>
        <Text style={[styles.reading, { color: pal.reading }]}>
          {t.reader.reading.toUpperCase()} · {languageNames[lang]}
        </Text>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: pal.iconBg, borderColor: pal.border }]}
          onPress={() => fontSheetRef.current?.present()}
          accessibilityLabel="Font size"
        >
          <Text style={[styles.aaLabel, { color: pal.icon }]}>Aa</Text>
        </Pressable>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: pal.iconBg, borderColor: pal.border }]}
          onPress={toggleReaderTheme}
          accessibilityLabel={scheme === "dark" ? "Switch to light reading theme" : "Switch to dark reading theme"}
        >
          <Feather name={scheme === "dark" ? "sun" : "moon"} size={17} color={pal.accent} />
        </Pressable>
        <Pressable
          style={[styles.iconBtn, { backgroundColor: pal.iconBg, borderColor: pal.border }]}
          onPress={() => toggleBookmark(id)}
          accessibilityLabel={bookmarked ? "Remove bookmark" : t.reader.bookmark}
        >
          <Ionicons name={bookmarked ? "bookmark" : "bookmark-outline"} size={17} color={pal.accent} />
        </Pressable>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: pal.progressTrack }]}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: pal.accent }]} />
      </View>

      {loading ? (
        <ActivityIndicator color={pal.accent} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onContentSizeChange={onContentSizeChange}
          onLayout={onLayout}
        >
          <Text style={[styles.bismillah, { color: pal.bismillah }]} allowFontScaling={false}>
            ﷽
          </Text>
          <Text style={[styles.title, { color: pal.title }]}>{title}</Text>
          {meta?.sub ? <Text style={[styles.sub, { color: pal.sub }]}>{meta.sub}</Text> : null}
          <View style={styles.divider}>
            <View style={[styles.rule, { backgroundColor: pal.rule }]} />
            <Text style={[styles.star, { color: pal.star }]} allowFontScaling={false}>
              ✦
            </Text>
            <View style={[styles.rule, { backgroundColor: pal.rule }]} />
          </View>

          {paragraphs.length === 0 ? (
            <Text style={[styles.empty, { color: pal.empty }]}>No text available for this lecture yet.</Text>
          ) : (
            paragraphs.map((p, i) =>
              i === 0 ? (
                <Text key={i} style={[bodyStyle, styles.para]}>
                  <Text style={[styles.dropCap, { color: pal.dropCap }]} allowFontScaling={false}>
                    {p.charAt(0)}
                  </Text>
                  {p.slice(1)}
                </Text>
              ) : (
                <Text key={i} style={[bodyStyle, styles.para]}>
                  {p}
                </Text>
              ),
            )
          )}
        </ScrollView>
      )}

      <BottomSheetModal
        ref={fontSheetRef}
        enableDynamicSizing
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: pal.sheetBg }}
        handleIndicatorStyle={{ backgroundColor: pal.border }}
      >
        <BottomSheetView style={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}>
          <Text style={[styles.sheetTitle, { color: pal.title }]}>Font size</Text>
          {FONT_SIZES.map((opt) => {
            const isSelected = opt.scale === fontScale;
            return (
              <Pressable
                key={opt.key}
                onPress={() => selectFontSize(opt.scale)}
                style={[styles.sheetRow, { borderBottomColor: pal.sheetRowBorder }]}
              >
                <Text style={{ fontFamily: font.serif.regular, fontSize: 15 * opt.scale, color: isSelected ? pal.accent : pal.body }}>
                  {opt.label}
                </Text>
                {isSelected ? <Feather name="check" size={18} color={pal.accent} /> : <View style={{ width: 18 }} />}
              </Pressable>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  reading: { flex: 1, textAlign: "center", fontFamily: font.sans.bold, fontSize: 11, letterSpacing: 1 },
  aaLabel: { fontFamily: font.serif.semibold, fontSize: 14 },
  progressTrack: { height: 2, width: "100%" },
  progressFill: { height: 2 },
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 60, maxWidth: 360, alignSelf: "center" },
  bismillah: { textAlign: "center", fontFamily: font.arabic.regular, fontSize: 22 },
  title: { textAlign: "center", fontFamily: font.serif.semibold, fontSize: 24, marginTop: 14, lineHeight: 30 },
  sub: { textAlign: "center", fontFamily: font.sans.regular, fontSize: 12, marginTop: 8 },
  divider: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginVertical: 18 },
  rule: { width: 40, height: 1 },
  star: { fontFamily: font.arabic.regular },
  para: { marginBottom: 16 },
  dropCap: { fontFamily: font.serif.semibold, fontSize: 40 },
  empty: { fontFamily: font.sans.regular, fontSize: 13, textAlign: "center", marginTop: 20 },
  sheetContent: { paddingHorizontal: 22, paddingTop: 6 },
  sheetTitle: { fontFamily: font.serif.semibold, fontSize: 17, marginBottom: 8 },
  sheetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1 },
});
