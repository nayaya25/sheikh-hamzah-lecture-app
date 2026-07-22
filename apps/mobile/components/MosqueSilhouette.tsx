import { View, type ViewStyle } from "react-native";

/**
 * Decorative mosque skyline — domes + minarets — sitting along the bottom of
 * the green hero. Reproduced with plain RN Views (no `react-native-svg` in this
 * app's dependency set): each dome is a half-disc over a body block and each
 * minaret is a slim shaft capped by a small dome + spire. Purely presentational
 * and `color`-prop driven, so the same silhouette works on any hero tint.
 */
export function MosqueSilhouette({
  color = "rgba(0,0,0,0.22)",
  height = 92,
  style,
}: {
  color?: string;
  height?: number;
  style?: ViewStyle;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        { height, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", overflow: "hidden" },
        style,
      ]}
    >
      <Minaret color={color} shaft={height * 0.7} />
      <FlatBlock color={color} w={26} h={height * 0.42} />
      <Dome color={color} size={44} body={height * 0.34} />
      <FlatBlock color={color} w={22} h={height * 0.5} />
      <Dome color={color} size={72} body={height * 0.42} spire />
      <FlatBlock color={color} w={22} h={height * 0.5} />
      <Dome color={color} size={44} body={height * 0.34} />
      <FlatBlock color={color} w={26} h={height * 0.42} />
      <Minaret color={color} shaft={height * 0.7} />
    </View>
  );
}

/** A half-disc dome over a rectangular body; optional finial spire on top. */
function Dome({ color, size, body, spire = false }: { color: string; size: number; body: number; spire?: boolean }) {
  return (
    <View style={{ alignItems: "center" }}>
      {spire ? <View style={{ width: 3, height: 12, backgroundColor: color, borderRadius: 2 }} /> : null}
      <View
        style={{
          width: size,
          height: size * 0.62,
          backgroundColor: color,
          borderTopLeftRadius: size,
          borderTopRightRadius: size,
        }}
      />
      <View style={{ width: size * 0.82, height: body, backgroundColor: color }} />
    </View>
  );
}

/** A slim minaret: shaft + small dome cap + spire. */
function Minaret({ color, shaft }: { color: string; shaft: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 3, height: 9, backgroundColor: color, borderRadius: 2 }} />
      <View style={{ width: 14, height: 12, backgroundColor: color, borderTopLeftRadius: 7, borderTopRightRadius: 7 }} />
      <View style={{ width: 9, height: shaft, backgroundColor: color }} />
    </View>
  );
}

/** A plain flat-roofed building block between the domes. */
function FlatBlock({ color, w, h }: { color: string; w: number; h: number }) {
  return <View style={{ width: w, height: h, backgroundColor: color, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />;
}
