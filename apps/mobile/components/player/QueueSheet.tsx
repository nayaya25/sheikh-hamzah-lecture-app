import { forwardRef, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import type { Playable } from "@/lib/catalog";
import { useTheme } from "@/lib/theme";

export interface QueueSheetProps {
  title: string;
  queue: Playable[];
  /** Index of the currently-playing track in `queue`. */
  currentIndex: number;
  moveUpLabel: string;
  moveDownLabel: string;
  /** Jump to the tapped track. */
  onJump: (index: number) => void;
  /** Reorder: move the track at `from` to `to`. */
  onMove: (from: number, to: number) => void;
}

/**
 * "Up next" — a bottom sheet listing the current session queue with the playing
 * track highlighted. Tapping a row jumps to it; per-row up/down buttons reorder
 * the queue (a drag lib would add a dependency, so move buttons are used).
 */
export const QueueSheet = forwardRef<BottomSheetModal, QueueSheetProps>(function QueueSheet(
  { title, queue, currentIndex, moveUpLabel, moveDownLabel, onJump, onMove },
  ref,
) {
  const t = useTheme();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={ref}
      enableDynamicSizing
      maxDynamicContentSize={480}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: t.c.surface }}
      handleIndicatorStyle={{ backgroundColor: t.c.border }}
    >
      <BottomSheetScrollView contentContainerStyle={[styles.content, { paddingBottom: t.space.xl }]}>
        <AppText variant="section" style={styles.title}>
          {title}
        </AppText>
        {queue.map((item, i) => {
          const isCurrent = i === currentIndex;
          return (
            <View
              key={`${item.id}-${i}`}
              style={[
                styles.row,
                { borderBottomColor: t.c.borderSubtle },
                isCurrent ? { backgroundColor: t.c.trackInactive } : null,
              ]}
            >
              <Touchable onPress={() => onJump(i)} style={styles.rowMain} accessibilityState={{ selected: isCurrent }}>
                <View style={styles.indexCol}>
                  {isCurrent ? (
                    <Icon name="volume-2" size={16} color="accent" />
                  ) : (
                    <AppText variant="caption" color="textFaint">
                      {i + 1}
                    </AppText>
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText
                    variant="body"
                    color={isCurrent ? "accent" : "textPrimary"}
                    numberOfLines={1}
                    style={{ fontWeight: isCurrent ? "700" : "500" }}
                  >
                    {item.title}
                  </AppText>
                  {item.collectionTitle ?? item.sub ? (
                    <AppText variant="caption" color="textFaint" numberOfLines={1} style={{ marginTop: 1 }}>
                      {item.collectionTitle ?? item.sub}
                    </AppText>
                  ) : null}
                </View>
              </Touchable>
              <View style={styles.moveCol}>
                <Touchable
                  onPress={() => onMove(i, i - 1)}
                  disabled={i === 0}
                  hitSlop={6}
                  accessibilityLabel={moveUpLabel}
                  style={styles.moveBtn}
                >
                  <Icon name="chevron-up" size={20} color={i === 0 ? "textFaint" : "textMuted"} />
                </Touchable>
                <Touchable
                  onPress={() => onMove(i, i + 1)}
                  disabled={i === queue.length - 1}
                  hitSlop={6}
                  accessibilityLabel={moveDownLabel}
                  style={styles.moveBtn}
                >
                  <Icon name="chevron-down" size={20} color={i === queue.length - 1 ? "textFaint" : "textMuted"} />
                </Touchable>
              </View>
            </View>
          );
        })}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 6 },
  title: { marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  rowMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 6 },
  indexCol: { width: 22, alignItems: "center" },
  moveCol: { flexDirection: "row", alignItems: "center", gap: 2, paddingRight: 2 },
  moveBtn: { padding: 4 },
});
