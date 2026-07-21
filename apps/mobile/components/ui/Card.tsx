import { View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/lib/theme";

export function Card({
  children, style, elevation = "sm", padded = true,
}: { children: ReactNode; style?: ViewStyle; elevation?: "sm" | "md" | "lg" | "none"; padded?: boolean }) {
  const t = useTheme();
  const elev = elevation === "none" ? null : t.elevation[elevation];
  return (
    <View
      style={[
        { backgroundColor: t.c.surface, borderRadius: t.radii.lg, borderWidth: 1, borderColor: t.c.borderSubtle },
        padded && { padding: t.space.lg },
        elev,
        style,
      ]}
    >
      {children}
    </View>
  );
}
