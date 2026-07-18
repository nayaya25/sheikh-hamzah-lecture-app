import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { colors } from "@althaqalayn/theme";

/**
 * Three gold equalizer bars that animate only while playing (spec: "animate only
 * while playing"), otherwise sit at a low static height.
 */
export function EqBars({ playing }: { playing: boolean }) {
  return (
    <View style={styles.row}>
      <Bar playing={playing} delay={0} />
      <Bar playing={playing} delay={150} />
      <Bar playing={playing} delay={300} />
    </View>
  );
}

function Bar({ playing, delay }: { playing: boolean; delay: number }) {
  const scale = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (!playing) {
      Animated.timing(scale, { toValue: 0.4, duration: 200, useNativeDriver: true }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.35, duration: 450, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [playing, delay, scale]);

  return <Animated.View style={[styles.bar, { transform: [{ scaleY: scale }] }]} />;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 16 },
  bar: { width: 3, height: 16, borderRadius: 2, backgroundColor: colors.goldLight },
});
