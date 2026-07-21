import { View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography } from "@althaqalayn/theme";
import { AppText } from "./AppText";

export interface CoverArtProps {
  gradient?: [string, string];
  glyph?: string;
  size?: number;
  radius?: number;
  style?: ViewStyle;
}

/**
 * Elevated generated cover: base gradient + a soft top-left highlight +
 * a bottom-right vignette + a centered Arabic glyph watermark, producing a
 * "lit" designed tile rather than a flat gradient.
 *
 * Drop-in visual upgrade for `GradientCover` — accepts the same
 * gradient/glyph inputs callers already pass (`colors.topicGradients[...]`).
 */
export function CoverArt({
  gradient = [colors.greenDeep, colors.greenHighlightAlt],
  glyph,
  size = 120,
  radius = 14,
  style,
}: CoverArtProps) {
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: "hidden" }, style]}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.22)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.7 }}
        style={{ position: "absolute", inset: 0 }}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.30)"]}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
        pointerEvents="none"
      />
      {glyph ? (
        <AppText
          allowFontScaling={false}
          style={{
            position: "absolute",
            right: -size * 0.06,
            top: -size * 0.12,
            fontFamily: typography.fonts.arabic,
            fontSize: size * 0.62,
            color: "rgba(255,255,255,0.18)",
          }}
        >
          {glyph}
        </AppText>
      ) : null}
    </View>
  );
}
