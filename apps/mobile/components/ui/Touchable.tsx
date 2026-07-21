import { Pressable, type PressableProps } from "react-native";
import * as Haptics from "expo-haptics";

export function Touchable({
  haptic = "selection",
  scaleTo,
  onPress,
  style,
  children,
  ...rest
}: PressableProps & { haptic?: "selection" | "light" | "none"; scaleTo?: number }) {
  const fireHaptic = () => {
    if (haptic === "none") return;
    if (haptic === "light") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else void Haptics.selectionAsync();
  };
  return (
    <Pressable
      accessibilityRole="button"
      onPress={(e) => {
        fireHaptic();
        onPress?.(e);
      }}
      style={(state) => {
        const base = typeof style === "function" ? style(state) : style;
        return [
          base,
          { opacity: state.pressed ? 0.6 : 1, transform: scaleTo && state.pressed ? [{ scale: scaleTo }] : [] },
        ];
      }}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
