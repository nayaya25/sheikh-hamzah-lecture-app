# Monorepo Skeleton + Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Althaqalayn pnpm + Turborepo monorepo so both apps boot to a blank screen and both consume the shared `@althaqalayn/theme` design tokens.

**Architecture:** One repo, pnpm workspaces (`apps/*`, `packages/*`) orchestrated by Turborepo. Shared packages are plain-TS, imported via `workspace:*` deps + `tsconfig.base.json` path aliases with no build step. `apps/mobile` is Expo (React Native, expo-router); `apps/admin` is Next.js App Router. `packages/theme` is framework-neutral token constants; `types`/`api`/`i18n` are placeholders this deliverable only stubs.

**Tech Stack:** pnpm 10.33, Turborepo, TypeScript 5, Expo (SDK 52+), Next.js (App Router), Vitest (theme tests). Backend (Supabase) and screens are out of scope here.

## Global Constraints

- Package manager is **pnpm**; every workspace install/run uses pnpm (never npm/yarn in committed scripts).
- Internal package names: `@althaqalayn/theme`, `@althaqalayn/types`, `@althaqalayn/api`, `@althaqalayn/i18n`.
- Node engine floor: `>=20` (local is v24.15.0).
- `packages/theme` is **framework-neutral**: no `react`, `react-native`, or DOM imports — plain TS constants only.
- Color/typography/spacing token values are copied **verbatim** from `README.md` §Design Tokens.
- Repo root stays clean: prototype references live in `design/`; `README.md` + `CLAUDE_CODE_PROMPT.md` stay at root.
- TypeScript everywhere; `strict: true` in `tsconfig.base.json`.
- No screens, no fonts loaded, no backend wiring in this deliverable.

---

