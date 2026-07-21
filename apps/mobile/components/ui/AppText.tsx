import { Text, type TextProps } from "react-native";
import type { SemanticColors, TypeRole } from "@althaqalayn/theme";
import { useTheme } from "@/lib/theme";

export function AppText({
  variant = "body",
  color = "textPrimary",
  style,
  ...rest
}: TextProps & { variant?: TypeRole; color?: keyof SemanticColors | string }) {
  const t = useTheme();
  const preset = t.type[variant];
  const resolved = (t.c as unknown as Record<string, string>)[color as string] ?? (color as string);
  return <Text {...rest} style={[preset, { color: resolved }, style]} />;
}
