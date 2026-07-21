import { colors } from "./colors";
import { typography } from "./typography";

const sans = typography.fonts.sans; // "Mulish"
const serif = typography.fonts.serif; // "Lora"

export type TypeRole =
  | "caption" | "meta" | "body" | "bodyLg"
  | "cardTitle" | "section" | "screen" | "display";

export interface TypePreset {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

export const typePresets: Record<TypeRole, TypePreset> = {
  caption:   { fontFamily: sans,  fontSize: 11, lineHeight: 15, letterSpacing: 0.2 },
  meta:      { fontFamily: sans,  fontSize: 12, lineHeight: 16 },
  body:      { fontFamily: sans,  fontSize: 14, lineHeight: 21 },
  bodyLg:    { fontFamily: sans,  fontSize: 16, lineHeight: 24 },
  cardTitle: { fontFamily: sans,  fontSize: 17, lineHeight: 23 },
  section:   { fontFamily: serif, fontSize: 20, lineHeight: 26 },
  screen:    { fontFamily: serif, fontSize: 24, lineHeight: 30 },
  display:   { fontFamily: serif, fontSize: 30, lineHeight: 36, letterSpacing: 0.2 },
};

export const nativeRadii = { sm: 8, md: 14, lg: 20, hero: 26, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, screen: 20 } as const;

export const elevation = {
  sm: { shadowColor: "#0B2C22", shadowOpacity: 0.10, shadowRadius: 8,  shadowOffset: { width: 0, height: 3 },  elevation: 3 },
  md: { shadowColor: "#0B2C22", shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },  elevation: 6 },
  lg: { shadowColor: "#0B2C22", shadowOpacity: 0.20, shadowRadius: 30, shadowOffset: { width: 0, height: 14 }, elevation: 12 },
} as const;

export const motion = {
  duration: { fast: 150, base: 250, slow: 400 },
  easing: { standard: [0.4, 0, 0.2, 1] as const, emphasized: [0.2, 0, 0, 1] as const },
} as const;

export type ColorScheme = "light" | "dark";

export interface SemanticColors {
  bg: string;
  surface: string;
  surfaceAlt: string;
  textPrimary: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderSubtle: string;
  accent: string;      // gold
  accentText: string;  // text/icon on brand-green surfaces
  trackInactive: string;
  onBrand: string;     // text on solid green
}

export const palette: Record<ColorScheme, SemanticColors> = {
  light: {
    bg: colors.cream,
    surface: colors.cardWhite,
    surfaceAlt: colors.creamAlt,
    textPrimary: colors.ink,
    textMuted: colors.muted,
    textFaint: colors.faint,
    border: colors.hairline,
    borderSubtle: colors.hairlineAlt,
    accent: colors.gold,
    accentText: colors.goldLight,
    trackInactive: "#D8D0BE",
    onBrand: "#FFFFFF",
  },
  dark: {
    bg: colors.greenDeepestAlt,       // #062A20
    surface: colors.greenDeepest,     // #08382A
    surfaceAlt: "#0C4232",
    textPrimary: "#F3EEE1",
    textMuted: "#A9B7AE",
    textFaint: "#7C8B81",
    border: "#154235",
    borderSubtle: "#123A2E",
    accent: colors.gold,
    accentText: colors.goldLight,
    trackInactive: "#26463A",
    onBrand: "#FFFFFF",
  },
};

export function resolveTheme(scheme: ColorScheme) {
  return { c: palette[scheme], type: typePresets, radii: nativeRadii, space, elevation, motion, scheme };
}

export type ResolvedTheme = ReturnType<typeof resolveTheme>;
