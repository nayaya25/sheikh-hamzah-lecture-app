# Mobile Premium Redesign — Plan 1: Foundation & Shell

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Each task ends with typecheck + commit; steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the design-token system, light/dark theming, the shared component primitives, and the app shell (blur tab bar, splash, transitions, catalog error/refetch) so every later screen migration is a consumer of one consistent foundation.

**Architecture:** Additive `packages/theme` native token layer + an `apps/mobile/lib/theme.tsx` `ThemeProvider`/`useTheme()`; a `components/ui/*` primitive set; shell wiring in `app/_layout.tsx` + `(tabs)/_layout.tsx`. Old screens keep working off the existing `colors` export throughout — nothing user-facing breaks until later plans migrate screens.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, React 19, TypeScript, Reanimated 4.5 (+ Gesture Handler 2.32, both already installed), expo-image, expo-haptics, @gorhom/bottom-sheet, expo-blur. Theme package tested with vitest.

## Global Constraints

- **Expo v57 changed.** Per `apps/mobile/AGENTS.md`: read `https://docs.expo.dev/versions/v57.0.0/` for any expo-* API (expo-image, expo-haptics, expo-blur, expo-splash-screen) before writing it. Do not assume older API shapes.
- **Additive only in `packages/theme`** — do NOT remove or change existing exports (`colors`, `typography`, `spacing`, `radii`, `shadows`, `gradients`, `adminLight`, `adminDark`); the web admin depends on them. Add a new native layer alongside.
- **Nothing breaks:** existing mobile screens continue importing `colors` and rendering as before until later plans migrate them. Plan 1 does not restyle existing screens' content (only the shell chrome + provider wiring).
- **Client-SPA data pattern unchanged**; all persistence via `apps/mobile/lib/storage.ts` (`loadJSON`/`saveJSON`, `StorageKeys`).
- **Brand:** keep green/gold identity (`colors.greenDeep #0B4634`, `colors.gold #C79A3B`, `colors.goldLight #E4C77B`); dark theme derives from the same brand.
- **Fonts** come from `@/lib/fonts` (`font.serif/arabic/sans.*`) and `typography.fonts` (`Lora`/`Amiri`/`Mulish`). Do not add fonts.
- **Per-task gate:** `pnpm --filter mobile typecheck` passes (and `pnpm --filter @althaqalayn/theme typecheck` + `pnpm --filter @althaqalayn/theme test` for theme tasks). A full `npx expo export` is the heavier CI-level check, not required per task. No RN-render tests in this plan.

---

## File structure

**`packages/theme/` (additive):**
- Create `src/native.ts` — RN-shaped tokens: `typePresets`, `nativeRadii`, `space`, `elevation`, `motion`, `palette.light`, `palette.dark`, `resolveTheme(scheme)`.
- Modify `src/index.ts` — export the new native tokens.
- Create `src/native.test.ts` — vitest coverage of `resolveTheme` + preset shape.

**`apps/mobile/lib/`:**
- Create `theme.tsx` — `ThemeProvider`, `useTheme()`, scheme persistence, StatusBar wiring.
- Modify `catalogProvider.tsx` — add `error` + `refetch`.

**`apps/mobile/components/ui/` (new primitives):**
- `AppText.tsx`, `Icon.tsx`, `Touchable.tsx`, `Card.tsx`, `Header.tsx`, `EmptyState.tsx`, `Skeleton.tsx`, `Chip.tsx`, `Button.tsx`, `CoverArt.tsx`, `index.ts` (barrel).

**`apps/mobile/lib/layout.ts`** (new) — shared shell constants (`TAB_BAR_HEIGHT`, `MINI_PLAYER_HEIGHT`, `MINI_PLAYER_GAP`).

**Modify:** `apps/mobile/app/_layout.tsx` (providers, splash gating, bottom-sheet provider), `apps/mobile/app/(tabs)/_layout.tsx` (blur tab bar), `apps/mobile/app.json` (native splash), `apps/mobile/babel.config.js` (verify worklets plugin), `apps/mobile/components/SplashOverlay.tsx` (gate on catalog loading), `apps/mobile/components/MiniPlayer.tsx` (use shared height constant).

