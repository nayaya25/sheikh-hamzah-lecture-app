import { View } from "react-native";
import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { Touchable } from "./Touchable";
import { useTheme } from "@/lib/theme";

/**
 * Small "couldn't refresh" banner with a Retry action, shown above cached
 * content when a background refetch fails but there's still data on screen —
 * as opposed to `EmptyState`, which replaces the whole screen and is only
 * appropriate when there's no data to show at all.
 */
export function InlineErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: t.space.sm,
        marginHorizontal: t.space.screen,
        marginTop: t.space.md,
        padding: t.space.md,
        borderRadius: t.radii.md,
        backgroundColor: t.c.surfaceAlt,
        borderWidth: 1,
        borderColor: t.c.border,
      }}
    >
      <Icon name="alert-triangle" size={16} color="textMuted" />
      <AppText variant="meta" color="textMuted" style={{ flex: 1 }} numberOfLines={2}>
        {message}
      </AppText>
      <Touchable haptic="light" onPress={onRetry} accessibilityLabel="Retry" hitSlop={8}>
        <AppText variant="meta" color="accent" style={{ fontWeight: "700" }}>
          Retry
        </AppText>
      </Touchable>
    </View>
  );
}
