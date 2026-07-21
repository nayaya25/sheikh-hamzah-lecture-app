import { useEffect } from "react";
import { type DimensionValue, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useTheme } from "@/lib/theme";

export function Skeleton({
  width = "100%", height = 16, radius, style,
}: { width?: DimensionValue; height?: number; radius?: number; style?: ViewStyle }) {
  const t = useTheme();
  const o = useSharedValue(0.4);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.9, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius ?? t.radii.sm, backgroundColor: t.c.surfaceAlt }, anim, style]}
    />
  );
}
