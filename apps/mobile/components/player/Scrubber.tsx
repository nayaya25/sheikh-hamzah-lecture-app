import { useEffect, useState } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { AppText } from "@/components/ui/AppText";
import { formatTime } from "@/lib/catalog";
import { useTheme } from "@/lib/theme";

const KNOB_SIZE = 14;
const BUBBLE_WIDTH = 52;

function clampFraction(n: number) {
  "worklet";
  return Math.min(1, Math.max(0, n));
}

export interface ScrubberProps {
  /** 0-1 fraction played. */
  position: number;
  durationSec: number;
  onSeek: (fraction: number) => void;
}

/**
 * Draggable seek bar. Reflects `position` while idle; while the knob is
 * being dragged it tracks the finger and shows a floating time bubble, only
 * committing (`onSeek` + haptic tick) on release.
 */
export function Scrubber({ position, durationSec, onSeek }: ScrubberProps) {
  const t = useTheme();
  const [scrubbing, setScrubbing] = useState(false);
  const [bubbleLabel, setBubbleLabel] = useState("0:00");

  const trackWidth = useSharedValue(0);
  const isScrubbing = useSharedValue(false);
  const dragFraction = useSharedValue(position);

  // Mirror the external `position` while the user isn't actively dragging —
  // reading `.value` on the JS thread is safe, shared values bridge both.
  useEffect(() => {
    if (!isScrubbing.value) dragFraction.value = position;
  }, [position, dragFraction, isScrubbing]);

  const updateLabel = (fraction: number) => setBubbleLabel(formatTime(fraction * durationSec));

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidth.value = e.nativeEvent.layout.width;
  };

  const pan = Gesture.Pan()
    .hitSlop({ top: 16, bottom: 16 })
    .onBegin((e) => {
      isScrubbing.value = true;
      const frac = clampFraction(e.x / trackWidth.value);
      dragFraction.value = frac;
      runOnJS(setScrubbing)(true);
      runOnJS(updateLabel)(frac);
    })
    .onUpdate((e) => {
      const frac = clampFraction(e.x / trackWidth.value);
      dragFraction.value = frac;
      runOnJS(updateLabel)(frac);
    })
    .onEnd((e) => {
      const frac = clampFraction(e.x / trackWidth.value);
      dragFraction.value = frac;
      isScrubbing.value = false;
      runOnJS(setScrubbing)(false);
      runOnJS(onSeek)(frac);
      runOnJS(Haptics.selectionAsync)();
    });

  const fillStyle = useAnimatedStyle(() => ({
    width: dragFraction.value * trackWidth.value,
  }));
  const knobStyle = useAnimatedStyle(() => ({
    left: dragFraction.value * trackWidth.value - KNOB_SIZE / 2,
  }));
  const bubbleStyle = useAnimatedStyle(() => ({
    left: Math.min(
      Math.max(dragFraction.value * trackWidth.value - BUBBLE_WIDTH / 2, 0),
      Math.max(trackWidth.value - BUBBLE_WIDTH, 0),
    ),
  }));

  return (
    <View style={styles.wrap}>
      {scrubbing ? (
        <Animated.View style={[styles.bubble, bubbleStyle, { backgroundColor: "rgba(0,0,0,0.75)" }]}>
          <AppText variant="caption" color="#fff" style={styles.bubbleText}>
            {bubbleLabel}
          </AppText>
        </Animated.View>
      ) : null}
      <GestureDetector gesture={pan}>
        <View onLayout={onTrackLayout} style={[styles.track, { backgroundColor: t.c.trackInactive }]}>
          <Animated.View style={[styles.fill, fillStyle, { backgroundColor: t.c.accent }]} />
          <Animated.View style={[styles.knob, knobStyle]} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 26 },
  track: { height: 5, borderRadius: 3, justifyContent: "center" },
  fill: { position: "absolute", left: 0, height: "100%", borderRadius: 3 },
  knob: {
    position: "absolute",
    top: (5 - KNOB_SIZE) / 2,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubble: {
    position: "absolute",
    top: -22,
    width: BUBBLE_WIDTH,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: "center",
  },
  bubbleText: { lineHeight: 14 },
});
