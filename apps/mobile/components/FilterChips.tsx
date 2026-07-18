import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "@althaqalayn/theme";
import { font } from "@/lib/fonts";

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
            style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
          >
            {chip.dotColor ? (
              <View style={[styles.dot, { backgroundColor: on ? "#fff" : chip.dotColor }]} />
            ) : null}
            <Text style={[styles.label, on ? styles.labelOn : styles.labelOff]}>{chip.label}</Text>
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
  chipOn: { backgroundColor: colors.greenDeep },
  chipOff: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#E4DCC9" },
  dot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
  label: { fontSize: 12 },
  labelOn: { fontFamily: font.sans.bold, color: "#fff" },
  labelOff: { fontFamily: font.sans.semibold, color: "#5a665f" },
});
