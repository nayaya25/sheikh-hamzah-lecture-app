import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import { useTheme } from "@/lib/theme";

export interface BrowseTile {
  key: string;
  label: string;
  /** Feather icon name. */
  icon: string;
  onPress: () => void;
}

/**
 * A row of icon tiles for the Home "Browse" section (Occasions / Series /
 * Topics / Gallery). Prop-driven: the caller supplies each tile's label, icon,
 * and navigation. Lays the tiles out evenly across the row.
 */
export function BrowseGrid({ tiles }: { tiles: BrowseTile[] }) {
  const t = useTheme();
  return (
    <View style={[styles.row, { paddingHorizontal: t.space.screen, gap: t.space.md }]}>
      {tiles.map((tile) => (
        <Touchable key={tile.key} haptic="light" onPress={tile.onPress} accessibilityLabel={tile.label} style={styles.tile}>
          <Card elevation="sm" padded={false} style={{ ...styles.iconCard, borderRadius: t.radii.lg }}>
            <Icon name={tile.icon} size={23} color="accent" />
          </Card>
          <AppText variant="caption" color="textMuted" style={styles.label} numberOfLines={1}>
            {tile.label}
          </AppText>
        </Touchable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row" },
  tile: { flex: 1, alignItems: "center", gap: 7 },
  iconCard: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, fontWeight: "600", textAlign: "center" },
});