---

## Task 1: Dependencies + native splash + babel verify

**Files:**
- Modify: `apps/mobile/package.json` (via installer), `apps/mobile/app.json`, `apps/mobile/babel.config.js`

**Interfaces:** none (setup task).

- [ ] **Step 1: Install the four new deps with Expo's installer** (so versions match SDK 57)

Run from repo root:
```bash
cd apps/mobile && npx expo install expo-image expo-haptics expo-blur @gorhom/bottom-sheet
```
`@gorhom/bottom-sheet` is not an expo module; if `expo install` warns, install via `pnpm --filter mobile add @gorhom/bottom-sheet` (it needs reanimated + gesture-handler, both already present). Confirm all four land in `apps/mobile/package.json` dependencies.

- [ ] **Step 2: Verify the Reanimated worklets Babel plugin**

Read `apps/mobile/babel.config.js`. Reanimated 4.x requires the worklets plugin **last** in the plugins array. Consult the Reanimated 4 / Expo v57 docs for the exact plugin name (`react-native-worklets/plugin` for Reanimated 4). If it is missing, add it as the last plugin. If the file doesn't exist, create:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["react-native-worklets/plugin"],
  };
};
```
(Verify against the live docs — do not guess if the config already has a different, working setup.)

- [ ] **Step 3: Configure the native splash so there's no white flash**

In `apps/mobile/app.json`, configure the `expo-splash-screen` plugin (read v57 docs for the exact shape) with the brand green background + the logo icon. Approximately:
```json
["expo-splash-screen", {
  "backgroundColor": "#0B4634",
  "image": "./assets/icon.png",
  "imageWidth": 180,
  "resizeMode": "contain"
}]
```
Use the actual logo asset path already referenced in `app.json` for the app icon. Keep `"userInterfaceStyle"` — change it from `"light"` to `"automatic"` (dark mode support lands in Task 3; automatic lets the OS scheme through).

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter mobile typecheck`
Expected: passes (no code changes yet, just deps/config).

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/package.json apps/mobile/app.json apps/mobile/babel.config.js pnpm-lock.yaml
git commit -m "chore(mobile): add expo-image/haptics/blur + bottom-sheet, native splash bg, verify worklets plugin"
```

---

## Task 2: Native design tokens in `packages/theme`

**Files:**
- Create: `packages/theme/src/native.ts`
- Modify: `packages/theme/src/index.ts`
- Create: `packages/theme/src/native.test.ts`

**Interfaces — Produces:**
- `typePresets: Record<TypeRole, { fontFamily: string; fontSize: number; lineHeight: number; letterSpacing?: number }>` where `TypeRole = "caption"|"meta"|"body"|"bodyLg"|"cardTitle"|"section"|"screen"|"display"` (fontFamily uses `typography.fonts.sans`/`.serif`).
- `nativeRadii = { sm:8, md:14, lg:20, hero:26, pill:999 }`
- `space = { xs:4, sm:8, md:12, lg:16, xl:24, xxl:32, screen:20 }`
- `elevation: Record<"sm"|"md"|"lg", { shadowColor:string; shadowOpacity:number; shadowRadius:number; shadowOffset:{width:number;height:number}; elevation:number }>`
- `motion = { duration: { fast:150, base:250, slow:400 }, easing: { standard:[0.4,0,0.2,1], emphasized:[0.2,0,0,1] } }` (bezier tuples; the mobile side wraps them in `Easing.bezier(...)`).
- `type ColorScheme = "light" | "dark"`
- `type SemanticColors = { bg; surface; surfaceAlt; textPrimary; textMuted; textFaint; border; borderSubtle; accent; accentText; trackInactive; onBrand }` (all `string`).
- `palette: Record<ColorScheme, SemanticColors>`
- `resolveTheme(scheme: ColorScheme): { c: SemanticColors; type: typeof typePresets; radii: typeof nativeRadii; space: typeof space; elevation: typeof elevation; motion: typeof motion; scheme: ColorScheme }`

- [ ] **Step 1: Write `native.ts`**

```ts
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
```

- [ ] **Step 2: Export from `index.ts`** — append:
```ts
export {
  typePresets, nativeRadii, space, elevation, motion, palette, resolveTheme,
} from "./native";
export type { TypeRole, TypePreset, ColorScheme, SemanticColors, ResolvedTheme } from "./native";
```

- [ ] **Step 3: Write `native.test.ts` (vitest)**
```ts
import { describe, expect, it } from "vitest";
import { resolveTheme, typePresets } from "./native";

