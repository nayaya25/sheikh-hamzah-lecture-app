import { View } from "react-native";
import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "@althaqalayn/theme";
import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { Touchable } from "./Touchable";
import { useTheme } from "@/lib/theme";

export function Header({
  title, arabic, variant = "hero", onBack, right,
}: { title: string; arabic?: string; variant?: "hero" | "compact"; onBack?: () => void; right?: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const hero = variant === "hero";
  return (
    <LinearGradient
      colors={[colors.greenDeep, colors.greenMid, colors.greenHighlight]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{
        paddingTop: insets.top + t.space.md,
        paddingBottom: hero ? t.space.xl : t.space.md,
        paddingHorizontal: t.space.screen,
        borderBottomLeftRadius: t.radii.hero, borderBottomRightRadius: t.radii.hero,
        overflow: "hidden",
      }}
    >
      {arabic ? (
        <AppText style={{ position: "absolute", right: -6, top: -18, fontFamily: typography.fonts.arabic, fontSize: 120, color: "rgba(255,255,255,0.08)" }} allowFontScaling={false}>
          {arabic}
        </AppText>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.space.md }}>
        {onBack ? (
          <Touchable onPress={onBack} accessibilityLabel="Go back" style={{ width: 38, height: 38, borderRadius: t.radii.pill, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="chevron-left" color="#FFFFFF" />
          </Touchable>
        ) : null}
        <AppText variant={hero ? "screen" : "section"} style={{ color: "#FFFFFF", flex: 1 }}>{title}</AppText>
        {right}
      </View>
    </LinearGradient>
  );
}