### Task 1: Workspace root + repo hygiene

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.base.json`
- Create: `.npmrc`
- Modify: `.gitignore` (already exists from spec commit — extend it)
- Move: `Althaqalayn Lectures.dc.html`, `Admin Console.dc.html`, `App Map.dc.html`, `Alternatives.dc.html`, `android-frame.jsx`, `browser-window.jsx`, `image-slot.js`, `uploads/` → `design/`

**Interfaces:**
- Consumes: nothing.
- Produces: workspace resolving `apps/*` + `packages/*`; path aliases `@althaqalayn/*` → `packages/*/src`; turbo tasks `dev`, `build`, `lint`, `typecheck`.

- [ ] **Step 1: Move prototype references into `design/`**

```bash
cd "$(git rev-parse --show-toplevel)"
mkdir -p design
git mv "Althaqalayn Lectures.dc.html" "Admin Console.dc.html" "App Map.dc.html" "Alternatives.dc.html" design/
git mv android-frame.jsx browser-window.jsx image-slot.js design/
git mv uploads design/uploads
```

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Write root `package.json`**

```json
{
  "name": "althaqalayn",
  "private": true,
  "packageManager": "pnpm@10.33.2",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 4: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**", ".expo/**"] },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] }
  }
}
```

- [ ] **Step 5: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@althaqalayn/theme": ["packages/theme/src/index.ts"],
      "@althaqalayn/types": ["packages/types/src/index.ts"],
      "@althaqalayn/api": ["packages/api/src/index.ts"],
      "@althaqalayn/i18n": ["packages/i18n/src/index.ts"]
    }
  }
}
```

- [ ] **Step 6: Write `.npmrc`** (RN/Expo need hoisted binaries)

```
node-linker=hoisted
public-hoist-pattern[]=*
```

- [ ] **Step 7: Extend `.gitignore`**

Ensure it contains (append any missing lines):

```
node_modules/
.turbo/
dist/
.next/
.expo/
*.log
.env
.env.local
```

- [ ] **Step 8: Verify install on empty workspace**

Run: `pnpm install`
Expected: completes without error; `turbo` + `typescript` land in root `node_modules`. (No workspace packages exist yet — that's fine.)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: pnpm+turbo workspace root, move prototypes to design/"
```

---

### Task 2: `packages/theme` (design tokens, TDD)

**Files:**
- Create: `packages/theme/package.json`
- Create: `packages/theme/tsconfig.json`
- Create: `packages/theme/vitest.config.ts`
- Create: `packages/theme/src/colors.ts`
- Create: `packages/theme/src/typography.ts`
- Create: `packages/theme/src/layout.ts` (spacing, radii, shadows, gradients)
- Create: `packages/theme/src/adminVars.ts` (light/dark CSS-var sets)
- Create: `packages/theme/src/index.ts`
- Test: `packages/theme/src/theme.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces (exact exports from `@althaqalayn/theme`):
  - `colors` — object with keys incl. `greenDeep`, `greenMid`, `greenHighlight`, `greenDeepest`, `gold`, `goldLight`, `cream`, `creamAlt`, `cardWhite`, `ink`, `muted`, `faint`, `hairline`, `navInactive`; nested `topicGradients` (`morality`/`society`/`book`/`maulud` → `[from, to]`); nested `mediaBadge` (`audio`/`video`/`text` → `{ bg, fg }`).
  - `typography` — `{ fonts: { serif, arabic, sans, adminHeading, adminUi }, sizes: {...}, weights: {...} }`.
  - `spacing`, `radii`, `shadows`, `gradients` (from `layout.ts`).
  - `adminLight`, `adminDark` — CSS-var maps.

- [ ] **Step 1: Write `packages/theme/package.json`**

```json
{
  "name": "@althaqalayn/theme",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Write `packages/theme/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `packages/theme/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

- [ ] **Step 4: Write the failing test** — `packages/theme/src/theme.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { colors, typography, spacing, radii, adminLight, adminDark } from "./index";

describe("colors", () => {
  it("uses the exact brand greens and gold from the spec", () => {
    expect(colors.greenDeep).toBe("#0B4634");
    expect(colors.greenMid).toBe("#12634E");
    expect(colors.gold).toBe("#C79A3B");
    expect(colors.goldLight).toBe("#E4C77B");
    expect(colors.cream).toBe("#F6F1E7");
    expect(colors.ink).toBe("#17231E");
  });

  it("defines topic cover gradients as [from, to] pairs", () => {
    expect(colors.topicGradients.morality).toEqual(["#4A2F5E", "#7A4F9C"]);
    expect(colors.topicGradients.book).toEqual(["#173A4F", "#2C7396"]);
  });

  it("defines media badge bg/fg pairs", () => {
    expect(colors.mediaBadge.audio).toEqual({ bg: "#EAF3EF", fg: "#12634E" });
    expect(colors.mediaBadge.video).toEqual({ bg: "#F6ECEC", fg: "#a23e3e" });
    expect(colors.mediaBadge.text).toEqual({ bg: "#F1EEF6", fg: "#6a4f9c" });
  });
});

describe("typography", () => {
  it("names the mobile + admin font families", () => {
    expect(typography.fonts.serif).toBe("Lora");
    expect(typography.fonts.arabic).toBe("Amiri");
    expect(typography.fonts.sans).toBe("Mulish");
    expect(typography.fonts.adminHeading).toBe("Sora");
    expect(typography.fonts.adminUi).toBe("Instrument Sans");
  });

  it("exposes the size scale", () => {
    expect(typography.sizes.screenTitle).toBe(26);
    expect(typography.sizes.sectionHeader).toBe(18);
  });
});

describe("layout", () => {
  it("exposes spacing and radii scales", () => {
    expect(spacing.screen).toBe(16);
    expect(radii.card).toBe(16);
  });
});

describe("admin css-var sets", () => {
  it("defines light and dark backgrounds", () => {
    expect(adminLight["--bg"]).toBeDefined();
    expect(adminDark["--bg"]).toBeDefined();
    expect(adminLight["--bg"]).not.toBe(adminDark["--bg"]);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `pnpm --filter @althaqalayn/theme test`
Expected: FAIL — cannot resolve `./index` / exports undefined.

- [ ] **Step 6: Write `packages/theme/src/colors.ts`**

```ts
export const colors = {
  greenDeep: "#0B4634",
  greenMid: "#12634E",
  greenHighlight: "#15705A",
  greenHighlightAlt: "#17795E",
  greenDeepest: "#08382A",
  greenDeepestAlt: "#062A20",
  gold: "#C79A3B",
  goldLight: "#E4C77B",
  cream: "#F6F1E7",
  creamAlt: "#FBF8F1",
  cardWhite: "#FFFFFF",
  ink: "#17231E",
  muted: "#6A766E",
  mutedAlt: "#8B978F",
  faint: "#9AA69E",
  faintAlt: "#AAB4AC",
  hairline: "#ECE4D3",
  hairlineAlt: "#E7DFCE",
  navInactive: "#9AA89F",
  topicGradients: {
    morality: ["#4A2F5E", "#7A4F9C"],
    society: ["#5E3A2F", "#A06A4A"],
    book: ["#173A4F", "#2C7396"],
    maulud: ["#7A5A12", "#C0932F"],
  },
  mediaBadge: {
    audio: { bg: "#EAF3EF", fg: "#12634E" },
    video: { bg: "#F6ECEC", fg: "#a23e3e" },
    text: { bg: "#F1EEF6", fg: "#6a4f9c" },
  },
} as const;
```

- [ ] **Step 7: Write `packages/theme/src/typography.ts`**

```ts
export const typography = {
  fonts: {
    serif: "Lora",
    arabic: "Amiri",
    sans: "Mulish",
    adminHeading: "Sora",
    adminUi: "Instrument Sans",
  },
  sizes: {
    screenTitle: 26,
    sectionHeader: 18,
    cardTitle: 15,
    body: 13,
    meta: 11,
    overline: 10,
  },
  weights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "800",
  },
} as const;
```

- [ ] **Step 8: Write `packages/theme/src/layout.ts`**

```ts
export const spacing = {
  screen: 16,
  screenWide: 20,
  card: 14,
  gap: 10,
} as const;

export const radii = {
  card: 16,
  cover: 18,
  phoneFrame: 42,
  pill: 20,
  tile: 12,
} as const;

export const shadows = {
  card: "0 10px 26px rgba(11,70,52,0.10)",
} as const;

export const gradients = {
  homeHeader: "linear-gradient(158deg,#0B4634,#12634E,#15705A)",
  splash: "radial-gradient(circle,#12634E,#0B4634,#072d22)",
} as const;
```

- [ ] **Step 9: Write `packages/theme/src/adminVars.ts`**

```ts
export const adminLight = {
  "--bg": "#F6F1E7",
  "--card": "#FFFFFF",
  "--line": "#ECE4D3",
  "--ink": "#17231E",
  "--muted": "#6A766E",
  "--faint": "#9AA69E",
  "--input": "#FBF8F1",
  "--chip": "#EAF3EF",
} as const;

export const adminDark = {
  "--bg": "#0E1512",
  "--card": "#16201B",
  "--line": "#243029",
  "--ink": "#F1ECDD",
  "--muted": "#9AA69E",
  "--faint": "#6A766E",
  "--input": "#1B2620",
  "--chip": "#17332A",
} as const;
```

- [ ] **Step 10: Write `packages/theme/src/index.ts`**

```ts
export { colors } from "./colors";
export { typography } from "./typography";
export { spacing, radii, shadows, gradients } from "./layout";
export { adminLight, adminDark } from "./adminVars";
```

- [ ] **Step 11: Run the test to verify it passes**

Run: `pnpm --filter @althaqalayn/theme test`
Expected: PASS — all suites green.

- [ ] **Step 12: Commit**

```bash
git add packages/theme
git commit -m "feat(theme): brand color, type, layout tokens + admin css vars"
```

---

### Task 3: Placeholder packages (`types`, `api`, `i18n`)

**Files:**
- Create: `packages/types/package.json`, `packages/types/tsconfig.json`, `packages/types/src/index.ts`
- Create: `packages/api/package.json`, `packages/api/tsconfig.json`, `packages/api/src/index.ts`
- Create: `packages/i18n/package.json`, `packages/i18n/tsconfig.json`, `packages/i18n/src/index.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: importable `@althaqalayn/types`, `@althaqalayn/api`, `@althaqalayn/i18n` each exporting a `PACKAGE_NAME` string constant (placeholder proving the wiring; real content lands in later deliverables).

- [ ] **Step 1: Write the three `package.json` files** (identical but for name — `@althaqalayn/types`, `@althaqalayn/api`, `@althaqalayn/i18n`)

```json
{
  "name": "@althaqalayn/types",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "typecheck": "tsc --noEmit" },
  "devDependencies": { "typescript": "^5.6.0" }
}
```

- [ ] **Step 2: Write the three `tsconfig.json` files** (identical in each package)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "noEmit": true },
  "include": ["src"]
}
```

- [ ] **Step 3: Write each `src/index.ts` placeholder**

`packages/types/src/index.ts`:
```ts
export const PACKAGE_NAME = "@althaqalayn/types";
```
`packages/api/src/index.ts`:
```ts
export const PACKAGE_NAME = "@althaqalayn/api";
```
`packages/i18n/src/index.ts`:
```ts
export const PACKAGE_NAME = "@althaqalayn/i18n";
```

- [ ] **Step 4: Re-resolve the workspace**

Run: `pnpm install`
Expected: pnpm now lists 4 packages under `packages/*`; no errors.

- [ ] **Step 5: Typecheck the placeholders**

Run: `pnpm --filter "@althaqalayn/types" --filter "@althaqalayn/api" --filter "@althaqalayn/i18n" typecheck`
Expected: PASS (no output = success).

- [ ] **Step 6: Commit**

```bash
git add packages/types packages/api packages/i18n pnpm-lock.yaml
git commit -m "chore: placeholder types/api/i18n packages"
```

---

### Task 4: `apps/mobile` (Expo) boots blank + consumes theme

**Files:**
- Create: `apps/mobile/` (via `create-expo-app`)
- Modify: `apps/mobile/package.json` (name, add theme dep)
- Modify: `apps/mobile/app/index.tsx` (or `App.tsx`) — render a blank themed screen
- Create/Modify: `apps/mobile/metro.config.js` — enable monorepo resolution
- Modify: `apps/mobile/tsconfig.json` — extend base, add path alias

**Interfaces:**
- Consumes: `colors` from `@althaqalayn/theme`.
- Produces: a booting Expo app whose root screen background is `colors.cream`.

- [ ] **Step 1: Scaffold the Expo app (non-interactive)**

```bash
cd apps
pnpm create expo-app@latest mobile --template blank-typescript --no-install
cd ..
```

- [ ] **Step 2: Set the workspace name + theme dep in `apps/mobile/package.json`**

Set `"name": "mobile"` and add:
```json
  "dependencies": {
    "@althaqalayn/theme": "workspace:*"
  }
```
(Keep the Expo-generated dependencies; merge this key in.)

- [ ] **Step 3: Add `apps/mobile/metro.config.js` for monorepo resolution**

```js
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;
module.exports = config;
```

- [ ] **Step 4: Add the theme path alias to `apps/mobile/tsconfig.json`**

Keep the Expo-generated config (it must keep `"extends": "expo/tsconfig.base"` so React-Native/JSX types stay intact). Only merge in `baseUrl` + the alias:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": { "@althaqalayn/theme": ["../../packages/theme/src/index.ts"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```
Do NOT change `extends` to the repo base — that would strip Expo's RN type defs and break the typecheck.

- [ ] **Step 5: Replace the entry screen with a blank themed view** — `apps/mobile/App.tsx`

```tsx
import { View } from "react-native";
import { colors } from "@althaqalayn/theme";

export default function App() {
  return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
}
```

- [ ] **Step 6: Install the workspace**

Run: `pnpm install`
Expected: `@althaqalayn/theme` symlinked into `apps/mobile`; Expo deps resolve.

- [ ] **Step 7: Typecheck the app (proves the theme import resolves)**

Run: `pnpm --filter mobile exec tsc --noEmit`
Expected: PASS — no errors; the `@althaqalayn/theme` import type-resolves.

- [ ] **Step 8: Boot verification**

Run: `pnpm --filter mobile exec expo start` (Ctrl-C after it reports "Metro waiting" / bundles with no red errors), or `pnpm --filter mobile exec expo-doctor`.
Expected: Metro starts and bundles the app without resolution errors → blank cream screen in Expo Go.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile pnpm-lock.yaml
git commit -m "feat(mobile): Expo app boots blank, consumes @althaqalayn/theme"
```

---

### Task 5: `apps/admin` (Next.js) boots blank + consumes theme

**Files:**
- Create: `apps/admin/` (via `create-next-app`)
- Modify: `apps/admin/package.json` (name, add theme dep, transpile shared pkg)
- Modify: `apps/admin/next.config.js` — `transpilePackages`
- Modify: `apps/admin/tsconfig.json` — extend base, add path alias
- Modify: `apps/admin/app/page.tsx` — blank themed page

**Interfaces:**
- Consumes: `colors` from `@althaqalayn/theme`.
- Produces: a booting Next.js app whose root page background is `colors.cream`.

- [ ] **Step 1: Scaffold the Next.js app (non-interactive)**

```bash
cd apps
pnpm create next-app@latest admin --ts --app --no-tailwind --no-eslint --no-src-dir --import-alias "@/*" --use-pnpm --skip-install
cd ..
```

- [ ] **Step 2: Set the workspace name + theme dep in `apps/admin/package.json`**

Set `"name": "admin"` and add to dependencies:
```json
    "@althaqalayn/theme": "workspace:*"
```

- [ ] **Step 3: Transpile the shared package in `apps/admin/next.config.js`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@althaqalayn/theme"],
};
module.exports = nextConfig;
```
(If `create-next-app` produced `next.config.ts`/`.mjs`, replace it with this `.js` form and delete the other.)

- [ ] **Step 4: Add the theme path alias to `apps/admin/tsconfig.json`**

Leave the `create-next-app` config as generated (it carries the `lib: ["dom",...]`,
`moduleResolution`, and `next` plugin settings Next needs). Only add the theme entry
to the existing `compilerOptions.paths` block, so it reads:

```json
    "paths": {
      "@/*": ["./*"],
      "@althaqalayn/theme": ["../../packages/theme/src/index.ts"]
    }
```
Do NOT replace the file or change its `extends` — dropping Next's `lib`/plugin would break the typecheck.

- [ ] **Step 5: Replace the home page with a blank themed page** — `apps/admin/app/page.tsx`

```tsx
import { colors } from "@althaqalayn/theme";

export default function Page() {
  return <main style={{ minHeight: "100vh", background: colors.cream }} />;
}
```

- [ ] **Step 6: Install the workspace**

Run: `pnpm install`
Expected: `@althaqalayn/theme` symlinked into `apps/admin`; Next deps resolve.

- [ ] **Step 7: Typecheck the app**

Run: `pnpm --filter admin exec tsc --noEmit`
Expected: PASS — the `@althaqalayn/theme` import type-resolves.

- [ ] **Step 8: Boot verification**

Run: `pnpm --filter admin exec next build` (compiles the page) — or `pnpm --filter admin dev` and open http://localhost:3000, Ctrl-C after.
Expected: build/dev succeeds; blank cream page renders with no console errors.

- [ ] **Step 9: Commit**

```bash
git add apps/admin pnpm-lock.yaml
git commit -m "feat(admin): Next.js app boots blank, consumes @althaqalayn/theme"
```

---

### Task 6: Root pipeline wiring + full-repo verification

**Files:**
- Modify: `apps/mobile/package.json` — add `"typecheck": "tsc --noEmit"` and `"lint"` no-op scripts if missing
- Modify: `apps/admin/package.json` — ensure `"typecheck": "tsc --noEmit"` script exists
- Create: `README.dev.md` (short "how to run this monorepo" note)

**Interfaces:**
- Consumes: all prior tasks.
- Produces: `pnpm typecheck` passing across every workspace via turbo; documented run commands.

- [ ] **Step 1: Ensure every workspace has a `typecheck` script**

Confirm each of `packages/theme`, `packages/types`, `packages/api`, `packages/i18n`, `apps/mobile`, `apps/admin` `package.json` has `"typecheck": "tsc --noEmit"`. Add where missing.

- [ ] **Step 2: Run the whole-repo typecheck through turbo**

Run: `pnpm typecheck`
Expected: turbo runs `typecheck` in all 6 workspaces; all PASS.

- [ ] **Step 3: Run the theme test through the workspace**

Run: `pnpm --filter @althaqalayn/theme test`
Expected: PASS.

- [ ] **Step 4: Write `README.dev.md`**

```markdown
# Running the Althaqalayn monorepo

Requires Node >=20 and pnpm.

    pnpm install        # install all workspaces
    pnpm dev            # turbo: run mobile (Expo) + admin (Next.js) dev servers
    pnpm typecheck      # typecheck every package
    pnpm build          # build all

Apps:
- `apps/mobile` — Expo. `pnpm --filter mobile exec expo start` → Expo Go.
- `apps/admin`  — Next.js. `pnpm --filter admin dev` → http://localhost:3000.

Shared packages (`packages/theme|types|api|i18n`) import as `@althaqalayn/*`.
Design references live in `design/`.
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: repo-wide typecheck pipeline + dev README"
```

---

## Verification (deliverable acceptance — from the spec)

1. `pnpm install` resolves the workspace cleanly. *(Tasks 1,3,4,5)*
2. Mobile app boots to a blank screen in Expo. *(Task 4 Step 8)*
3. Admin app boots to a blank page in the browser. *(Task 5 Step 8)*
4. `pnpm typecheck` passes across all packages; both apps `import { colors } from "@althaqalayn/theme"`. *(Task 6 Step 2)*
