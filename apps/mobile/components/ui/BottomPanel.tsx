import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme";

/**
 * Imperative handle exposed by {@link BottomPanel}. Mirrors the
 * `present()`/`dismiss()` surface of `@gorhom/bottom-sheet`'s
 * `BottomSheetModal`, so existing callers keep working unchanged.
 */
export interface BottomPanelHandle {
  present: () => void;
  dismiss: () => void;
}

export interface BottomPanelProps {
  children: ReactNode;
  /** Fired after the panel finishes dismissing (matches gorhom's onDismiss). */
  onDismiss?: () => void;
  /** Cap the card height as a fraction of the screen (default 0.85). */
  maxHeightPct?: number;
  /** Wrap children in a scroll view (default true). */
  scroll?: boolean;
}

/**
 * A dependency-free bottom sheet built on React Native's own `Modal`. Gorhom's
 * modal present-path crashes in release builds on this app, so the player and
 * playlist sheets reimplement on this instead. Renders a dimmed, tap-to-dismiss
 * backdrop and a bottom-anchored, theme-aware rounded card with a grabber and
 * safe-area bottom padding.
 */
export const BottomPanel = forwardRef<BottomPanelHandle, BottomPanelProps>(
  function BottomPanel({ children, onDismiss, maxHeightPct = 0.85, scroll = true }, ref) {
    const t = useTheme();
    const insets = useSafeAreaInsets();
    const [visible, setVisible] = useState(false);

    useImperativeHandle(
      ref,
      () => ({
        present: () => setVisible(true),
        dismiss: () => setVisible(false),
      }),
      [],
    );

    const handleDismiss = useCallback(() => {
      setVisible(false);
    }, []);

    // RN Modal fires onDismiss (iOS) inconsistently, so drive the callback from
    // our own close path to stay cross-platform.
    const requestClose = useCallback(() => {
      setVisible(false);
      onDismiss?.();
    }, [onDismiss]);

    const maxHeight = Math.round(Dimensions.get("window").height * maxHeightPct);

    const body = scroll ? (
      <ScrollView
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, t.space.md) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    ) : (
      <View style={{ paddingBottom: Math.max(insets.bottom, t.space.md) }}>{children}</View>
    );

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={requestClose}
        onDismiss={handleDismiss}
      >
        <View style={styles.root}>
          <Pressable
            style={styles.backdrop}
            accessibilityRole="button"
            onPress={requestClose}
          />
          <View
            style={[
              styles.card,
              {
                backgroundColor: t.c.surface,
                borderTopLeftRadius: t.radii.hero,
                borderTopRightRadius: t.radii.hero,
                maxHeight,
              },
            ]}
          >
            <View style={styles.grabberWrap}>
              <View style={[styles.grabber, { backgroundColor: t.c.border }]} />
            </View>
            {body}
          </View>
        </View>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  card: {
    paddingTop: 6,
    overflow: "hidden",
  },
  grabberWrap: { alignItems: "center", paddingVertical: 8 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
});
