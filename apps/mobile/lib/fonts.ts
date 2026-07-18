import { useFonts } from "expo-font";
import { Amiri_400Regular, Amiri_700Bold } from "@expo-google-fonts/amiri";
import { Lora_400Regular, Lora_500Medium, Lora_600SemiBold } from "@expo-google-fonts/lora";
import {
  Mulish_400Regular,
  Mulish_500Medium,
  Mulish_600SemiBold,
  Mulish_700Bold,
  Mulish_800ExtraBold,
} from "@expo-google-fonts/mulish";

/**
 * Font-family names keyed by role + weight. RN treats each weight as its own
 * family (no synthetic bolding), so styles reference these explicit names rather
 * than a single family + fontWeight. Roles mirror @althaqalayn/theme.typography.
 */
export const font = {
  serif: {
    regular: "Lora_400Regular",
    medium: "Lora_500Medium",
    semibold: "Lora_600SemiBold",
  },
  arabic: {
    regular: "Amiri_400Regular",
    bold: "Amiri_700Bold",
  },
  sans: {
    regular: "Mulish_400Regular",
    medium: "Mulish_500Medium",
    semibold: "Mulish_600SemiBold",
    bold: "Mulish_700Bold",
    extrabold: "Mulish_800ExtraBold",
  },
} as const;

/** Load all app fonts. Returns [loaded, error] like the underlying useFonts. */
export function useAppFonts() {
  return useFonts({
    Lora_400Regular,
    Lora_500Medium,
    Lora_600SemiBold,
    Amiri_400Regular,
    Amiri_700Bold,
    Mulish_400Regular,
    Mulish_500Medium,
    Mulish_600SemiBold,
    Mulish_700Bold,
    Mulish_800ExtraBold,
  });
}
