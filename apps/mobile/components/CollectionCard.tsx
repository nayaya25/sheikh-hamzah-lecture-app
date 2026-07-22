import { StyleSheet, View, type ViewStyle } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { CoverArt } from "@/components/ui/CoverArt";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import type { Gradient } from "@/lib/sampleData";
import { useTheme } from "@/lib/theme";

export interface CollectionCardProps {
  /** Collection title (Latin). */
  title: string;
  /** Kind label shown as an overline chip, e.g. "Occasion" / "Series" / "Topic". */
  kind: string;
  /** Cover gradient. */
  gradient: Gradient;
  /** Arabic mark on the cover. */
  arabic?: string;
  /** Count line, e.g. "14 lectures". Supply the whole string, or use `count` + `countLabel`. */
  count?: number;
  countLabel?: string;
  /** Pre-formatted count/meta line; overrides `count`/`countLabel` when set. */
  meta?: string;
  /** Show a saved (bookmark) marker on the cover. */
  saved?: boolean;
  onPress?: () => void;
  onToggleSave?: () => void;
  /** Explicit width for grid layout; omit to fill the parent. */
  width?: number;
  style?: ViewStyle;
}

/**
 * Reusable collection cover-art card: gradient cover + Arabic mark (+ optional
 * saved marker) over a body of kind chip, title, and count. Standalone and
 * fully prop-driven so both Home and the Library grid (M2) can render it.
 */
export function CollectionCard({
  title,
  kind,
  gradient,
  arabic,
  count,
  countLabel,
  meta,
  saved,
  onPress,
  onToggleSave,
  width,
  style,
}: CollectionCardProps) {
  const t = useTheme();
  const countText = meta ?? (count != null ? `${count}${countLabel ? ` ${countLabel}` : ""}` : undefined);
  return (
    <Touchable haptic="light" onPress={onPress} accessibilityLabel={`${kind}: ${title}`} style={[width != null ? { width } : { flex: 1 }, style]}>
      <Card elevation="sm" padded={false} style={{ ...styles.card, borderRadius: t.radii.lg }}>
        <View style={styles.coverWrap}>
          <CoverArt gradient={[gradient[0], gradient[1]]} glyph={arabic} size={96} radius={0} style={styles.cover} />
          {saved != null ? (
            <Touchable
              haptic="light"
              hitSlop={8}
              onPress={onToggleSave}
              accessibilityLabel={saved ? "Remove from saved" : "Save collection"}
              style={[styles.fav, { borderRadius: t.radii.pill }]}
            >
              <Icon name="star" family="feather" size={13} color={saved ? "accentText" : "onBrand"} />
            </Touchable>
          ) : null}
        </View>
        <View style={styles.body}>
          <AppText variant="caption" color="accent" style={styles.kind}>
            {kind.toUpperCase()}
          </AppText>
          <AppText variant="cardTitle" style={styles.title} numberOfLines={2}>
            {title}
          </AppText>
          {countText ? (
            <AppText variant="meta" color="textMuted" style={{ marginTop: 6 }} numberOfLines={1}>
              {countText}
            </AppText>
          ) : null}
        </View>
      </Card>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  coverWrap: { height: 96, position: "relative" },
  cover: { width: "100%", height: "100%" },
  fav: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  body: { paddingHorizontal: 13, paddingTop: 12, paddingBottom: 14 },
  kind: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.6 },
  title: { fontSize: 14, fontWeight: "700", marginTop: 5, lineHeight: 18 },
});