describe("resolveTheme", () => {
  it("returns light and dark with distinct backgrounds", () => {
    expect(resolveTheme("light").c.bg).not.toBe(resolveTheme("dark").c.bg);
  });
  it("keeps the gold accent constant across schemes", () => {
    expect(resolveTheme("light").c.accent).toBe(resolveTheme("dark").c.accent);
  });
  it("exposes every type preset with a fontFamily + positive lineHeight", () => {
    for (const p of Object.values(typePresets)) {
      expect(p.fontFamily).toBeTruthy();
      expect(p.lineHeight).toBeGreaterThan(p.fontSize);
    }
  });
});
```

- [ ] **Step 4: Verify** — Run: `pnpm --filter @althaqalayn/theme test && pnpm --filter @althaqalayn/theme typecheck && pnpm --filter mobile typecheck`. Expected: tests pass, no type errors.

- [ ] **Step 5: Commit**
```bash
git add packages/theme/src/native.ts packages/theme/src/index.ts packages/theme/src/native.test.ts
git commit -m "feat(theme): native RN token layer (type/radii/space/elevation/motion + light/dark palette)"
```

---

## Task 3: `ThemeProvider` + `useTheme` + persistence

**Files:**
- Create: `apps/mobile/lib/theme.tsx`
- Modify: `apps/mobile/lib/storage.ts` (add `themeMode` key)
- Modify: `apps/mobile/app/_layout.tsx` (wrap providers, drive StatusBar)

**Interfaces — Produces:**
- `type ThemeMode = "system" | "light" | "dark"`
- `useTheme(): ResolvedTheme` (the resolved token set for the active scheme)
- `useThemeMode(): { mode: ThemeMode; setMode: (m: ThemeMode) => void }`
- `<ThemeProvider>` wrapping the app; also renders the themed `StatusBar`.

- [ ] **Step 1: Add the storage key** — in `apps/mobile/lib/storage.ts` `StorageKeys`, add:
```ts
  themeMode: "themeMode", // "system" | "light" | "dark"
```

- [ ] **Step 2: Write `theme.tsx`**
```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { resolveTheme, type ColorScheme, type ResolvedTheme } from "@althaqalayn/theme";
import { StorageKeys, loadJSON, saveJSON } from "@/lib/storage";

export type ThemeMode = "system" | "light" | "dark";

