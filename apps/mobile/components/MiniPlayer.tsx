import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@althaqalayn/theme";
import { EqBars } from "@/components/EqBars";
import { GradientCover } from "@/components/GradientCover";
import { font } from "@/lib/fonts";
import { MINI_PLAYER_GAP, TAB_BAR_HEIGHT } from "@/lib/layout";
import { usePlayer } from "@/lib/player";

/**
 * Green bar above the tab nav showing the current track. Rendered once in the
 * root layout so it survives tab switches. Hidden with nothing loaded or while
 * the full player is open. Tap to expand.
 */
export function MiniPlayer() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { current, isPlaying, togglePlay } = usePlayer();

  if (!current || pathname === "/player") return null;

  return (
    <Pressable
      style={[styles.bar, { bottom: insets.bottom + TAB_BAR_HEIGHT + MINI_PLAYER_GAP }]}
      onPress={() => router.push("/player")}
    >
      <GradientCover gradient={current.gradient ?? ["#0B4634", "#17795E"]} style={styles.cover}>
        <EqBars playing={isPlaying} />
      </GradientCover>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} numberOfLines={1}>
          {current.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {current.sub}
        </Text>
      </View>
      <Pressable
        hitSlop={8}
        onPress={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        style={styles.playBtn}
      >
        <Ionicons name={isPlaying ? "pause" : "play"} size={18} color={colors.greenDeep} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 8,
    right: 8,
    zIndex: 40,
    backgroundColor: colors.greenDeep,
    borderRadius: 16,
    padding: 9,
    paddingRight: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    shadowColor: "#0B4634",
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  cover: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: font.serif.semibold, fontSize: 13, color: "#fff" },
  sub: { fontFamily: font.sans.regular, fontSize: 10.5, color: "rgba(228,199,123,0.9)" },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.goldLight,
    alignItems: "center",
    justifyContent: "center",
  },
});
