import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type GestureResponderEvent,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { RotatingRing } from "@/components/RotatingRing";
import { formatTime } from "@/lib/catalog";
import { font } from "@/lib/fonts";
import { useI18n } from "@/lib/i18n";
import { usePlayer } from "@/lib/player";

const ART = 270;

export default function PlayerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const {
    current,
    isPlaying,
    position,
    speed,
    sleep,
    transcriptOpen,
    togglePlay,
    seekTo,
    nudge,
    cycleSpeed,
    cycleSleep,
    toggleTranscript,
  } = usePlayer();
  const [trackWidth, setTrackWidth] = useState(0);

  // Nothing loaded (e.g. deep-linked cold) — bail back to the tabs.
  if (!current) {
    router.back();
    return null;
  }

  const gradient = current.gradient ?? ["#0B4634", "#17795E"];
  const seriesTitle = current.seriesTitle;
  const durSec = current.durSec;

  const onSeek = (e: GestureResponderEvent) => {
    if (trackWidth > 0) seekTo(e.nativeEvent.locationX / trackWidth);
  };
  const onTrackLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

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
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable style={styles.roundBtn} onPress={() => router.back()}>
            <Feather name="chevron-down" size={22} color="#fff" />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.nowPlaying}>{t.player.nowPlaying.toUpperCase()}</Text>
            <Text style={styles.nowSeries}>{seriesTitle}</Text>
          </View>
          <Pressable style={styles.roundBtn}>
            <Feather name="share-2" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Artwork */}
        <View style={styles.artWrap}>
          <RotatingRing playing={isPlaying} size={ART} />
          <View style={styles.artInner}>
            <LinearGradient colors={[gradient[0], gradient[1]]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={{ alignItems: "center" }}>
              <Text style={styles.artAr} allowFontScaling={false}>
                {current.ar}
              </Text>
              <Text style={styles.artType}>{current.type.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.sub}>{current.sub}</Text>
        </View>

        {/* Scrubber */}
        <View style={styles.scrubBlock}>
          <Pressable onPress={onSeek} onLayout={onTrackLayout} style={styles.track} hitSlop={10}>
            <View style={[styles.trackFill, { width: `${position * 100}%` }]} />
            <View style={[styles.knob, { left: `${position * 100}%` }]} />
          </Pressable>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(position * durSec)}</Text>
            <Text style={styles.time}>{formatTime(durSec)}</Text>
          </View>
        </View>

        {/* Transport */}
        <View style={styles.transport}>
          <Ionicons name="play-skip-back" size={26} color="rgba(255,255,255,0.85)" />
          <Pressable style={styles.skip} onPress={() => nudge(-0.05)}>
            <MaterialCommunityIcons name="rewind-15" size={30} color="#fff" />
          </Pressable>
          <Pressable style={styles.bigPlay} onPress={togglePlay}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={30} color={colors.greenDeep} />
          </Pressable>
          <Pressable style={styles.skip} onPress={() => nudge(0.05)}>
            <MaterialCommunityIcons name="fast-forward-30" size={30} color="#fff" />
          </Pressable>
          <Ionicons name="play-skip-forward" size={26} color="rgba(255,255,255,0.85)" />
        </View>

        {/* Secondary controls */}
        <View style={styles.secondary}>
          <Pressable style={styles.secItem} onPress={cycleSpeed}>
            <Text style={styles.speedLabel}>{speed}×</Text>
            <Text style={styles.secLabel}>{t.player.speed}</Text>
          </Pressable>
          <Pressable style={styles.secItem} onPress={cycleSleep}>
            <Feather name="clock" size={19} color="#fff" />
            <Text style={[styles.secLabel, sleep ? styles.secActive : null]}>
              {sleep ? `${sleep}m` : t.player.sleep}
            </Text>
          </Pressable>
          <Pressable style={styles.secItem}>
            <Feather name="download" size={19} color="#fff" />
            <Text style={styles.secLabel}>{t.player.download}</Text>
          </Pressable>
          <Pressable style={styles.secItem} onPress={toggleTranscript}>
            <Feather name="align-left" size={19} color="#fff" />
            <Text style={[styles.secLabel, transcriptOpen ? styles.secActive : null]}>
              {t.player.transcript}
            </Text>
          </Pressable>
        </View>

        {transcriptOpen ? (
          <View style={styles.transcript}>
            <View style={styles.transcriptHead}>
              <Text style={styles.transcriptTag}>TRANSCRIPT · HAUSA</Text>
              <Text style={styles.transcriptMeta}>Auto · beta</Text>
            </View>
            <Text style={styles.transcriptBody}>
              <Text style={styles.transcriptHl}>
                Bismillahir Rahmanir Rahim. Yau za mu yi magana a kan ma'anar rahamar Allah…
              </Text>{" "}
              Rahama ita ce tushen kowace ni'ima, kuma ita ce ke nuna girman Ubangiji ga bayinsa.
            </Text>
          </View>
        ) : null}
      </ScrollView>
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
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  nowPlaying: { fontFamily: font.sans.extrabold, fontSize: 10, letterSpacing: 1.2, color: "rgba(255,255,255,0.6)" },
  nowSeries: { fontFamily: font.sans.regular, fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },

  artWrap: { width: ART, height: ART, alignSelf: "center", marginTop: 34, alignItems: "center", justifyContent: "center" },
  artInner: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  artAr: { fontFamily: font.arabic.regular, fontSize: 80, color: "rgba(255,255,255,0.92)", lineHeight: 92 },
  artType: { fontFamily: font.sans.regular, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.7)", marginTop: 4 },

  titleBlock: { marginTop: 36, alignItems: "center" },
  title: { fontFamily: font.serif.semibold, fontSize: 22, color: "#fff", textAlign: "center", lineHeight: 28 },
  sub: { fontFamily: font.sans.regular, fontSize: 13, color: colors.goldLight, marginTop: 6 },

  scrubBlock: { marginTop: 26 },
  track: { height: 5, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, justifyContent: "center" },
  trackFill: { position: "absolute", left: 0, height: "100%", backgroundColor: colors.goldLight, borderRadius: 3 },
  knob: {
    position: "absolute",
    marginLeft: -6.5,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  time: { fontFamily: font.sans.regular, fontSize: 11, color: "rgba(255,255,255,0.65)" },

  transport: { marginTop: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  skip: { alignItems: "center" },
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

  secondary: { marginTop: 26, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 },
  secItem: { alignItems: "center", gap: 4 },
  speedLabel: { fontFamily: font.serif.semibold, fontSize: 15, color: colors.goldLight },
  secLabel: { fontFamily: font.sans.regular, fontSize: 9.5, color: "rgba(255,255,255,0.6)" },
  secActive: { color: colors.goldLight },

  transcript: {
    marginTop: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 18,
    padding: 16,
  },
  transcriptHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  transcriptTag: { fontFamily: font.sans.extrabold, fontSize: 11, letterSpacing: 0.8, color: colors.goldLight },
  transcriptMeta: { fontFamily: font.sans.regular, fontSize: 10, color: "rgba(255,255,255,0.5)" },
  transcriptBody: { fontFamily: font.sans.regular, fontSize: 13, lineHeight: 22, color: "rgba(255,255,255,0.9)" },
  transcriptHl: { backgroundColor: "rgba(228,199,123,0.24)", color: "#fff" },
});
