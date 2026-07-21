// Compact download/remove control bound to the real offline-download engine
// (`useDownloads`, Task 1/2). No local state — it's a thin view over
// `entry(lecture.id)`:
//   idle      -> download icon, tap starts the download.
//   queued/
//   downloading -> spinner + percentage (no SVG ring; kept compact per brief).
//   downloaded -> check icon, tap confirms then removes the local file.
//   failed    -> alert icon, tap retries.
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import type { SemanticColors } from "@althaqalayn/theme";
import { AppText } from "@/components/ui/AppText";
import { Icon } from "@/components/ui/Icon";
import { Touchable } from "@/components/ui/Touchable";
import type { Playable } from "@/lib/catalog";
import { useDownloads } from "@/lib/downloads";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

type Tint = keyof SemanticColors | string;

/** Not a theme semantic color (there's no "danger" token yet) — a brand-adjacent
 * warning red, close to the existing video-media-badge accent. */
const FAILED_TINT = "#C0524B";

export function DownloadButton({
  lecture,
  size = 20,
  showLabel = false,
  tint = "textFaint",
  activeTint = "accent",
}: {
  lecture: Playable;
  size?: number;
  showLabel?: boolean;
  /** Icon/label color while idle. Pass a fixed-dark-background color (e.g. "onBrand") for screens like the player that don't sit on the theme's light/dark surface. */
  tint?: Tint;
  /** Icon/label color while queued, downloading, or downloaded. */
  activeTint?: Tint;
}) {
  const t = useTheme();
  const { t: msgs } = useI18n();
  const { entry, download, remove } = useDownloads();

  const e = entry(lecture.id);
  const status = e?.status ?? "idle";
  const busy = status === "queued" || status === "downloading";
  const pct = Math.round((e?.progress ?? 0) * 100);

  const resolve = (color: Tint): string =>
    (t.c as unknown as Record<string, string>)[color as string] ?? (color as string);

  const onPress = () => {
    if (status === "idle" || status === "failed") {
      download(lecture);
      return;
    }
    if (status === "downloaded") {
      Alert.alert("Remove download?", `"${lecture.title}" will be deleted from this device.`, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => remove(lecture.id) },
      ]);
    }
    // queued/downloading: no-op — the Touchable below is disabled.
  };

  let icon;
  let caption: string;
  let a11yLabel: string;
  if (busy) {
    icon = <ActivityIndicator size="small" color={resolve(activeTint)} />;
    caption = status === "downloading" ? `${pct}%` : "Queued";
    a11yLabel = status === "downloading" ? `Downloading, ${pct} percent` : "Queued for download";
  } else if (status === "downloaded") {
    icon = <Icon name="check-circle" size={size} color={activeTint} />;
    caption = "Downloaded";
    a11yLabel = "Downloaded. Double tap to remove.";
  } else if (status === "failed") {
    icon = <Icon name="alert-circle" size={size} color={FAILED_TINT} />;
    caption = "Retry";
    a11yLabel = "Download failed. Double tap to retry.";
  } else {
    icon = <Icon name="download" size={size} color={tint} />;
    caption = msgs.player.download;
    a11yLabel = msgs.player.download;
  }

  const captionColor = status === "failed" ? FAILED_TINT : status === "idle" ? tint : activeTint;

  return (
    <Touchable
      onPress={onPress}
      disabled={busy}
      haptic="light"
      hitSlop={8}
      accessibilityLabel={a11yLabel}
      accessibilityState={{ disabled: busy, busy }}
      style={[styles.wrap, { gap: t.space.xs }]}
    >
      <View style={[styles.iconSlot, { width: size, height: size }]}>{icon}</View>
      {showLabel ? (
        <AppText variant="caption" color={captionColor} style={styles.caption}>
          {caption}
        </AppText>
      ) : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  iconSlot: { alignItems: "center", justifyContent: "center" },
  caption: { textAlign: "center" },
});
