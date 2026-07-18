import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet } from "react-native";

/**
 * Gold ring around the player artwork that spins (8s/rev, linear) only while
 * playing — matches the prototype's `spin 8s linear infinite`.
 */
export function RotatingRing({ playing, size }: { playing: boolean; size: number }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!playing) {
      spin.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 8000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [playing, spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View
      style={[
        styles.ring,
        { width: size, height: size, borderRadius: size / 2, transform: [{ rotate }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "rgba(228,199,123,0.4)",
    borderTopColor: "rgba(228,199,123,0.9)",
  },
});
