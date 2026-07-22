import { useRef } from "react";
import { ActivityIndicator, ScrollView, Share, StyleSheet, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typePresets } from "@althaqalayn/theme";
import { AppText } from "@/components/ui/AppText";
import { CoverArt } from "@/components/ui/CoverArt";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { DownloadButton } from "@/components/DownloadButton";
import { RotatingRing } from "@/components/RotatingRing";
import { Scrubber } from "@/components/player/Scrubber";
import { ValueSheet } from "@/components/player/ValueSheet";
import { useBookmarks } from "@/lib/bookmarks";
import { formatTime, gradientForLecture } from "@/lib/catalog";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { usePlayer } from "@/lib/player";
import { useTheme } from "@/lib/theme";

const ART = 270;
const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2].map((v) => ({ label: `${v}×`, value: v }));
const SLEEP_OPTIONS = [0, 15, 30, 45, 60].map((v) => ({ label: v === 0 ? "Off" : `${v} min`, value: v }));

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useTheme();
  const { t: msgs } = useI18n();
  const {
    current,
    isPlaying,
    position,
    speed,
    sleep,
    sleepRemainingSec,
    buffering,
    hasNext,
    hasPrev,
    togglePlay,
    seekTo,
    nudge,
    next,
    prev,
    cycleSpeed,
    setSpeedValue,
    cycleSleep,
    setSleepMinutes,
  } = usePlayer();

  const speedSheetRef = useRef<BottomSheetModal>(null);
  const sleepSheetRef = useRef<BottomSheetModal>(null);
  const { isBookmarked, toggle: toggleBookmark } = useBookmarks();

  // Nothing loaded (e.g. deep-linked cold) — bail back to the tabs.
  if (!current) {
    router.back();
    return null;
  }

  const bookmarked = isBookmarked(current.id);

  const gradient = gradientForLecture(current);
  const durSec = current.durSec;

  const onShare = () => {
    void Share.share({ message: current.title });
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[gradient[0], gradient[1], "#0a3b2c"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + t.space.md, paddingBottom: insets.bottom + t.space.xxl },
        ]}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Touchable
            onPress={() => router.back()}
            accessibilityLabel="Close player"
            style={[styles.roundBtn, { borderRadius: t.radii.pill }]}
          >
            <Icon name="chevron-down" size={22} color="onBrand" />
          </Touchable>
          <View style={{ alignItems: "center" }}>
            <AppText color="rgba(255,255,255,0.6)" style={styles.nowPlaying}>
              {msgs.player.nowPlaying.toUpperCase()}
            </AppText>
            <AppText color="rgba(255,255,255,0.85)" style={styles.nowCollectionTitle}>
              {current.collectionTitle}
            </AppText>
          </View>
          <Touchable
            onPress={onShare}
            accessibilityLabel="Share"
            style={[styles.roundBtn, { borderRadius: t.radii.pill }]}
          >
            <Icon name="share-2" size={18} color="onBrand" />
          </Touchable>
        </View>

        {/* Artwork */}
        <View style={styles.artWrap}>
          <RotatingRing playing={isPlaying} size={ART} />
          <CoverArt gradient={[gradient[0], gradient[1]]} glyph={current.ar} size={ART} radius={t.radii.hero} />
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <AppText color="onBrand" style={styles.title} numberOfLines={2}>
            {current.title}
          </AppText>
          <AppText color="accentText" style={styles.sub}>
            {current.sub}
          </AppText>
        </View>

        {/* Scrubber */}
        <View style={styles.scrubBlock}>
          <Scrubber position={position} durationSec={durSec} onSeek={seekTo} />
          <View style={styles.timeRow}>
            <AppText color="rgba(255,255,255,0.65)" style={styles.time}>
              {formatTime(position * durSec)}
            </AppText>
            <AppText color="rgba(255,255,255,0.65)" style={styles.time}>
              {formatTime(durSec)}
            </AppText>
          </View>
        </View>

        {/* Transport */}
        <View style={styles.transport}>
          <Touchable
            onPress={prev}
            disabled={!hasPrev}
            haptic="light"
            accessibilityLabel="Previous"
            style={styles.skipEnd}
          >
            <Ionicons name="play-skip-back" size={26} color={hasPrev ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)"} />
          </Touchable>
          <Touchable onPress={() => nudge(-0.05)} haptic="light" accessibilityLabel="Rewind 15 seconds" style={styles.skip}>
            <MaterialCommunityIcons name="rewind-15" size={30} color="#fff" />
          </Touchable>
          <Touchable onPress={togglePlay} haptic="light" accessibilityLabel={isPlaying ? "Pause" : "Play"} style={styles.bigPlay}>
            {buffering ? (
              <ActivityIndicator color={colors.greenDeep} />
            ) : (
              <Ionicons name={isPlaying ? "pause" : "play"} size={30} color={colors.greenDeep} />
            )}
          </Touchable>
          <Touchable onPress={() => nudge(0.05)} haptic="light" accessibilityLabel="Forward 30 seconds" style={styles.skip}>
            <MaterialCommunityIcons name="fast-forward-30" size={30} color="#fff" />
          </Touchable>
          <Touchable
            onPress={next}
            disabled={!hasNext}
            haptic="light"
            accessibilityLabel="Next"
            style={styles.skipEnd}
          >
            <Ionicons name="play-skip-forward" size={26} color={hasNext ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)"} />
          </Touchable>
        </View>

        {/* Action row — Download / Save / Sleep / Speed */}
        <View style={styles.secondary}>
          <View style={styles.secItem}>
            <DownloadButton
              lecture={current}
              size={20}
              showLabel
              tint="onBrand"
              activeTint="accentText"
            />
          </View>
          <Touchable
            style={styles.secItem}
            onPress={() => toggleBookmark(current.id)}
            accessibilityLabel={bookmarked ? msgs.reader.removeBookmark : msgs.reader.bookmark}
            accessibilityState={{ selected: bookmarked }}
          >
            <Icon name="bookmark" size={20} color={bookmarked ? "accentText" : "onBrand"} />
            <AppText
              color={bookmarked ? "accentText" : "rgba(255,255,255,0.6)"}
              style={styles.secLabel}
            >
              {bookmarked ? msgs.library.saved : msgs.reader.bookmark}
            </AppText>
          </Touchable>
          <Touchable
            style={styles.secItem}
            onPress={cycleSleep}
            onLongPress={() => sleepSheetRef.current?.present()}
            accessibilityLabel="Sleep timer"
          >
            <Icon name="clock" size={20} color={sleep ? "accentText" : "onBrand"} />
            <AppText color={sleep ? "accentText" : "rgba(255,255,255,0.6)"} style={styles.secLabel}>
              {sleep ? `Stops in ${formatTime(sleepRemainingSec)}` : msgs.player.sleep}
            </AppText>
          </Touchable>
          <Touchable
            style={styles.secItem}
            onPress={cycleSpeed}
            onLongPress={() => speedSheetRef.current?.present()}
            accessibilityLabel="Playback speed"
          >
            <AppText color="accentText" style={styles.speedLabel}>
              {speed}×
            </AppText>
            <AppText color="rgba(255,255,255,0.6)" style={styles.secLabel}>
              {msgs.player.speed}
            </AppText>
          </Touchable>
        </View>
      </ScrollView>

      <ValueSheet
        ref={speedSheetRef}
        title="Playback speed"
        options={SPEED_OPTIONS}
        selected={speed}
        onSelect={(v) => {
          setSpeedValue(v);
          speedSheetRef.current?.dismiss();
        }}
      />
      <ValueSheet
        ref={sleepSheetRef}
        title="Sleep timer"
        options={SLEEP_OPTIONS}
        selected={sleep}
        onSelect={(v) => {
          setSleepMinutes(v);
          sleepSheetRef.current?.dismiss();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.greenDeepest },
  scroll: { paddingHorizontal: 22 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roundBtn: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  nowPlaying: {
    fontFamily: font.sans.extrabold,
    fontSize: typePresets.caption.fontSize,
    lineHeight: typePresets.caption.lineHeight,
    letterSpacing: 1.2,
  },
  nowCollectionTitle: {
    fontFamily: font.sans.regular,
    fontSize: typePresets.meta.fontSize,
    lineHeight: typePresets.meta.lineHeight,
    marginTop: 2,
  },

  artWrap: { width: ART, height: ART, alignSelf: "center", marginTop: 34, alignItems: "center", justifyContent: "center" },

  titleBlock: { marginTop: 36, alignItems: "center" },
  title: {
    fontFamily: font.serif.semibold,
    fontSize: typePresets.screen.fontSize,
    lineHeight: typePresets.screen.lineHeight,
    textAlign: "center",
  },
  sub: {
    fontFamily: font.sans.regular,
    fontSize: typePresets.body.fontSize,
    lineHeight: typePresets.body.lineHeight,
    marginTop: 6,
  },

  scrubBlock: { marginTop: 4 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  time: { fontFamily: font.sans.regular, fontSize: typePresets.caption.fontSize, lineHeight: typePresets.caption.lineHeight },

  transport: { marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skip: { alignItems: "center" },
  skipEnd: { alignItems: "center", justifyContent: "center" },
  bigPlay: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },

  secondary: {
    marginTop: 26,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  secItem: { flex: 1, alignItems: "center", justifyContent: "flex-start", gap: 6 },
  speedLabel: { fontFamily: font.serif.semibold, fontSize: 18, lineHeight: 20 },
  secLabel: {
    fontFamily: font.sans.regular,
    fontSize: typePresets.caption.fontSize,
    lineHeight: typePresets.caption.lineHeight,
  },
});
