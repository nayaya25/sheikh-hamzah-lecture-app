import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { font } from "@/lib/fonts";
import type { Gradient } from "@/lib/sampleData";

interface GradientCoverProps {
  gradient: Gradient;
  style?: StyleProp<ViewStyle>;
  /** Large faint Amiri glyph bleeding off a corner, as in the prototype covers. */
  arabic?: string;
  arabicSize?: number;
  children?: ReactNode;
}

/**
 * A CSS-gradient cover reproduced with expo-linear-gradient. The design uses
 * `linear-gradient(140deg,…)`; 140° (CSS, clockwise from top) points down-right,
 * so start=top-left → end=bottom-right.
 *
 * Adds the same "lit" treatment as `components/ui/CoverArt` (a soft top-left
 * highlight + a bottom-right vignette over the base gradient) so gradient
 * tiles look consistent wherever they appear. The tile's own colors come from
 * the caller (per-lecture/series gradients), not from app theme state, so
 * this component has nothing scheme-dependent to theme — it renders the same
 * in light and dark.
 */
export function GradientCover({
  gradient,
  style,
  arabic,
  arabicSize = 74,
  children,
}: GradientCoverProps) {
  return (
    <View style={[styles.base, style]}>
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(255,255,255,0.22)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 0.7 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.30)"]}
        start={{ x: 0.3, y: 0.3 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {arabic ? (
        <Text style={[styles.watermark, { fontSize: arabicSize }]} allowFontScaling={false}>
          {arabic}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: "hidden", position: "relative" },
  watermark: {
    position: "absolute",
    right: -6,
    top: -14,
    fontFamily: font.arabic.regular,
    color: "rgba(255,255,255,0.13)",
    lineHeight: undefined,
  },
});