interface Ctx {
  theme: ResolvedTheme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme(); // "light" | "dark" | null
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    void loadJSON<ThemeMode>(StorageKeys.themeMode, "system").then(setModeState);
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    void saveJSON(StorageKeys.themeMode, m);
  };

  const scheme: ColorScheme = mode === "system" ? (system === "dark" ? "dark" : "light") : mode;
  const theme = useMemo(() => resolveTheme(scheme), [scheme]);

  return (
    <ThemeCtx.Provider value={{ theme, mode, setMode }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme(): ResolvedTheme {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx.theme;
}

export function useThemeMode() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useThemeMode must be used within ThemeProvider");
  return { mode: ctx.mode, setMode: ctx.setMode };
}
```

- [ ] **Step 3: Wire into `_layout.tsx`** — wrap the existing provider tree with `ThemeProvider` (outermost inside `SafeAreaProvider`), and remove any hardcoded `contentStyle backgroundColor: colors.cream` in favor of the theme bg. Minimal change: import `ThemeProvider` + `useTheme`; since `_layout` sets `Stack` `contentStyle`, split the `Stack` into a small child component that can call `useTheme()` for the bg (a provider can't consume its own context in the same component). Example:
```tsx
// inside _layout.tsx
import { ThemeProvider, useTheme } from "@/lib/theme";

function RootStack() {
  const t = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.bg } }}>
      {/* ...existing Stack.Screen entries unchanged... */}
    </Stack>
  );
}
```
Then in `RootLayout` return: `SafeAreaProvider > ThemeProvider > I18nProvider > PlayerProvider > CatalogProvider > (RootStack + MiniPlayer + SplashOverlay)`. Keep `GestureHandlerRootView` outermost. Do NOT remove the existing `StatusBar` usages in individual screens yet (later plans clean those up); the provider's StatusBar sets the global default.

- [ ] **Step 4: Verify** — `pnpm --filter mobile typecheck`. Expected: passes. (Runtime theme switch is QA.)

- [ ] **Step 5: Commit**
```bash
git add apps/mobile/lib/theme.tsx apps/mobile/lib/storage.ts apps/mobile/app/_layout.tsx
git commit -m "feat(mobile): ThemeProvider + useTheme with system/light/dark + persistence"
```

---

## Task 4: Core primitives — `AppText`, `Icon`, `Touchable`

**Files:**
- Create: `apps/mobile/components/ui/AppText.tsx`, `Icon.tsx`, `Touchable.tsx`, `index.ts`

**Interfaces — Produces:**
- `AppText({ variant?: TypeRole = "body"; color?: keyof SemanticColors | string; children; ...TextProps })` — applies the preset + theme color; `color` accepts a semantic key (resolved via `useTheme().c`) or a raw string.
- `Icon({ name: string; size?: number = 20; color?: keyof SemanticColors | string; family?: "feather" | "mci" })` — Feather by default, MaterialCommunityIcons when `family="mci"`; resolves semantic color.
- `Touchable(props: PressableProps & { haptic?: "selection" | "light" | "none"; scaleTo?: number })` — wraps `Pressable`; press feedback (opacity 0.6 + optional `scale`), fires haptics on press, requires `accessibilityLabel` when no text child (dev warning). Default `haptic="selection"`.

- [ ] **Step 1: `AppText.tsx`**
```tsx
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
  const resolved = (t.c as Record<string, string>)[color as string] ?? (color as string);
  return <Text {...rest} style={[preset, { color: resolved }, style]} />;
}
```

- [ ] **Step 2: `Icon.tsx`**
```tsx
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
  const resolved = (t.c as Record<string, string>)[color as string] ?? (color as string);
  if (family === "mci") {
    return <MaterialCommunityIcons name={name as never} size={size} color={resolved} />;
  }
  return <Feather name={name as never} size={size} color={resolved} />;
}
```

- [ ] **Step 3: `Touchable.tsx`**
```tsx
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
```
(Consult expo-haptics v57 docs to confirm `ImpactFeedbackStyle`/`selectionAsync` names.)

- [ ] **Step 4: Barrel `index.ts`**
```ts
export { AppText } from "./AppText";
export { Icon } from "./Icon";
export { Touchable } from "./Touchable";
```

- [ ] **Step 5: Verify** — `pnpm --filter mobile typecheck`. Expected: passes.

- [ ] **Step 6: Commit**
```bash
git add apps/mobile/components/ui
git commit -m "feat(mobile): core primitives — AppText, Icon, Touchable (press+haptic+a11y)"
```

---

## Task 5: Surface primitives — `Card`, `Header`, `EmptyState`, `Skeleton`, `Chip`, `Button`

**Files:**
- Create: `apps/mobile/components/ui/Card.tsx`, `Header.tsx`, `EmptyState.tsx`, `Skeleton.tsx`, `Chip.tsx`, `Button.tsx`
- Modify: `apps/mobile/components/ui/index.ts`

**Interfaces — Produces:**
- `Card({ children; style?; elevation?: "sm"|"md"|"lg"|"none" = "sm"; padded?: boolean })`
- `Header({ title: string; arabic?: string; variant?: "hero"|"compact" = "hero"; onBack?: () => void; right?: ReactNode })` — green gradient (`colors.greenDeep→greenMid→greenHighlight`) + faint Amiri watermark for hero; unified back button via `Touchable`+`Icon`.
- `EmptyState({ icon: string; title: string; body?: string; action?: { label: string; onPress: () => void } })`
- `Skeleton({ width?; height?; radius?; style? })` — pulsing opacity via Reanimated; plus `SkeletonGroup` helper is optional.
- `Chip({ label: string; active?: boolean; onPress: () => void })` — pill, themed active state, press+haptic.
- `Button({ label: string; onPress: () => void; variant?: "primary"|"secondary"|"ghost" = "primary"; loading?: boolean; icon?: string })`

- [ ] **Step 1: `Skeleton.tsx`** (Reanimated pulse)
```tsx
import { useEffect } from "react";
import { type DimensionValue, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from "react-native-reanimated";
import { useTheme } from "@/lib/theme";

export function Skeleton({
  width = "100%", height = 16, radius, style,
}: { width?: DimensionValue; height?: number; radius?: number; style?: ViewStyle }) {
  const t = useTheme();
  const o = useSharedValue(0.4);
  useEffect(() => {
    o.value = withRepeat(withTiming(0.9, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius ?? t.radii.sm, backgroundColor: t.c.surfaceAlt }, anim, style]}
    />
  );
}
```

- [ ] **Step 2: `Card.tsx`**
```tsx
import { View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/lib/theme";

export function Card({
  children, style, elevation = "sm", padded = true,
}: { children: ReactNode; style?: ViewStyle; elevation?: "sm" | "md" | "lg" | "none"; padded?: boolean }) {
  const t = useTheme();
  const elev = elevation === "none" ? null : t.elevation[elevation];
  return (
    <View
      style={[
        { backgroundColor: t.c.surface, borderRadius: t.radii.lg, borderWidth: 1, borderColor: t.c.borderSubtle },
        padded && { padding: t.space.lg },
        elev,
        style,
      ]}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 3: `EmptyState.tsx`**
```tsx
import { View } from "react-native";
import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { useTheme } from "@/lib/theme";

export function EmptyState({
  icon, title, body, action,
}: { icon: string; title: string; body?: string; action?: { label: string; onPress: () => void } }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: t.space.xl, gap: t.space.sm }}>
      <View style={{ width: 64, height: 64, borderRadius: t.radii.pill, backgroundColor: t.c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={26} color="textMuted" />
      </View>
      <AppText variant="cardTitle" style={{ marginTop: t.space.sm, textAlign: "center" }}>{title}</AppText>
      {body ? <AppText variant="body" color="textMuted" style={{ textAlign: "center", maxWidth: 280 }}>{body}</AppText> : null}
      {action ? <Button label={action.label} onPress={action.onPress} variant="secondary" /> : null}
    </View>
  );
}
```

- [ ] **Step 4: `Button.tsx`**
```tsx
import { ActivityIndicator, View } from "react-native";
import { colors } from "@althaqalayn/theme";
import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { Touchable } from "./Touchable";
import { useTheme } from "@/lib/theme";

export function Button({
  label, onPress, variant = "primary", loading, icon,
}: { label: string; onPress: () => void; variant?: "primary" | "secondary" | "ghost"; loading?: boolean; icon?: string }) {
  const t = useTheme();
  const bg = variant === "primary" ? colors.greenDeep : variant === "secondary" ? t.c.surfaceAlt : "transparent";
  const fg = variant === "primary" ? "#FFFFFF" : t.c.textPrimary;
  return (
    <Touchable
      haptic="light"
      onPress={onPress}
      disabled={loading}
      accessibilityLabel={label}
      style={{
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: t.space.sm,
        backgroundColor: bg, borderRadius: t.radii.md, paddingVertical: 12, paddingHorizontal: t.space.lg,
        borderWidth: variant === "ghost" ? 1 : 0, borderColor: t.c.border,
      }}
    >
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: "row", alignItems: "center", gap: t.space.sm }}>
          {icon ? <Icon name={icon} size={16} color={fg} /> : null}
          <AppText variant="cardTitle" style={{ color: fg, fontSize: 15 }}>{label}</AppText>
        </View>
      )}
    </Touchable>
  );
}
```

- [ ] **Step 5: `Chip.tsx`**
```tsx
import { colors } from "@althaqalayn/theme";
import { AppText } from "./AppText";
import { Touchable } from "./Touchable";
import { useTheme } from "@/lib/theme";

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Touchable
      onPress={onPress}
      accessibilityLabel={label}
      style={{
        paddingHorizontal: t.space.lg, paddingVertical: t.space.sm, borderRadius: t.radii.pill,
        backgroundColor: active ? colors.greenDeep : t.c.surface,
        borderWidth: 1, borderColor: active ? colors.greenDeep : t.c.border,
      }}
    >
      <AppText variant="meta" style={{ color: active ? "#FFFFFF" : t.c.textMuted, fontWeight: "600" }}>{label}</AppText>
    </Touchable>
  );
}
```

- [ ] **Step 6: `Header.tsx`**
```tsx
import { View } from "react-native";
import type { ReactNode } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography } from "@althaqalayn/theme";
import { AppText } from "./AppText";
import { Icon } from "./Icon";
import { Touchable } from "./Touchable";
import { useTheme } from "@/lib/theme";

export function Header({
  title, arabic, variant = "hero", onBack, right,
}: { title: string; arabic?: string; variant?: "hero" | "compact"; onBack?: () => void; right?: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const hero = variant === "hero";
  return (
    <LinearGradient
      colors={[colors.greenDeep, colors.greenMid, colors.greenHighlight]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{
        paddingTop: insets.top + t.space.md,
        paddingBottom: hero ? t.space.xl : t.space.md,
        paddingHorizontal: t.space.screen,
        borderBottomLeftRadius: t.radii.hero, borderBottomRightRadius: t.radii.hero,
        overflow: "hidden",
      }}
    >
      {arabic ? (
        <AppText style={{ position: "absolute", right: -6, top: -18, fontFamily: typography.fonts.arabic, fontSize: 120, color: "rgba(255,255,255,0.08)" }} allowFontScaling={false}>
          {arabic}
        </AppText>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: t.space.md }}>
        {onBack ? (
          <Touchable onPress={onBack} accessibilityLabel="Go back" style={{ width: 38, height: 38, borderRadius: t.radii.pill, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" }}>
            <Icon name="chevron-left" color="#FFFFFF" />
          </Touchable>
        ) : null}
        <AppText variant={hero ? "screen" : "section"} style={{ color: "#FFFFFF", flex: 1 }}>{title}</AppText>
        {right}
      </View>
    </LinearGradient>
  );
}
```

- [ ] **Step 7: Extend barrel `index.ts`** — add `Card`, `Header`, `EmptyState`, `Skeleton`, `Chip`, `Button` exports.

- [ ] **Step 8: Verify** — `pnpm --filter mobile typecheck`. Expected: passes.

- [ ] **Step 9: Commit**
```bash
git add apps/mobile/components/ui
git commit -m "feat(mobile): surface primitives — Card, Header, EmptyState, Skeleton, Chip, Button"
```

---

## Task 6: `CoverArt` — elevated generated cover

**Files:**
- Create: `apps/mobile/components/ui/CoverArt.tsx`
- Modify: `apps/mobile/components/ui/index.ts`
- Read first: `apps/mobile/components/GradientCover.tsx` (the current cover) to preserve its call sites' props.

**Interfaces — Produces:**
- `CoverArt({ gradient?: [string,string]; glyph?: string; size?: number; radius?: number; style? })` — renders a `LinearGradient` base + a soft radial highlight overlay (top-left light) + a vignette (bottom-right dark) + subtle grain + the Arabic glyph, producing a "lit" designed tile rather than a flat gradient. Must be a drop-in visual upgrade for `GradientCover`'s use (same gradient/glyph inputs).

- [ ] **Step 1: Read `GradientCover.tsx`** to note its exact props and how callers pass gradient + glyph, so `CoverArt` can accept the same inputs (do not change callers in this plan — this task only adds the component; later plans swap usages).

- [ ] **Step 2: Implement `CoverArt.tsx`**
Base `LinearGradient` (diagonal). Overlay two more `LinearGradient`s absolutely filling the tile: a highlight (`["rgba(255,255,255,0.22)","transparent"]`, start top-left) and a vignette (`["transparent","rgba(0,0,0,0.28)"]`, end bottom-right). Add a low-opacity repeating grain: a thin `View` with `opacity: 0.06` background is acceptable if no image asset — OR skip grain if it complicates; the lighting + vignette are the priority. Center the Arabic glyph (`typography.fonts.arabic`, large, `rgba(255,255,255,0.16)`). Expose per-category palette variety by accepting the `gradient` prop from callers (callers already choose from `colors.topicGradients`). Keep it pure/presentational.

```tsx
import { View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, typography } from "@althaqalayn/theme";
import { AppText } from "./AppText";

export function CoverArt({
  gradient = [colors.greenDeep, colors.greenHighlightAlt],
  glyph, size = 120, radius = 14, style,
}: { gradient?: [string, string]; glyph?: string; size?: number; radius?: number; style?: ViewStyle }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: "hidden" }, style]}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
      <LinearGradient colors={["rgba(255,255,255,0.22)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 0.7 }} style={{ position: "absolute", inset: 0 }} pointerEvents="none" />
      <LinearGradient colors={["transparent", "rgba(0,0,0,0.30)"]} start={{ x: 0.3, y: 0.3 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", inset: 0 }} pointerEvents="none" />
      {glyph ? (
        <AppText allowFontScaling={false} style={{ position: "absolute", right: -size * 0.06, top: -size * 0.12, fontFamily: typography.fonts.arabic, fontSize: size * 0.62, color: "rgba(255,255,255,0.18)" }}>
          {glyph}
        </AppText>
      ) : null}
    </View>
  );
}
```
(Note: `inset: 0` on RN requires RN ≥ 0.71; this repo is 0.86 — fine. If typecheck rejects `inset`, expand to `top/left/right/bottom: 0`.)

- [ ] **Step 3: Export from barrel + Verify** — add to `index.ts`; run `pnpm --filter mobile typecheck`. Expected: passes.

- [ ] **Step 4: Commit**
```bash
git add apps/mobile/components/ui
git commit -m "feat(mobile): CoverArt — elevated generated cover (lighting + vignette + glyph)"
```

---

## Task 7: App shell — blur tab bar, shared layout constants, splash gating, bottom-sheet provider

**Files:**
- Create: `apps/mobile/lib/layout.ts`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`, `apps/mobile/app/_layout.tsx`, `apps/mobile/components/SplashOverlay.tsx`, `apps/mobile/components/MiniPlayer.tsx`

**Interfaces — Produces:**
- `layout.ts`: `export const TAB_BAR_HEIGHT = 64; export const MINI_PLAYER_HEIGHT = 58; export const MINI_PLAYER_GAP = 8;`

- [ ] **Step 1: `lib/layout.ts`** — the three constants above (single source; MiniPlayer + tab bar both consume them).

- [ ] **Step 2: Blur tab bar** — rebuild `(tabs)/_layout.tsx` using `useTheme()`:
  - `tabBarBackground: () => <BlurView intensity={80} tint={scheme === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} />` (expo-blur; read v57 docs).
  - `tabBarStyle`: `position: "absolute"`, transparent background, no top border (or a hairline via `t.c.border`), `height: TAB_BAR_HEIGHT + insets.bottom`, floating look. Keep it edge-to-edge translucent (a fully floating pill is optional polish — translucent absolute bar is the required change).
  - Active tint `colors.greenDeep` (light) / `colors.goldLight` (dark) via theme; inactive `t.c.textFaint`.
  - Icons swap outline→filled on focus: switch the icon family to Ionicons for the tab icons (Ionicons has `home`/`home-outline` pairs), OR keep Feather and rely on tint + a small scale — RECOMMENDED: use Ionicons name pairs for a real filled/outline swap. Use `tabBarIcon: ({ focused, color }) => <Ionicons name={focused ? "home" : "home-outline"} .../>`.
  - `Haptics.selectionAsync()` on tab press via `screenListeners={{ tabPress: () => Haptics.selectionAsync() }}` (verify Expo Router v57 API for `screenListeners`).
  - Keep labels via `t` (i18n) unchanged.

- [ ] **Step 3: MiniPlayer offset** — in `MiniPlayer.tsx`, replace the hardcoded `insets.bottom + 74` with `insets.bottom + TAB_BAR_HEIGHT + MINI_PLAYER_GAP` from `lib/layout.ts`. (Do not otherwise redesign the mini-player — that's Plan 2.) Ensure it still hides on `/player` and when idle.

- [ ] **Step 4: Splash gating** — in `SplashOverlay.tsx`, replace the fixed `HOLD_MS = 2000` dismiss with: dismiss as soon as `useCatalog().loading === false` (cap at a max ~1500ms so a hung fetch still lets the user in), keeping the existing fade-out animation. Import the catalog hook. (Confirm the catalog hook name from `catalogProvider.tsx`.)

- [ ] **Step 5: Bottom-sheet provider** — in `_layout.tsx`, wrap the tree with `<BottomSheetModalProvider>` (from `@gorhom/bottom-sheet`) inside `GestureHandlerRootView` so later plans can present sheets. Confirm it doesn't require additional setup for SDK 57.

- [ ] **Step 6: Verify** — `pnpm --filter mobile typecheck`. Expected: passes. (Blur/haptics/tab visuals are QA.)

- [ ] **Step 7: Commit**
```bash
git add apps/mobile/lib/layout.ts "apps/mobile/app/(tabs)/_layout.tsx" apps/mobile/app/_layout.tsx apps/mobile/components/SplashOverlay.tsx apps/mobile/components/MiniPlayer.tsx
git commit -m "feat(mobile): blur floating tab bar, shared layout constants, splash gating, bottom-sheet provider"
```

---

## Task 8: Catalog error + refetch

**Files:**
- Modify: `apps/mobile/lib/catalogProvider.tsx`
- Read first: the whole file to match its existing shape/exports.

**Interfaces — Produces (added to the catalog context value):**
- `error: string | null`
- `refetch: () => Promise<void>`

- [ ] **Step 1: Read `catalogProvider.tsx`** — note the current context shape, the fetch function, the `loading` flag, and the swallowed `catch` (around line 188 per audit).

- [ ] **Step 2: Add `error` + `refetch`** — extract the existing fetch body into a `load()` callback; set `error` to the message on failure instead of swallowing it (`setError(e instanceof Error ? e.message : "Failed to load")`) and clear it on success; expose `error` and `refetch = load` on the context value. Do not change the data shape consumers already use. Keep the existing empty-array fallbacks so screens don't crash, but now `error` is non-null on failure so screens can distinguish offline from empty (screens consume this in Plan 2).

- [ ] **Step 3: Verify** — `pnpm --filter mobile typecheck`. Expected: passes.

- [ ] **Step 4: Commit**
```bash
git add apps/mobile/lib/catalogProvider.tsx
git commit -m "feat(mobile): catalog error state + refetch (no more swallowed fetch failures)"
```

---

## Self-review

- **Spec coverage (Plan 1 slice):** token system (§1)→Task 2; theming light/dark+persistence (§1)→Task 3; primitives incl. Touchable/haptics/a11y, EmptyState, Skeleton, Header, Card, Chip, Button (§2)→Tasks 4-5; CoverArt elevated art (§2)→Task 6; blur tab bar + shared constants + splash + transitions/bottom-sheet (§3)→Tasks 1,7; catalog error/refetch (§5 data flow)→Task 8; deps (§dependencies)→Task 1. Screen migrations, audio, offline, gallery/reader/bookmarks, settings = Plans 2 & 3 (out of this plan's scope by design).
- **Placeholder scan:** code steps carry real code; prose steps (Task 7 tab bar, Task 8) instruct reading the current file first because exact API/props live there and must be matched against Expo v57 docs — deliberate, not vague.
- **Type consistency:** `useTheme()` returns `ResolvedTheme` (Task 2/3) consumed by every primitive (Tasks 4-6); `TypeRole`/`SemanticColors` keys used consistently in `AppText`/`Icon` color props; `layout.ts` constants defined Task 7 Step 1 and consumed Steps 2-3.
- **Non-breaking:** existing screens untouched (still import `colors`); provider wrapping + shell chrome are the only app-level changes; app compiles throughout.
