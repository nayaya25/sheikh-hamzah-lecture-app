import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";

const HOLD_MS = 2000;
const FADE_MS = 600;

/**
 * In-app launch splash: cream logo plate, pulsing gold dots, tagline. Holds ~2s
 * then fades out; tappable to skip. Shown once per cold start over everything.
 * (Placeholder wordmark until the Foundation logo SVG is wired via a transformer.)
 */
export function SplashOverlay() {
  const [gone, setGone] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const dismiss = () =>
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.04, duration: FADE_MS, useNativeDriver: true }),
      ]).start(() => setGone(true));
    const timer = setTimeout(dismiss, HOLD_MS);
    return () => clearTimeout(timer);
  }, [opacity, scale]);

  if (gone) return null;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity }]} pointerEvents="auto">
      <Pressable style={StyleSheet.absoluteFill} onPress={() => setGone(true)} />
      <LinearGradient
        colors={[colors.greenMid, colors.greenDeep, "#072d22"]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.watermark} allowFontScaling={false}>
        ﷲ
      </Text>

      <Animated.View style={[styles.center, { transform: [{ scale }] }]}>
        <View style={styles.plate}>
          <Text style={styles.wordmark} allowFontScaling={false}>
            الثقلين
          </Text>
          <Text style={styles.plateName}>ALTHAQALAYN</Text>
          <Text style={styles.plateSub}>CULTURAL FOUNDATION</Text>
        </View>
      </Animated.View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          <Dot delay={0} />
          <Dot delay={200} />
          <Dot delay={400} />
        </View>
        <Text style={styles.tagline}>
          Preserving the lectures of Sheikh Hamzah Muhammad Lawal (QS)
        </Text>
      </View>
    </Animated.View>
  );
}

function Dot({ delay }: { delay: number }) {
  const o = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 600, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.35, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o, delay]);
  return <Animated.View style={[styles.dot, { opacity: o }]} />;
}

const styles = StyleSheet.create({
  root: { zIndex: 100, alignItems: "center", justifyContent: "center" },
  watermark: { position: "absolute", top: -30, fontFamily: font.arabic.regular, fontSize: 220, color: "rgba(228,199,123,0.05)" },
  center: { alignItems: "center" },
  plate: {
    backgroundColor: "#F7F2E8",
    borderWidth: 1,
    borderColor: "rgba(228,199,123,0.55)",
    borderRadius: 28,
    paddingVertical: 26,
    paddingHorizontal: 34,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 24 },
    elevation: 12,
  },
  wordmark: { fontFamily: font.arabic.bold, fontSize: 40, color: colors.greenDeep },
  plateName: { fontFamily: font.sans.extrabold, fontSize: 15, letterSpacing: 3, color: colors.greenDeep, marginTop: 8 },
  plateSub: { fontFamily: font.sans.semibold, fontSize: 9, letterSpacing: 2, color: colors.gold, marginTop: 3 },
  bottom: { position: "absolute", bottom: 56, alignItems: "center", gap: 14, paddingHorizontal: 40 },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.goldLight },
  tagline: { fontFamily: font.sans.regular, fontSize: 11, color: "rgba(228,199,123,0.75)", textAlign: "center" },
});
