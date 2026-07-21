import { colors } from "@althaqalayn/theme";
import { AppText } from "./AppText";
import { Touchable } from "./Touchable";
import { useTheme } from "@/lib/theme";

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Touchable
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        paddingHorizontal: t.space.lg, paddingVertical: t.space.sm, borderRadius: t.radii.pill,
        backgroundColor: active ? colors.greenDeep : t.c.surface,
        borderWidth: 1, borderColor: active ? colors.greenDeep : t.c.border,
      }}
    >
      <AppText variant="meta" style={{ color: active ? "#FFFFFF" : t.c.textMuted, fontWeight: "600" }}>{label}</AppText>
    </Touchable>
  );
}
