import { View } from "react-native";
import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { useTheme } from "@/lib/theme";

export function EmptyState({
  icon, title, body, action,
}: { icon: string; title: string; body?: string; action?: { label: string; onPress: () => void } }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: t.space.xl, gap: t.space.sm }}>
      <View style={{ width: 64, height: 64, borderRadius: t.radii.pill, backgroundColor: t.c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={26} color="textMuted" />
      </View>
      <AppText variant="cardTitle" style={{ marginTop: t.space.sm, textAlign: "center" }}>{title}</AppText>
      {body ? <AppText variant="body" color="textMuted" style={{ textAlign: "center", maxWidth: 280 }}>{body}</AppText> : null}
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" /> : null}
    </View>
  );
}
