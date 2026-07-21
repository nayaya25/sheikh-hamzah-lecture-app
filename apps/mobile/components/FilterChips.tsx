import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";
import { useTheme } from "@/lib/theme";

export interface Chip<K extends string> {
  key: K;
  label: string;
  /** Colored leading dot (media-type filters); omitted → no dot. */
  dotColor?: string;
}

/**
 * Horizontal pill filter row. Active pill = filled deep-green; its dot turns
 * white. Used by Search (no dots) and Library's media filter (colored dots).
 */
export function FilterChips<K extends string>({
  chips,
  active,
  onPick,
}: {
  chips: Chip<K>[];
  active: K;
  onPick: (key: K) => void;
}) {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {chips.map((chip) => {
        const on = chip.key === active;
        return (
          <Pressable
            key={chip.key}
            onPress={() => onPick(chip.key)}
            style={[
              styles.chip,
              on
                ? { backgroundColor: colors.greenDeep }
                : { backgroundColor: t.c.surface, borderWidth: 1, borderColor: t.c.border },
            ]}
          >
            {chip.dotColor ? (
              <View style={[styles.dot, { backgroundColor: on ? t.c.onBrand : chip.dotColor }]} />
            ) : null}
            <Text
              style={[
                styles.label,
                on
                  ? { fontFamily: font.sans.bold, color: t.c.onBrand }
                  : { fontFamily: font.sans.semibold, color: t.c.textMuted },
              ]}
            >
              {chip.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 18, paddingVertical: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
  label: { fontSize: 12 },
});
