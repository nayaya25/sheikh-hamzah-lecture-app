import { forwardRef, useCallback } from "react";
import { StyleSheet, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { useTheme } from "@/lib/theme";

export interface ValueSheetOption {
  label: string;
  value: number;
}

export interface ValueSheetProps {
  title: string;
  options: ValueSheetOption[];
  selected: number;
  onSelect: (value: number) => void;
}

/**
 * A titled list of selectable numeric values presented as a
 * `BottomSheetModal`. The ref is forwarded straight onto the underlying
 * modal, so callers drive it with the library's own `present()`/`dismiss()`.
 */
export const ValueSheet = forwardRef<BottomSheetModal, ValueSheetProps>(function ValueSheet(
  { title, options, selected, onSelect },
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
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: t.c.surface }}
      handleIndicatorStyle={{ backgroundColor: t.c.border }}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: t.space.xl }]}>
        <AppText variant="section" style={styles.title}>
          {title}
        </AppText>
        {options.map((opt) => {
          const isSelected = opt.value === selected;
          return (
            <Touchable
              key={opt.value}
              onPress={() => onSelect(opt.value)}
              style={[styles.row, { borderBottomColor: t.c.borderSubtle }]}
            >
              <AppText variant="bodyLg" color={isSelected ? "accent" : "textPrimary"}>
                {opt.label}
              </AppText>
              {isSelected ? (
                <Icon name="check" size={20} color="accent" />
              ) : (
                <View style={{ width: 20 }} />
              )}
            </Touchable>
          );
        })}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 6 },
  title: { marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
});
