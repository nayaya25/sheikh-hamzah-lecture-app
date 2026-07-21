import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GradientCover } from "@/components/GradientCover";
import { MediaBadge } from "@/components/MediaBadge";
import { useBookmarks } from "@/lib/bookmarks";
import { gradientForLecture, type Playable } from "@/lib/catalog";
import { font } from "@/lib/fonts";
import { useTheme } from "@/lib/theme";

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
  const t = useTheme();
  const { isBookmarked, toggle } = useBookmarks();
  const bookmarked = isBookmarked(lecture.id);
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <GradientCover
        gradient={gradientForLecture(lecture)}
        style={[styles.cover, { width: coverSize, height: coverSize }]}
      >
        <Ionicons name="play" size={16} color={t.c.onBrand} />
      </GradientCover>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.metaRow}>
          <MediaBadge type={lecture.type} />
          {meta ? <Text style={[styles.meta, { color: t.c.textFaint }]}>{meta}</Text> : null}
        </View>
        <Text style={[styles.title, { color: t.c.textPrimary }]} numberOfLines={1}>
          {lecture.title}
        </Text>
        <Text style={[styles.sub, { color: t.c.textMuted }]} numberOfLines={1}>
          {lecture.sub}
        </Text>
      </View>
      <Pressable
        onPress={() => toggle(lecture.id)}
        hitSlop={10}
        style={styles.bookmarkBtn}
        accessibilityLabel={bookmarked ? "Remove from saved" : "Save lecture"}
      >
        <Ionicons
          name={bookmarked ? "bookmark" : "bookmark-outline"}
          size={18}
          color={bookmarked ? t.c.accent : t.c.textFaint}
        />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 13, paddingHorizontal: 16, paddingVertical: 11 },
  bookmarkBtn: { padding: 4 },
  cover: { borderRadius: 13, alignItems: "center", justifyContent: "center" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  meta: { fontFamily: font.sans.regular, fontSize: 10.5 },
  title: { fontFamily: font.serif.semibold, fontSize: 14, marginTop: 3 },
  sub: { fontFamily: font.sans.regular, fontSize: 11.5, marginTop: 2 },
});
