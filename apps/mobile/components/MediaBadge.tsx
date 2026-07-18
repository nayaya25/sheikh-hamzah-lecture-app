import { StyleSheet, Text, View } from "react-native";
import { colors } from "@althaqalayn/theme";
import type { MediaType } from "@althaqalayn/types";
import { font } from "@/lib/fonts";

/** Small type pill (AUDIO / VIDEO / TEXT) with the spec's per-type bg/fg. */
export function MediaBadge({ type }: { type: MediaType }) {
  const badge = colors.mediaBadge[type];
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Text style={[styles.label, { color: badge.fg }]}>{type.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  label: { fontFamily: font.sans.extrabold, fontSize: 9, letterSpacing: 0.5 },
});
