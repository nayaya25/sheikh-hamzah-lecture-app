import { useCallback, useMemo, useState } from "react";
import { Dimensions, Modal, StyleSheet, View, type ListRenderItemInfo } from "react-native";
import { FlatList, Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";
import type { Photo } from "@althaqalayn/types";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { useTheme } from "@/lib/theme";

const MAX_SCALE = 4;
const DISMISS_THRESHOLD = 110;

function clamp(value: number, lo: number, hi: number) {
  "worklet";
  return Math.min(hi, Math.max(lo, value));
}

interface LightboxPageProps {
  photo: Photo;
  pageWidth: number;
  pageHeight: number;
  onRequestClose: () => void;
  onZoomChange: (zoomed: boolean) => void;
}

/** One full-screen page: pinch-to-zoom, pan-when-zoomed, swipe-down-to-dismiss, tap-to-close. */
function LightboxPage({ photo, pageWidth, pageHeight, onRequestClose, onZoomChange }: LightboxPageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const dismissY = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  const reportZoom = useCallback(
    (z: boolean) => {
      setZoomed(z);
      onZoomChange(z);
    },
    [onZoomChange],
  );

  const resetZoom = () => {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, 1, MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.02) {
        resetZoom();
        runOnJS(reportZoom)(false);
      } else {
        runOnJS(reportZoom)(true);
      }
    });

  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((e) => {
      if (savedScale.value <= 1) return;
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const dismissPan = Gesture.Pan()
    .enabled(!zoomed)
    .activeOffsetY([-14, 14])
    .failOffsetX([-18, 18])
    .onUpdate((e) => {
      dismissY.value = e.translationY;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationY) > DISMISS_THRESHOLD) {
        runOnJS(onRequestClose)();
      } else {
        dismissY.value = withTiming(0);
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        resetZoom();
        runOnJS(reportZoom)(false);
      } else {
        scale.value = withTiming(2.5);
        savedScale.value = 2.5;
        runOnJS(reportZoom)(true);
      }
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => runOnJS(onRequestClose)());

  const tap = Gesture.Exclusive(doubleTap, singleTap);
  const composed = Gesture.Simultaneous(Gesture.Race(dismissPan, Gesture.Simultaneous(pinch, pan)), tap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + dismissY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.page, { width: pageWidth, height: pageHeight }]}>
        <Animated.View style={imageStyle}>
          <Image
            source={{ uri: photo.url }}
            style={{ width: pageWidth, height: pageHeight }}
            contentFit="contain"
            transition={200}
            cachePolicy="memory-disk"
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

export function Lightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}) {
  const t = useTheme();
  const { width, height } = useMemo(() => Dimensions.get("window"), []);
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Photo>) => (
      <LightboxPage
        photo={item}
        pageWidth={width}
        pageHeight={height}
        onRequestClose={onClose}
        onZoomChange={setZoomed}
      />
    ),
    [width, height, onClose],
  );

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={[styles.backdrop, { width, height }]}>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            setIndex(i);
          }}
        />

        <Touchable
          onPress={onClose}
          haptic="light"
          accessibilityLabel="Close"
          style={[styles.closeBtn, { top: t.space.xl }]}
        >
          <Icon name="x" color="#FFFFFF" size={20} />
        </Touchable>

        {photos.length > 1 ? (
          <View style={[styles.counter, { bottom: t.space.xl }]}>
            <AppText color="#FFFFFF" variant="caption">
              {index + 1} / {photos.length}
            </AppText>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.95)" },
  page: { alignItems: "center", justifyContent: "center" },
  closeBtn: {
    position: "absolute",
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
});
