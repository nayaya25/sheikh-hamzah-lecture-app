import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@althaqalayn/theme";
import { GradientCover } from "@/components/GradientCover";
import { MediaBadge } from "@/components/MediaBadge";
import { gradientForLecture, type Playable } from "@/lib/catalog";
import { font } from "@/lib/fonts";

/**
 * Shared lecture row (gradient play-cover + type badge + title + sub), used by
 * Library, Search, and Downloads. `meta` is the optional text beside the badge
 * (a duration or date); `right` is an optional trailing element.
 */
export function LectureListRow({
  lecture,
  meta,
  onPress,
  coverSize = 56,
}: {
  lecture: Playable;
  meta?: string;
  onPress?: () => void;
  coverSize?: number;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <GradientCover
        gradient={gradientForLecture(lecture)}
        style={[styles.cover, { width: coverSize, height: coverSize }]}
      >
        <Ionicons name="play" size={16} color="#fff" />
      </GradientCover>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.metaRow}>
          <MediaBadge type={lecture.type} />
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {lecture.title}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {lecture.sub}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, paddingVertical: 11 },
  cover: { borderRadius: 13, alignItems: "center", justifyContent: "center" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  meta: { fontFamily: font.sans.regular, fontSize: 10.5, color: colors.faintAlt },
  title: { fontFamily: font.serif.semibold, fontSize: 14, color: colors.ink, marginTop: 3 },
  sub: { fontFamily: font.sans.regular, fontSize: 11.5, color: colors.mutedAlt, marginTop: 2 },
});
