import { ActivityIndicator, View } from "react-native";
import { colors } from "@althaqalayn/theme";
import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { Touchable } from "./Touchable";
import { useTheme } from "@/lib/theme";

export function Button({
  label, onPress, variant = "primary", loading, icon,
}: { label: string; onPress: () => void; variant?: "primary" | "secondary" | "ghost"; loading?: boolean; icon?: string }) {
  const t = useTheme();
  const bg = variant === "primary" ? colors.greenDeep : variant === "secondary" ? t.c.surfaceAlt : "transparent";
  const fg = variant === "primary" ? "#FFFFFF" : t.c.textPrimary;
  return (
    <Touchable
      haptic="light"
      onPress={onPress}
      disabled={loading}
      accessibilityLabel={label}
      style={{
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: t.space.sm,
        backgroundColor: bg, borderRadius: t.radii.md, paddingVertical: 12, paddingHorizontal: t.space.lg,
        borderWidth: variant === "ghost" ? 1 : 0, borderColor: t.c.border,
      }}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: t.space.sm }}>
          {icon ? <Icon name={icon} size={16} color={fg} /> : null}
          <AppText variant="cardTitle" style={{ color: fg, fontSize: 15 }}>{label}</AppText>
        </View>
      )}
    </Touchable>
  );
}
