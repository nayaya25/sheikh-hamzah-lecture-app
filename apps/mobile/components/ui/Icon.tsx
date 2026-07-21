import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import type { SemanticColors } from "@althaqalayn/theme";
import { useTheme } from "@/lib/theme";

export function Icon({
  name,
  size = 20,
  color = "textPrimary",
  family = "feather",
}: {
  name: string;
  size?: number;
  color?: keyof SemanticColors | string;
  family?: "feather" | "mci";
}) {
  const t = useTheme();
  const resolved = (t.c as unknown as Record<string, string>)[color as string] ?? (color as string);
  if (family === "mci") {
    return <MaterialCommunityIcons name={name as never} size={size} color={resolved} />;
  }
  return <Feather name={name as never} size={size} color={resolved} />;
}
