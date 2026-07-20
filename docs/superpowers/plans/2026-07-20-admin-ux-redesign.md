# Admin Content Workspace UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin's narrow-drawer editors and disconnected Lectures/Series views with one Content Workspace — a Program→Series→Episode tree beside a detail panel that hosts a shared, sectioned form engine reused everywhere, plus a stronger media zone and correct input widgets.

**Architecture:** A single form engine (`SectionedForm` + a typed field kit) mounts two ways: inline in the workspace detail panel for tree content, and inside a widened (~800px) drawer for non-tree entities. A `useContentTree` hook fetches programs/series/lectures once and shapes them into a hierarchy that is the single source of truth for the tree and the panel.

**Tech Stack:** Next.js 16 (client-SPA, App Router), React 19, TypeScript, Supabase JS, inline-style components. Shared workspace packages `@althaqalayn/types` and `@althaqalayn/api`. No CSS framework; styling via inline `CSSProperties` + CSS vars in `globals.css`.

## Global Constraints

- **Preserve the client-SPA pattern.** No async server APIs / server components for data. All data access goes through `getClient()` from `@/lib/supabase` in `"use client"` components. (Copied from spec: "Preserve the client-SPA pattern (no async server APIs)".)
- **Next.js is non-standard.** Per `apps/admin/AGENTS.md`: "Read the relevant guide in `node_modules/next/dist/docs/` before writing any code" for Next-specific APIs. This plan touches only client components and no Next routing/config, so no Next API surface changes — but honor this if a task drifts.
- **No schema changes.** Use existing columns only: `series.position`, `lectures.episode`, `lectures.series_id`, `lectures.program_id`, `lectures.scheduled_for`, `lectures.status`. (Copied from spec: "No schema changes required".)
- **50 MB media cap.** Enforce client-side via `MAX_MEDIA_BYTES` from `@/lib/upload` before upload. (Copied from spec: "size ≤ 50 MB … clear cap messaging".)
- **No changes to the mobile app or shared packages beyond what `admin` imports** — the only shared-package change permitted is additive functions in `@althaqalayn/api` (Task 1). Do not alter `@althaqalayn/types` domain shapes (would ripple into mobile).
- **English title required; a parent required for series-scoped episodes.** (Copied from spec Validation.)
- **Theme:** use existing brand constants (`brand`, `font`, `coverGradient`, `statusPill`, `mediaBadge`, `YEARS` from `@/lib/ui`) and CSS vars (`--card`, `--line`, `--input`, `--ink`, `--muted`, `--faint`, `--bg`, `--chip`). Never hardcode surface colors; the sidebar green stays via `brand`.

## Testing approach (per spec decision)

The admin has **no test runner**, and the spec explicitly deferred adding one ("manual QA checklist now; unit-test runner deferred"). Therefore the standard TDD write-failing-test cycle is replaced, per task, by this gate:

1. Implement.
2. `pnpm --filter admin typecheck` → expect no errors.
3. `pnpm --filter admin build` → expect success (Next build compiles).
4. Manual check in `pnpm --filter admin dev` per the task's **Verify** note.
5. Commit.

The consolidated manual QA checklist lives in Task 21. Pure functions worth a future unit test (the `shapeTree` reducer, publish-status derivation) are isolated so a runner can be added later without refactoring; do not add the runner now.

---

## File structure

**New — `@althaqalayn/api` (additive):**
- `packages/api/src/admin.ts` — add `setSeriesPositions`, `setEpisodeNumbers`.

**New — admin field kit (`apps/admin/components/fields/`):**
- `FieldShell.tsx` — label + control slot + inline error/hint.
- `TextField.tsx`, `TextArea.tsx`, `BilingualField.tsx`, `SelectField.tsx`, `NumberStepper.tsx`, `DateField.tsx` (date + datetime), `PublishControl.tsx`, `ParentPicker.tsx`, `GradientPicker.tsx`.
- `index.ts` — barrel export.

**New — media & form engine:**
- `apps/admin/components/MediaZone.tsx` — replaces `MediaUploadField`.
- `apps/admin/components/SectionedForm.tsx` — section-card renderer + submit/validation gating + drawer & inline mounts.

**New — content workspace:**
- `apps/admin/lib/useContentTree.ts` — fetch + `shapeTree` + reload.
- `apps/admin/components/content/ContentTree.tsx` — the tree rail.
- `apps/admin/components/content/NodeDetail.tsx` — read view + overview + edit host.
- `apps/admin/components/content/ContentWorkspace.tsx` — 2-column shell (tree + detail).
- `apps/admin/components/content/editors.ts` — per-entity section configs (program/series/episode/standalone).

**Modified:**
- `apps/admin/lib/views.ts` — `View` union, `NAV`, `VIEW_TITLES`.
- `apps/admin/components/Console.tsx` — route `content`; drop `lectures`/`series` renders + the top-level `LectureEditor`.
- `apps/admin/components/form.tsx` — widen `Drawer` to 800px; keep as the drawer shell used by `SectionedForm`.
- `apps/admin/components/views/Categories.tsx`, `Transcripts.tsx`, `Gallery.tsx`, `Featured.tsx` + their editors — re-point onto `SectionedForm`.

**Removed at the end (Task 22):**
- `components/views/Lectures.tsx`, `components/views/SeriesManager.tsx`, `components/LectureEditor.tsx`, `components/EpisodesDrawer.tsx`, `components/LectureView.tsx`, `components/MediaUploadField.tsx`.

---

## Task 1: API — series/episode reorder writers

**Files:**
- Modify: `packages/api/src/admin.ts` (append after `deleteSeries`, near line 153, and after `deleteLecture`, near line 122)

**Interfaces:**
- Consumes: `AlthaqalaynClient` (already imported).
- Produces:
  - `setSeriesPositions(client: AlthaqalaynClient, orderedIds: string[]): Promise<void>` — writes `position = index` for each id.
  - `setEpisodeNumbers(client: AlthaqalaynClient, orderedIds: string[]): Promise<void>` — writes `episode = index + 1` for each id.

- [ ] **Step 1: Add the two functions**

Append to `packages/api/src/admin.ts` inside the Series section:

```ts
/** Persist a new series display order (writes the `position` column). */
export async function setSeriesPositions(
  client: AlthaqalaynClient,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      client
        .from("series")
        .update({ position: index })
        .eq("id", id)
        .then((r) => {
          if (r.error) throw new Error(r.error.message);
        }),
    ),
  );
}
```

And inside the Lectures section:

```ts
/** Persist a new episode order within a series (writes the `episode` column). */
export async function setEpisodeNumbers(
  client: AlthaqalaynClient,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      client
        .from("lectures")
        .update({ episode: index + 1 })
        .eq("id", id)
        .then((r) => {
          if (r.error) throw new Error(r.error.message);
        }),
    ),
  );
}
```

- [ ] **Step 2: Confirm barrel export**

`packages/api/src/index.ts` re-exports `admin` as a namespace (`export * as admin from "./admin"` or similar). Verify with:

Run: `grep -n "admin" packages/api/src/index.ts`
Expected: a line exporting the admin module. If admin is exported as `export * as admin`, the new functions are available as `admin.setSeriesPositions` automatically — no edit needed. If functions are re-exported individually, add the two names.

- [ ] **Step 3: Typecheck the package**

Run: `pnpm --filter @althaqalayn/api typecheck`
Expected: no errors. (If the package has no `typecheck` script, run `pnpm --filter @althaqalayn/api exec tsc --noEmit`.)

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/admin.ts packages/api/src/index.ts
git commit -m "feat(api): add setSeriesPositions + setEpisodeNumbers reorder writers"
```

---

## Task 2: Field kit — FieldShell + text/select/number inputs

**Files:**
- Create: `apps/admin/components/fields/FieldShell.tsx`
- Create: `apps/admin/components/fields/TextField.tsx`
- Create: `apps/admin/components/fields/TextArea.tsx`
- Create: `apps/admin/components/fields/BilingualField.tsx`
- Create: `apps/admin/components/fields/SelectField.tsx`
- Create: `apps/admin/components/fields/NumberStepper.tsx`
- Create: `apps/admin/components/fields/DateField.tsx`
- Create: `apps/admin/components/fields/index.ts`

**Interfaces:**
- Consumes: `brand`, `font` from `@/lib/ui`.
- Produces (all are `"use client"` components):
  - `FieldShell({ label, hint?, error?, htmlFor?, children })`
  - `TextField({ label, value, onChange, placeholder?, error?, dir? })` — `onChange: (v: string) => void`
  - `TextArea({ label, value, onChange, rows?, placeholder?, error? })`
  - `BilingualField({ label, en, ha, onEn, onHa, placeholder?, errorEn? })` — paired EN/HA text inputs
  - `SelectField({ label, value, onChange, options, error? })` — `options: { value: string; label: string }[]`
  - `NumberStepper({ label, value, onChange, min?, error? })` — `value: number | null`, `onChange: (n: number | null) => void`
  - `DateField({ label, value, onChange, mode })` — `mode: "date" | "datetime"`, value ISO string

- [ ] **Step 1: Create the shared input style + FieldShell**

`apps/admin/components/fields/FieldShell.tsx`:

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";

export const fieldInput: CSSProperties = {
  width: "100%",
  border: "1.5px solid var(--line)",
  borderRadius: 10,
  padding: "11px 13px",
  fontSize: 13.5,
  background: "var(--input)",
  outline: "none",
  fontFamily: "inherit",
};

export const fieldInputError: CSSProperties = { ...fieldInput, borderColor: "#a23e3e" };

export function FieldShell({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={styles.label}>{label}</div>
      {children}
      {error ? <div style={styles.error}>{error}</div> : hint ? <div style={styles.hint}>{hint}</div> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  label: { fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)", marginBottom: 7 },
  hint: { fontSize: 11, color: "var(--faint)", marginTop: 5 },
  error: { fontSize: 11.5, color: "#a23e3e", marginTop: 5, fontWeight: 600 },
};
```

- [ ] **Step 2: TextField + TextArea + BilingualField**

`apps/admin/components/fields/TextField.tsx`:

```tsx
"use client";

import { FieldShell, fieldInput, fieldInputError } from "./FieldShell";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string | null;
  dir?: "rtl" | "ltr";
}) {
  return (
    <FieldShell label={label} error={error}>
      <input
        value={value}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={error ? fieldInputError : fieldInput}
      />
    </FieldShell>
  );
}
```

`apps/admin/components/fields/TextArea.tsx`:

```tsx
"use client";

import { FieldShell, fieldInput, fieldInputError } from "./FieldShell";

export function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  error?: string | null;
}) {
  return (
    <FieldShell label={label} error={error}>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...(error ? fieldInputError : fieldInput), resize: "vertical", lineHeight: 1.5 }}
      />
    </FieldShell>
  );
}
```

`apps/admin/components/fields/BilingualField.tsx`:

```tsx
"use client";

import { FieldShell, fieldInput, fieldInputError } from "./FieldShell";

export function BilingualField({
  label,
  en,
  ha,
  onEn,
  onHa,
  placeholder,
  errorEn,
}: {
  label: string;
  en: string;
  ha: string;
  onEn: (v: string) => void;
  onHa: (v: string) => void;
  placeholder?: string;
  errorEn?: string | null;
}) {
  return (
    <FieldShell label={label} error={errorEn}>
      <div style={{ display: "flex", gap: 10 }}>
        <input
          value={en}
          onChange={(e) => onEn(e.target.value)}
          placeholder={placeholder ? `${placeholder} (English)` : "English"}
          style={{ ...(errorEn ? fieldInputError : fieldInput), flex: 1 }}
        />
        <input
          value={ha}
          onChange={(e) => onHa(e.target.value)}
          placeholder="Hausa"
          style={{ ...fieldInput, flex: 1 }}
        />
      </div>
    </FieldShell>
  );
}
```

- [ ] **Step 3: SelectField + NumberStepper + DateField**

`apps/admin/components/fields/SelectField.tsx`:

```tsx
"use client";

import { FieldShell, fieldInput, fieldInputError } from "./FieldShell";

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string | null;
}) {
  return (
    <FieldShell label={label} error={error}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...(error ? fieldInputError : fieldInput), cursor: "pointer" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
```

`apps/admin/components/fields/NumberStepper.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import { FieldShell } from "./FieldShell";
import { brand } from "@/lib/ui";

export function NumberStepper({
  label,
  value,
  onChange,
  min = 1,
  error,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  min?: number;
  error?: string | null;
}) {
  const set = (n: number) => onChange(Number.isFinite(n) ? Math.max(min, n) : null);
  return (
    <FieldShell label={label} error={error}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={() => set((value ?? min) - 1)} style={btn}>−</button>
        <input
          value={value ?? ""}
          inputMode="numeric"
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          style={box}
        />
        <button type="button" onClick={() => set((value ?? min - 1) + 1)} style={btn}>+</button>
      </div>
    </FieldShell>
  );
}

const box: CSSProperties = {
  width: 64,
  textAlign: "center",
  border: "1.5px solid var(--line)",
  borderRadius: 10,
  padding: "10px 6px",
  fontSize: 14,
  background: "var(--input)",
  outline: "none",
};
const btn: CSSProperties = {
  width: 36,
  height: 40,
  borderRadius: 10,
  border: "1.5px solid var(--line)",
  background: "var(--chip)",
  color: brand.greenMid,
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
  lineHeight: 1,
};
```

`apps/admin/components/fields/DateField.tsx`:

```tsx
"use client";

import { FieldShell, fieldInput } from "./FieldShell";

export function DateField({
  label,
  value,
  onChange,
  mode = "date",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mode?: "date" | "datetime";
}) {
  return (
    <FieldShell label={label}>
      <input
        type={mode === "datetime" ? "datetime-local" : "date"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...fieldInput, width: mode === "datetime" ? 250 : 200 }}
      />
    </FieldShell>
  );
}
```

- [ ] **Step 4: Barrel export**

`apps/admin/components/fields/index.ts`:

```ts
export { FieldShell, fieldInput, fieldInputError } from "./FieldShell";
export { TextField } from "./TextField";
export { TextArea } from "./TextArea";
export { BilingualField } from "./BilingualField";
export { SelectField } from "./SelectField";
export { NumberStepper } from "./NumberStepper";
export { DateField } from "./DateField";
export { PublishControl } from "./PublishControl"; // added in Task 3
export { ParentPicker } from "./ParentPicker"; // added in Task 4
export { GradientPicker } from "./GradientPicker"; // added in Task 5
```

> Note: the last three exports reference files created in Tasks 3–5. If running strictly in order, comment them out until their task lands, or accept a transient typecheck error resolved by Task 5. Recommended: create empty stub files now:
> `echo 'export {};' > apps/admin/components/fields/PublishControl.tsx` etc. — but prefer to simply add each export line in the task that creates the file. **Action for this task:** include only the first seven exports; add the remaining three in Tasks 3/4/5.

Replace Step 4's file with only the completed exports:

```ts
export { FieldShell, fieldInput, fieldInputError } from "./FieldShell";
export { TextField } from "./TextField";
export { TextArea } from "./TextArea";
export { BilingualField } from "./BilingualField";
export { SelectField } from "./SelectField";
export { NumberStepper } from "./NumberStepper";
export { DateField } from "./DateField";
```

- [ ] **Step 5: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/components/fields
git commit -m "feat(admin): field kit — FieldShell, TextField, TextArea, BilingualField, SelectField, NumberStepper, DateField"
```

---

## Task 3: Field kit — PublishControl

**Files:**
- Create: `apps/admin/components/fields/PublishControl.tsx`
- Modify: `apps/admin/components/fields/index.ts` (add export)

**Interfaces:**
- Consumes: `brand` from `@/lib/ui`; `DateField` from `./DateField`.
- Produces: `PublishControl({ status, scheduledFor, onChange })`
  - `status: "draft" | "published" | "scheduled"`
  - `scheduledFor: string` (datetime-local value, may be "")
  - `onChange: (next: { status: PublishStatus; scheduledFor: string }) => void`
  - Selecting "Schedule" reveals a `DateField mode="datetime"`. Selecting Draft/Publish clears the datetime.

- [ ] **Step 1: Implement**

`apps/admin/components/fields/PublishControl.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import type { PublishStatus } from "@althaqalayn/types";
import { brand } from "@/lib/ui";
import { DateField } from "./DateField";

const OPTIONS: { value: PublishStatus; label: string; hint: string }[] = [
  { value: "draft", label: "Draft", hint: "Saved, not visible in the app" },
  { value: "published", label: "Publish now", hint: "Goes live immediately" },
  { value: "scheduled", label: "Schedule", hint: "Auto-publishes at a set time" },
];

export function PublishControl({
  status,
  scheduledFor,
  onChange,
}: {
  status: PublishStatus;
  scheduledFor: string;
  onChange: (next: { status: PublishStatus; scheduledFor: string }) => void;
}) {
  const pick = (value: PublishStatus) =>
    onChange({ status: value, scheduledFor: value === "scheduled" ? scheduledFor : "" });

  const active = OPTIONS.find((o) => o.value === status) ?? OPTIONS[0];

  return (
    <div style={{ marginTop: 18 }}>
      <div style={styles.label}>PUBLISH</div>
      <div style={styles.seg}>
        {OPTIONS.map((o) => {
          const on = o.value === status;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              style={{ ...styles.segItem, ...(on ? styles.segOn : styles.segOff) }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <div style={styles.hint}>{active.hint}</div>
      {status === "scheduled" ? (
        <DateField
          label="SCHEDULE FOR"
          mode="datetime"
          value={scheduledFor}
          onChange={(v) => onChange({ status: "scheduled", scheduledFor: v })}
        />
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  label: { fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)", marginBottom: 7 },
  seg: { display: "flex", gap: 8 },
  segItem: {
    flex: 1,
    padding: "10px 8px",
    borderRadius: 10,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  segOn: { background: brand.green, color: "#fff", border: "none", fontWeight: 700 },
  segOff: { background: "var(--chip)", color: "var(--muted)", border: "1px solid var(--line)", fontWeight: 600 },
  hint: { fontSize: 11, color: "var(--faint)", marginTop: 6 },
};
```

- [ ] **Step 2: Export it**

Add to `apps/admin/components/fields/index.ts`:

```ts
export { PublishControl } from "./PublishControl";
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components/fields
git commit -m "feat(admin): PublishControl segmented draft/publish/schedule field"
```

---

## Task 4: Field kit — ParentPicker (dropdown + inline create)

**Files:**
- Create: `apps/admin/components/fields/ParentPicker.tsx`
- Modify: `apps/admin/components/fields/index.ts`

**Interfaces:**
- Consumes: `FieldShell`, `fieldInput` from `./FieldShell`; `brand` from `@/lib/ui`.
- Produces: `ParentPicker({ label, value, onChange, options, onCreate?, error?, allowNone? })`
  - `value: string` (selected id, "" = none)
  - `options: { value: string; label: string }[]`
  - `onCreate?: (name: string) => Promise<string>` — creates a parent, returns its new id; when provided, a "+ New" affordance appears that prompts for a name inline and selects the result.
  - `allowNone?: boolean` — adds a "— None —" option.

- [ ] **Step 1: Implement**

`apps/admin/components/fields/ParentPicker.tsx`:

```tsx
"use client";

import { useState, type CSSProperties } from "react";
import { brand } from "@/lib/ui";
import { FieldShell, fieldInput } from "./FieldShell";

export function ParentPicker({
  label,
  value,
  onChange,
  options,
  onCreate,
  error,
  allowNone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  onCreate?: (name: string) => Promise<string>;
  error?: string | null;
  allowNone?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim() || !onCreate) return;
    setBusy(true);
    try {
      const id = await onCreate(name.trim());
      onChange(id);
      setCreating(false);
      setName("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FieldShell label={label} error={error}>
      {creating ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New name…"
            style={{ ...fieldInput, flex: 1 }}
            onKeyDown={(e) => e.key === "Enter" && void create()}
          />
          <button type="button" disabled={busy} onClick={() => void create()} style={btnPrimary}>
            {busy ? "…" : "Add"}
          </button>
          <button type="button" onClick={() => setCreating(false)} style={btnGhost}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...fieldInput, cursor: "pointer", flex: 1 }}
          >
            {allowNone ? <option value="">— None —</option> : <option value="">— Select —</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {onCreate ? (
            <button type="button" onClick={() => setCreating(true)} style={btnGhost}>+ New</button>
          ) : null}
        </div>
      )}
    </FieldShell>
  );
}

const btnPrimary: CSSProperties = {
  background: brand.green,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "0 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
const btnGhost: CSSProperties = {
  background: "transparent",
  color: brand.greenMid,
  border: "1.5px solid var(--line)",
  borderRadius: 10,
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
```

- [ ] **Step 2: Export it**

Add to `apps/admin/components/fields/index.ts`:

```ts
export { ParentPicker } from "./ParentPicker";
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components/fields
git commit -m "feat(admin): ParentPicker with inline create"
```

---

## Task 5: Field kit — GradientPicker

**Files:**
- Create: `apps/admin/components/fields/GradientPicker.tsx`
- Modify: `apps/admin/components/fields/index.ts`

**Interfaces:**
- Consumes: `FieldShell` from `./FieldShell`; `coverGradient` from `@/lib/ui`.
- Produces: `GradientPicker({ label, value, onChange, arabic, onArabic })`
  - `value: [string, string]` (from/to), `onChange: (g: [string, string]) => void`
  - `arabic: string`, `onArabic: (v: string) => void` — the optional cover motif glyph.

- [ ] **Step 1: Implement**

`apps/admin/components/fields/GradientPicker.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import { coverGradient, font } from "@/lib/ui";
import { FieldShell, fieldInput } from "./FieldShell";

const PRESETS: [string, string][] = [
  ["#0B4634", "#17795E"],
  ["#12634E", "#1F8A6B"],
  ["#6a4f9c", "#9a7ccb"],
  ["#a23e3e", "#c76b6b"],
  ["#9a7420", "#d0a03f"],
  ["#25506b", "#3f83ad"],
];

export function GradientPicker({
  label,
  value,
  onChange,
  arabic,
  onArabic,
}: {
  label: string;
  value: [string, string];
  onChange: (g: [string, string]) => void;
  arabic: string;
  onArabic: (v: string) => void;
}) {
  return (
    <FieldShell label={label}>
      <div style={{ ...styles.preview, background: coverGradient(value[0], value[1]) }}>
        {arabic ? <span style={styles.motif}>{arabic}</span> : null}
      </div>
      <div style={styles.swatches}>
        {PRESETS.map((g) => {
          const on = g[0] === value[0] && g[1] === value[1];
          return (
            <button
              key={g.join()}
              type="button"
              onClick={() => onChange(g)}
              style={{
                ...styles.swatch,
                background: coverGradient(g[0], g[1]),
                outline: on ? "2px solid var(--ink)" : "none",
              }}
              aria-label={`Gradient ${g.join(" to ")}`}
            />
          );
        })}
      </div>
      <input
        value={arabic}
        onChange={(e) => onArabic(e.target.value)}
        placeholder="Arabic motif (optional), e.g. ﷺ"
        dir="rtl"
        style={{ ...fieldInput, marginTop: 10, fontFamily: font.arabic }}
      />
    </FieldShell>
  );
}

const styles: Record<string, CSSProperties> = {
  preview: { height: 84, borderRadius: 12, position: "relative", overflow: "hidden" },
  motif: { position: "absolute", right: 6, top: -6, fontFamily: font.arabic, fontSize: 54, color: "rgba(255,255,255,.18)" },
  swatches: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  swatch: { width: 40, height: 28, borderRadius: 8, border: "none", cursor: "pointer" },
};
```

- [ ] **Step 2: Export it**

Add to `apps/admin/components/fields/index.ts`:

```ts
export { GradientPicker } from "./GradientPicker";
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components/fields
git commit -m "feat(admin): GradientPicker cover control"
```

---

## Task 6: MediaZone — drag-drop upload, progress, guards, preview, auto-duration

**Files:**
- Create: `apps/admin/components/MediaZone.tsx`

**Interfaces:**
- Consumes: `MediaPreview` from `@/components/MediaPreview`; `uploadMedia`, `deleteMedia`, `storagePathFromUrl`, `MAX_MEDIA_BYTES` from `@/lib/upload`; `brand` from `@/lib/ui`; `MediaType` from `@althaqalayn/types`.
- Produces: `MediaZone({ type, value, onChange, folder?, compact?, onBusyChange?, onDurationDetected? })`
  - `value: string` (public URL, "" = none), `onChange: (url: string) => void`
  - `onBusyChange?: (busy: boolean) => void` — fires true while uploading (form uses it to gate save)
  - `onDurationDetected?: (seconds: number) => void` — fires once media metadata loads (audio/video)
  - `folder?: string` — storage folder passed to `uploadMedia` (default `"lectures"`)

> Note: `uploadMedia` uses a single Supabase `upload` call with no progress event. True byte-progress isn't exposed by the JS SDK's simple upload, so "progress" here is an **indeterminate** animated bar while `uploading` is true. Do not claim determinate percentage — the spec's "progress" is satisfied by a clear in-flight indicator. Keep the bar indeterminate.

- [ ] **Step 1: Implement**

`apps/admin/components/MediaZone.tsx`:

```tsx
"use client";

import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import type { MediaType } from "@althaqalayn/types";
import { MediaPreview } from "@/components/MediaPreview";
import { brand } from "@/lib/ui";
import { MAX_MEDIA_BYTES, deleteMedia, storagePathFromUrl, uploadMedia } from "@/lib/upload";

const ACCEPT: Record<Exclude<MediaType, "text">, string> = {
  audio: "audio/*",
  video: "video/*",
};

export function MediaZone({
  type,
  value,
  onChange,
  folder = "lectures",
  compact,
  onBusyChange,
  onDurationDetected,
}: {
  type: MediaType;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  compact?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onDurationDetected?: (seconds: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (type === "text") return null; // text uses TextArea + MediaPreview directly

  const mediaKind = type as Exclude<MediaType, "text">;

  const validate = (file: File): string | null => {
    if (file.size > MAX_MEDIA_BYTES) {
      return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 50 MB.`;
    }
    const prefix = mediaKind === "audio" ? "audio/" : "video/";
    if (file.type && !file.type.startsWith(prefix)) {
      return `That looks like a ${file.type || "non-" + mediaKind} file — choose ${mediaKind === "audio" ? "an audio" : "a video"} file.`;
    }
    return null;
  };

  const handleFile = async (file: File) => {
    const bad = validate(file);
    if (bad) {
      setError(bad);
      return;
    }
    setError(null);
    setUploading(true);
    onBusyChange?.(true);
    try {
      const { url } = await uploadMedia(file, folder);
      const old = storagePathFromUrl(value);
      if (old) await deleteMedia(old);
      onChange(url);
      setName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  const remove = async () => {
    const old = storagePathFromUrl(value);
    if (old) await deleteMedia(old);
    onChange("");
    setName("");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  return (
    <div>
      {value ? (
        <div style={styles.filled}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.name}>{name || "Current file"}</div>
            <div style={styles.url}>{value}</div>
          </div>
          <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} style={styles.action}>
            {uploading ? "Uploading…" : "Replace"}
          </button>
          <button type="button" onClick={() => void remove()} style={styles.actionMuted}>Remove</button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            ...styles.dropzone,
            ...(compact ? { padding: 16 } : null),
            ...(dragOver ? { borderColor: brand.greenMid, background: "var(--chip)" } : null),
          }}
        >
          <div style={styles.dzTitle}>
            {uploading ? "Uploading…" : dragOver ? "Drop to upload" : `Drag a ${mediaKind} file here, or click to browse`}
          </div>
          <div style={styles.dzHint}>{mediaKind === "audio" ? "MP3, M4A" : "MP4, MOV"} · max 50 MB</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[mediaKind]}
        hidden
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void handleFile(f);
        }}
      />

      {uploading ? <div style={styles.barTrack}><div style={styles.barFill} /></div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      {value ? (
        <div
          style={{ marginTop: 10 }}
          onLoadedMetadata={(e) => {
            const el = e.target as HTMLMediaElement;
            if (el.duration && Number.isFinite(el.duration)) onDurationDetected?.(Math.round(el.duration));
          }}
        >
          <MediaPreview type={type} url={value} />
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  dropzone: {
    border: "1.6px dashed var(--line)",
    borderRadius: 14,
    padding: 26,
    textAlign: "center",
    background: "var(--input)",
    cursor: "pointer",
  },
  dzTitle: { fontSize: 13.5, fontWeight: 600, color: "var(--ink)" },
  dzHint: { fontSize: 11.5, color: "var(--faint)", marginTop: 3 },
  filled: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1.5px solid var(--line)",
    borderRadius: 12,
    padding: "12px 14px",
    background: "var(--input)",
  },
  name: { fontSize: 13, fontWeight: 600 },
  url: { fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  action: { flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: brand.greenMid, cursor: "pointer", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 9, background: "transparent" },
  actionMuted: { flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: "var(--muted)", cursor: "pointer", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 9, background: "transparent" },
  barTrack: { height: 4, borderRadius: 4, background: "var(--line)", overflow: "hidden", marginTop: 10 },
  barFill: { height: "100%", width: "40%", background: brand.greenMid, borderRadius: 4, animation: "mediaZoneBar 1s ease-in-out infinite" },
  error: { fontSize: 11.5, color: "#a23e3e", marginTop: 8, fontWeight: 600 },
};
```

- [ ] **Step 2: Add the bar keyframes**

The indeterminate bar needs a keyframe. Add to `apps/admin/app/globals.css` (append at end):

```css
@keyframes mediaZoneBar {
  0% { margin-left: -40%; }
  100% { margin-left: 100%; }
}
```

Run: `grep -n "globals.css" apps/admin/app/layout.tsx` to confirm the stylesheet import path; if globals.css lives elsewhere, append there.

- [ ] **Step 3: onLoadedMetadata caveat**

`onLoadedMetadata` on a wrapping `<div>` relies on event bubbling; media `loadedmetadata` does **not** bubble in the DOM spec, but React attaches media events via its synthetic system where `onLoadedMetadata` works when placed directly on the media element. To be safe, move the handler onto the element: instead of the wrapper div carrying `onLoadedMetadata`, render `MediaPreview` and attach duration detection via a dedicated hidden probe. Replace the `value` preview block in Step 1 with:

```tsx
      {value ? (
        <div style={{ marginTop: 10 }}>
          <MediaPreview type={type} url={value} />
          {onDurationDetected ? (
            mediaKind === "audio" ? (
              <audio src={value} preload="metadata" style={{ display: "none" }}
                onLoadedMetadata={(e) => {
                  const d = (e.currentTarget as HTMLAudioElement).duration;
                  if (d && Number.isFinite(d)) onDurationDetected(Math.round(d));
                }} />
            ) : (
              <video src={value} preload="metadata" style={{ display: "none" }}
                onLoadedMetadata={(e) => {
                  const d = (e.currentTarget as HTMLVideoElement).duration;
                  if (d && Number.isFinite(d)) onDurationDetected(Math.round(d));
                }} />
            )
          ) : null}
        </div>
      ) : null}
```

Remove the `onLoadedMetadata` from the wrapper div in Step 1 (use this block instead).

- [ ] **Step 4: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 5: Verify (manual)**

In `pnpm --filter admin dev`, temporarily drop a `<MediaZone type="audio" value="" onChange={console.log} />` into any view; drag an MP3 → uploads, preview appears; drag a >50MB or a `.pdf` → inline error, no upload; Replace swaps file; Remove clears. Revert the temporary mount before committing.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/components/MediaZone.tsx apps/admin/app/globals.css
git commit -m "feat(admin): MediaZone — drag-drop upload, size/MIME guards, preview, auto-duration"
```

---

## Task 7: SectionedForm engine + widened Drawer

**Files:**
- Create: `apps/admin/components/SectionedForm.tsx`
- Modify: `apps/admin/components/form.tsx` (widen `Drawer` from 472 → 800; no API change)

**Interfaces:**
- Consumes: `brand`, `font` from `@/lib/ui`.
- Produces:
  - `type FormSection = { key: string; title: string; render: () => ReactNode }`
  - `SectionedForm({ sections, error, footer })` — renders titled section cards, an optional form-level error banner, and a footer slot. It is layout-only; parent owns state, validation, and submit. (Validation gating is enforced by the parent via the footer's disabled button — see editors in Tasks 11–14.)
  - `mount` is decided by the caller: inside `NodeDetail` (inline) or inside `Drawer` (overlay). `SectionedForm` itself renders neither scrim nor position — just the stack of cards + error + footer.

> Design decision: keeping `SectionedForm` mount-agnostic (no drawer/scrim of its own) is what lets the *same* component render inline in the panel and inside the `Drawer` shell. The `Drawer` (from `form.tsx`) supplies header + scrim + footer chrome for overlay editors; `NodeDetail` supplies header + footer for inline.

- [ ] **Step 1: Widen the Drawer shell**

In `apps/admin/components/form.tsx`, change the drawer width. Find (line ~92):

```ts
    width: 472,
```

Replace with:

```ts
    width: 800,
```

- [ ] **Step 2: Implement SectionedForm**

`apps/admin/components/SectionedForm.tsx`:

```tsx
"use client";

import type { CSSProperties, ReactNode } from "react";
import { font } from "@/lib/ui";

export interface FormSection {
  key: string;
  title: string;
  render: () => ReactNode;
}

export function SectionedForm({
  sections,
  error,
  footer,
}: {
  sections: FormSection[];
  error?: string | null;
  footer?: ReactNode;
}) {
  return (
    <div>
      {sections.map((s) => (
        <div key={s.key} style={styles.card}>
          <div style={styles.cardTitle}>{s.title}</div>
          {s.render()}
        </div>
      ))}
      {error ? <div style={styles.error}>{error}</div> : null}
      {footer ? <div style={styles.footer}>{footer}</div> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 16,
    padding: "18px 20px 22px",
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: font.heading,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: ".6px",
    color: "var(--faint)",
    textTransform: "uppercase",
    paddingBottom: 12,
    marginBottom: 4,
    borderBottom: "1px solid var(--line)",
  },
  error: { color: "#a23e3e", fontSize: 12.5, marginTop: 4, marginBottom: 12, fontWeight: 600 },
  footer: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 },
};
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success. (Existing drawer editors still compile — only width changed.)

- [ ] **Step 4: Verify (manual)**

Open any existing editor (e.g. Categories → New): the drawer is now ~800px wide. Nothing else changed yet.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/components/SectionedForm.tsx apps/admin/components/form.tsx
git commit -m "feat(admin): SectionedForm engine + widen Drawer to 800px"
```

---

## Task 8: useContentTree — fetch + shape the hierarchy

**Files:**
- Create: `apps/admin/lib/useContentTree.ts`

**Interfaces:**
- Consumes: `getClient` from `@/lib/supabase`; `admin`, `mapProgram`, `mapSeries`, `mapLecture`, `unwrap`, row types from `@althaqalayn/api`; domain types from `@althaqalayn/types`.
- Produces:
  - `interface SeriesNode extends Series { episodes: Lecture[] }`
  - `interface ProgramNode extends Program { seriesNodes: SeriesNode[] }`
  - `interface ContentTree { programs: ProgramNode[]; standalone: Lecture[]; orphanSeries: SeriesNode[] }`
  - `shapeTree(programs: Program[], series: Series[], lectures: Lecture[]): ContentTree` — **pure**, exported for future unit testing.
  - `useContentTree(): { tree: ContentTree | null; loading: boolean; error: string | null; reload: () => Promise<void> }`

- [ ] **Step 1: Implement**

`apps/admin/lib/useContentTree.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  mapLecture,
  mapProgram,
  mapSeries,
  unwrap,
  type LectureRow,
  type ProgramRow,
  type SeriesRow,
} from "@althaqalayn/api";
import type { Lecture, Program, Series } from "@althaqalayn/types";
import { getClient } from "@/lib/supabase";

export interface SeriesNode extends Series {
  episodes: Lecture[];
}
export interface ProgramNode extends Program {
  seriesNodes: SeriesNode[];
}
export interface ContentTree {
  programs: ProgramNode[];
  orphanSeries: SeriesNode[];
  standalone: Lecture[];
}

/** Pure: fold flat rows into the Program → Series → Episode hierarchy. */
export function shapeTree(programs: Program[], series: Series[], lectures: Lecture[]): ContentTree {
  const episodesBySeries = new Map<string, Lecture[]>();
  const standalone: Lecture[] = [];
  for (const l of lectures) {
    if (l.seriesId) {
      const arr = episodesBySeries.get(l.seriesId) ?? [];
      arr.push(l);
      episodesBySeries.set(l.seriesId, arr);
    } else {
      standalone.push(l);
    }
  }
  for (const arr of episodesBySeries.values()) {
    arr.sort((a, b) => (a.episode ?? 0) - (b.episode ?? 0));
  }

  const seriesNodes: SeriesNode[] = series.map((s) => ({
    ...s,
    episodes: episodesBySeries.get(s.id) ?? [],
  }));
  const byProgram = new Map<string, SeriesNode[]>();
  const orphanSeries: SeriesNode[] = [];
  for (const sn of seriesNodes) {
    if (sn.programId) {
      const arr = byProgram.get(sn.programId) ?? [];
      arr.push(sn);
      byProgram.set(sn.programId, arr);
    } else {
      orphanSeries.push(sn);
    }
  }

  const programNodes: ProgramNode[] = programs.map((p) => ({
    ...p,
    seriesNodes: byProgram.get(p.id) ?? [],
  }));

  return { programs: programNodes, orphanSeries, standalone };
}

export function useContentTree() {
  const [tree, setTree] = useState<ContentTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const client = getClient();
    try {
      const [progs, sers, lecs] = await Promise.all([
        client.from("programs").select("*").order("created_at").then((r) => unwrap<ProgramRow[]>(r).map(mapProgram)),
        client.from("series").select("*").order("position").then((r) => unwrap<SeriesRow[]>(r).map(mapSeries)),
        client.from("lectures").select("*").order("date", { ascending: false }).then((r) => unwrap<LectureRow[]>(r).map(mapLecture)),
      ]);
      setTree(shapeTree(progs, sers, lecs));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load content");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { tree, loading, error, reload };
}
```

- [ ] **Step 2: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add apps/admin/lib/useContentTree.ts
git commit -m "feat(admin): useContentTree hook + pure shapeTree reducer"
```

---

## Task 9: ContentTree rail

**Files:**
- Create: `apps/admin/components/content/ContentTree.tsx`

**Interfaces:**
- Consumes: `ContentTree`, `ProgramNode`, `SeriesNode` from `@/lib/useContentTree`; `brand`, `font`, `statusPill` from `@/lib/ui`; `ActionMenu` from `@/components/ActionMenu`.
- Produces:
  - `type NodeRef = { kind: "program" | "series" | "episode" | "standalone"; id: string }`
  - `type NewKind = { kind: "program" } | { kind: "series"; programId?: string } | { kind: "episode"; seriesId: string } | { kind: "standalone" }`
  - `ContentTree({ tree, selected, onSelect, onNew, query, onQuery })`
    - `selected: NodeRef | null`, `onSelect: (ref: NodeRef) => void`
    - `onNew: (k: NewKind) => void`

- [ ] **Step 1: Implement**

`apps/admin/components/content/ContentTree.tsx`:

```tsx
"use client";

import { useState, type CSSProperties } from "react";
import { brand, font } from "@/lib/ui";
import type { ContentTree as Tree, ProgramNode, SeriesNode } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export type NodeRef = { kind: "program" | "series" | "episode" | "standalone"; id: string };
export type NewKind =
  | { kind: "program" }
  | { kind: "series"; programId?: string }
  | { kind: "episode"; seriesId: string }
  | { kind: "standalone" };

export function ContentTree({
  tree,
  selected,
  onSelect,
  onNew,
  query,
  onQuery,
}: {
  tree: Tree;
  selected: NodeRef | null;
  onSelect: (ref: NodeRef) => void;
  onNew: (k: NewKind) => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newOpen, setNewOpen] = useState(false);
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
  const q = query.trim().toLowerCase();
  const match = (t?: { en: string; ha?: string }) => !q || pick(t).toLowerCase().includes(q);

  const isSel = (ref: NodeRef) => selected?.kind === ref.kind && selected?.id === ref.id;

  const renderSeries = (sn: SeriesNode) => {
    const open = expanded[sn.id] || !!q;
    const eps = sn.episodes.filter((e) => match(e.title));
    if (q && !match(sn.title) && eps.length === 0) return null;
    return (
      <div key={sn.id}>
        <div style={{ ...row(isSel({ kind: "series", id: sn.id })), paddingLeft: 26 }}>
          <button style={caret} onClick={() => toggle(sn.id)} aria-label="Expand">{open ? "▾" : "▸"}</button>
          <button style={rowLabel} onClick={() => onSelect({ kind: "series", id: sn.id })}>{pick(sn.title)}</button>
          <span style={count}>{sn.episodes.length}</span>
        </div>
        {open
          ? eps.map((e) => (
              <button
                key={e.id}
                onClick={() => onSelect({ kind: "episode", id: e.id })}
                style={{ ...row(isSel({ kind: "episode", id: e.id })), paddingLeft: 48, border: "none", width: "100%" }}
              >
                <span style={epNum}>{e.episode ?? "•"}</span>
                <span style={rowLabelText}>{pick(e.title)}</span>
              </button>
            ))
          : null}
        {open ? (
          <button style={addChild} onClick={() => onNew({ kind: "episode", seriesId: sn.id })}>+ Episode</button>
        ) : null}
      </div>
    );
  };

  const renderProgram = (pn: ProgramNode) => {
    const open = expanded[pn.id] || !!q;
    const kids = pn.seriesNodes.filter((sn) => match(sn.title) || sn.episodes.some((e) => match(e.title)));
    if (q && !match(pn.title) && kids.length === 0) return null;
    return (
      <div key={pn.id}>
        <div style={row(isSel({ kind: "program", id: pn.id }))}>
          <button style={caret} onClick={() => toggle(pn.id)} aria-label="Expand">{open ? "▾" : "▸"}</button>
          <button style={rowLabel} onClick={() => onSelect({ kind: "program", id: pn.id })}>{pick(pn.title)}</button>
          <span style={count}>{pn.seriesNodes.length}</span>
        </div>
        {open ? kids.map(renderSeries) : null}
        {open ? (
          <button style={addChild} onClick={() => onNew({ kind: "series", programId: pn.id })}>+ Series</button>
        ) : null}
      </div>
    );
  };

  return (
    <div style={rail}>
      <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search content…" style={search} />

      <div className="noscroll" style={scroll}>
        {tree.programs.map(renderProgram)}
        {tree.orphanSeries.length ? <div style={groupLabel}>SERIES (NO PROGRAM)</div> : null}
        {tree.orphanSeries.filter((sn) => match(sn.title) || sn.episodes.some((e) => match(e.title))).map(renderSeries)}
        {tree.standalone.length ? <div style={groupLabel}>STANDALONE</div> : null}
        {tree.standalone.filter((l) => match(l.title)).map((l) => (
          <button
            key={l.id}
            onClick={() => onSelect({ kind: "standalone", id: l.id })}
            style={{ ...row(isSel({ kind: "standalone", id: l.id })), paddingLeft: 26, border: "none", width: "100%" }}
          >
            <span style={rowLabelText}>{pick(l.title)}</span>
          </button>
        ))}
      </div>

      <div style={{ position: "relative", padding: 12, borderTop: "1px solid var(--line)" }}>
        <button style={newBtn} onClick={() => setNewOpen((o) => !o)}>+ New ▾</button>
        {newOpen ? (
          <>
            <div style={scrim} onClick={() => setNewOpen(false)} />
            <div style={menu}>
              {[
                { label: "Program", k: { kind: "program" } as NewKind },
                { label: "Series", k: { kind: "series" } as NewKind },
                { label: "Standalone lecture", k: { kind: "standalone" } as NewKind },
              ].map((it) => (
                <button key={it.label} style={menuItem} onClick={() => { setNewOpen(false); onNew(it.k); }}>
                  {it.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

const rail: CSSProperties = { width: 300, flexShrink: 0, borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", background: "var(--card)" };
const search: CSSProperties = { margin: 12, padding: "9px 12px", border: "1.5px solid var(--line)", borderRadius: 10, background: "var(--input)", fontSize: 13, outline: "none" };
const scroll: CSSProperties = { flex: 1, overflowY: "auto", padding: "0 8px 12px" };
const row = (sel: boolean): CSSProperties => ({
  display: "flex", alignItems: "center", gap: 6, padding: "7px 8px", borderRadius: 8, background: sel ? "var(--chip)" : "transparent", cursor: "pointer",
});
const caret: CSSProperties = { background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", width: 16, fontSize: 11, flexShrink: 0 };
const rowLabel: CSSProperties = { flex: 1, textAlign: "left", background: "transparent", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: font.ui };
const rowLabelText: CSSProperties = { flex: 1, textAlign: "left", fontSize: 12.5, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const count: CSSProperties = { fontSize: 10.5, fontWeight: 700, color: "var(--faint)", background: "var(--chip)", borderRadius: 20, padding: "1px 8px", flexShrink: 0 };
const epNum: CSSProperties = { width: 20, fontSize: 10.5, fontWeight: 800, color: brand.greenMid, flexShrink: 0 };
const groupLabel: CSSProperties = { fontSize: 10, fontWeight: 800, letterSpacing: ".8px", color: "var(--faint)", padding: "14px 10px 6px" };
const addChild: CSSProperties = { marginLeft: 26, marginTop: 2, marginBottom: 4, background: "transparent", border: "none", color: brand.greenMid, fontSize: 11.5, fontWeight: 700, cursor: "pointer", fontFamily: font.ui };
const newBtn: CSSProperties = { width: "100%", background: brand.green, color: "#fff", border: "none", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font.ui };
const scrim: CSSProperties = { position: "fixed", inset: 0, zIndex: 40 };
const menu: CSSProperties = { position: "absolute", bottom: 56, left: 12, right: 12, zIndex: 41, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,.18)", padding: 6 };
const menuItem: CSSProperties = { display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", borderRadius: 7, padding: "9px 12px", fontSize: 13, fontWeight: 600, color: "var(--ink)", cursor: "pointer", fontFamily: font.ui };
```

- [ ] **Step 2: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success. (Unused-import warnings for `ActionMenu`/`statusPill` are fine — they are wired in the interface note but not required in this render; remove the interface-note imports if the linter errors on unused. Keep only imports actually used: `brand`, `font`.)

- [ ] **Step 3: Commit**

```bash
git add apps/admin/components/content/ContentTree.tsx
git commit -m "feat(admin): ContentTree rail with search, expand, context New"
```

---

## Task 10: ContentWorkspace shell + NodeDetail read view

**Files:**
- Create: `apps/admin/components/content/NodeDetail.tsx`
- Create: `apps/admin/components/content/ContentWorkspace.tsx`

**Interfaces:**
- Consumes: `useContentTree`, node types from `@/lib/useContentTree`; `ContentTree` component + `NodeRef`/`NewKind` from `./ContentTree`; `brand`, `font`, `statusPill`, `mediaBadge`, `coverGradient` from `@/lib/ui`; `MediaPreview` from `@/components/MediaPreview`.
- Produces:
  - `ContentWorkspace()` — the view rendered by `Console` for `view === "content"`. Owns `selected`, `query`, `mode` (`"read" | "edit" | "new"`), and a `draftNew: NewKind | null`.
  - `NodeDetail({ tree, selected, onEdit })` — read-only view of the selected node + an Edit button; an empty-selection overview. **Editors themselves are added in Tasks 11–14**; this task renders read + overview + an Edit button that flips `mode` (button is inert until Task 11 wires editors — acceptable intermediate state).

- [ ] **Step 1: Implement NodeDetail (read + overview)**

`apps/admin/components/content/NodeDetail.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import { coverGradient, font, mediaBadge, statusPill } from "@/lib/ui";
import { MediaPreview } from "@/components/MediaPreview";
import type { ContentTree, ProgramNode, SeriesNode } from "@/lib/useContentTree";
import type { NodeRef } from "./ContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export function NodeDetail({
  tree,
  selected,
  onEdit,
}: {
  tree: ContentTree;
  selected: NodeRef | null;
  onEdit: () => void;
}) {
  if (!selected) return <Overview tree={tree} />;

  if (selected.kind === "program") {
    const p = tree.programs.find((x) => x.id === selected.id);
    if (!p) return <Missing />;
    return (
      <Frame title={pick(p.title)} sub="Program" onEdit={onEdit}>
        <Meta label="Series" value={String(p.seriesNodes.length)} />
        {p.description?.en ? <Meta label="Description" value={p.description.en} /> : null}
      </Frame>
    );
  }

  if (selected.kind === "series") {
    const s = findSeries(tree, selected.id);
    if (!s) return <Missing />;
    return (
      <Frame title={pick(s.title)} sub="Series" onEdit={onEdit}>
        <div style={{ ...cover, background: coverGradient(s.cover.gradient[0], s.cover.gradient[1]) }}>
          {s.cover.arabic ? <span style={motif}>{s.cover.arabic}</span> : null}
        </div>
        <Meta label="Kind" value={s.occasion ?? s.kind} />
        {s.year ? <Meta label="Year" value={s.year} /> : null}
        <Meta label="Language" value={s.language === "ha" ? "Hausa" : "English"} />
        <Meta label="Episodes" value={String(s.episodes.length)} />
      </Frame>
    );
  }

  // episode or standalone → a lecture
  const l = selected.kind === "episode" ? findEpisode(tree, selected.id) : tree.standalone.find((x) => x.id === selected.id);
  if (!l) return <Missing />;
  const badge = mediaBadge(l.type);
  const pill = statusPill(l.status);
  return (
    <Frame title={pick(l.title)} sub={selected.kind === "episode" ? "Episode" : "Standalone lecture"} onEdit={onEdit}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <span style={{ ...chip, background: badge.bg, color: badge.fg }}>{l.type.toUpperCase()}</span>
        <span style={{ ...chip, background: pill.bg, color: pill.fg }}>{pill.label}</span>
      </div>
      {l.type === "text" ? (
        <MediaPreview type="text" body={l.body?.en ?? l.body?.ha} />
      ) : (
        <MediaPreview type={l.type} url={l.mediaUrl} />
      )}
      {l.episode != null ? <Meta label="Episode" value={`Part ${l.episode}`} /> : null}
      {l.year ? <Meta label="Year" value={l.year} /> : null}
      <Meta label="Language" value={l.language === "ha" ? "Hausa" : "English"} />
      {l.duration ? <Meta label="Length" value={`${Math.round(l.duration / 60)} min`} /> : null}
      <Meta label="Date" value={l.date} />
      {l.description?.en ? <Meta label="Description" value={l.description.en} /> : null}
    </Frame>
  );
}

function findSeries(tree: ContentTree, id: string): SeriesNode | undefined {
  for (const p of tree.programs) {
    const hit = p.seriesNodes.find((s) => s.id === id);
    if (hit) return hit;
  }
  return tree.orphanSeries.find((s) => s.id === id);
}
function findEpisode(tree: ContentTree, id: string) {
  for (const p of tree.programs) for (const s of p.seriesNodes) { const e = s.episodes.find((x) => x.id === id); if (e) return e; }
  for (const s of tree.orphanSeries) { const e = s.episodes.find((x) => x.id === id); if (e) return e; }
  return undefined;
}

function Overview({ tree }: { tree: ContentTree }) {
  const seriesCount = tree.programs.reduce((n, p) => n + p.seriesNodes.length, 0) + tree.orphanSeries.length;
  const epCount =
    tree.programs.reduce((n, p) => n + p.seriesNodes.reduce((m, s) => m + s.episodes.length, 0), 0) +
    tree.orphanSeries.reduce((m, s) => m + s.episodes.length, 0) +
    tree.standalone.length;
  return (
    <div style={{ padding: 40, color: "var(--muted)" }}>
      <div style={{ fontFamily: font.heading, fontSize: 20, color: "var(--ink)", marginBottom: 8 }}>Content</div>
      <div style={{ fontSize: 13.5 }}>
        {tree.programs.length} programs · {seriesCount} series · {epCount} lectures.
      </div>
      <div style={{ fontSize: 13, marginTop: 12 }}>Select an item on the left, or use <b>+ New</b> to add content.</div>
    </div>
  );
}

function Frame({ title, sub, onEdit, children }: { title: string; sub: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div style={{ padding: 28, maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)" }}>{sub.toUpperCase()}</div>
          <div style={{ fontFamily: font.heading, fontSize: 22, fontWeight: 600, marginTop: 4 }}>{title}</div>
        </div>
        <button onClick={onEdit} style={editBtn}>Edit</button>
      </div>
      {children}
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ paddingTop: 12, borderTop: "1px solid var(--line)", marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)", marginBottom: 5 }}>{label.toUpperCase()}</div>
      <div style={{ fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}
function Missing() {
  return <div style={{ padding: 40, color: "var(--muted)" }}>This item was removed. Select another.</div>;
}

const editBtn: CSSProperties = { flexShrink: 0, background: "var(--chip)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: font.ui };
const chip: CSSProperties = { fontSize: 9.5, fontWeight: 800, letterSpacing: ".5px", borderRadius: 6, padding: "4px 8px" };
const cover: CSSProperties = { height: 120, borderRadius: 14, position: "relative", overflow: "hidden", marginBottom: 8 };
const motif: CSSProperties = { position: "absolute", right: 10, top: -10, fontFamily: font.arabic, fontSize: 72, color: "rgba(255,255,255,.16)" };
```

- [ ] **Step 2: Implement ContentWorkspace shell**

`apps/admin/components/content/ContentWorkspace.tsx`:

```tsx
"use client";

import { useState, type CSSProperties } from "react";
import { useContentTree } from "@/lib/useContentTree";
import { ContentTree, type NewKind, type NodeRef } from "./ContentTree";
import { NodeDetail } from "./NodeDetail";

export function ContentWorkspace() {
  const { tree, loading, error, reload } = useContentTree();
  const [selected, setSelected] = useState<NodeRef | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"read" | "edit" | "new">("read");
  const [draftNew, setDraftNew] = useState<NewKind | null>(null);

  if (loading) return <div style={pad}>Loading…</div>;
  if (error || !tree) return <div style={pad}>Couldn’t load content: {error}</div>;

  const onNew = (k: NewKind) => {
    setDraftNew(k);
    setMode("new");
    setSelected(null);
  };

  return (
    <div style={shell}>
      <ContentTree
        tree={tree}
        selected={selected}
        onSelect={(ref) => { setSelected(ref); setMode("read"); setDraftNew(null); }}
        onNew={onNew}
        query={query}
        onQuery={setQuery}
      />
      <div className="noscroll" style={detail}>
        {/* Tasks 11–14 replace this block with the editor when mode==="edit"/"new". */}
        <NodeDetail tree={tree} selected={selected} onEdit={() => setMode("edit")} />
      </div>
    </div>
  );
}

const shell: CSSProperties = { display: "flex", height: "100%", margin: -26, border: "1px solid var(--line)", borderRadius: 0, background: "var(--bg)" };
const detail: CSSProperties = { flex: 1, overflowY: "auto", minWidth: 0 };
const pad: CSSProperties = { padding: 26, color: "var(--muted)" };
```

> The negative `margin: -26` offsets `Console`'s `padding: 26` so the workspace spans the full content area. Verify against `Console.tsx` line 38 (`padding: 26`).

- [ ] **Step 3: Temporarily route it (for verification)**

To verify before the nav swap (Task 15), temporarily add to `Console.tsx`: import `ContentWorkspace` and render it when `view === "media"` is NOT — instead, simplest: add a throwaway check. **Skip runtime wiring here**; instead verify via build only. (Full routing lands in Task 15.)

- [ ] **Step 4: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/components/content/NodeDetail.tsx apps/admin/components/content/ContentWorkspace.tsx
git commit -m "feat(admin): ContentWorkspace shell + NodeDetail read view + overview"
```

---

## Task 11: Program & Series editors (inline in the panel)

**Files:**
- Create: `apps/admin/components/content/ProgramForm.tsx`
- Create: `apps/admin/components/content/SeriesForm.tsx`
- Modify: `apps/admin/components/content/ContentWorkspace.tsx` (render editors on edit/new)

**Interfaces:**
- Consumes: field kit from `@/components/fields`; `SectionedForm`, `FormSection` from `@/components/SectionedForm`; `admin` from `@althaqalayn/api`; `getClient` from `@/lib/supabase`; `brand`, `font`, `YEARS` from `@/lib/ui`; `SERIES_KINDS`, `LANGUAGES` from `@althaqalayn/types`; node types from `@/lib/useContentTree`.
- Produces:
  - `ProgramForm({ program, onCancel, onSaved })` — `program: ProgramNode | null` (null = new). `onSaved: () => void`.
  - `SeriesForm({ series, programId, programs, onCancel, onSaved, onCreateProgram })`
    - `series: SeriesNode | null`; `programId?: string` (preselect for new-under-program)
    - `programs: { value: string; label: string }[]`
    - `onCreateProgram: (name: string) => Promise<string>` — used by `ParentPicker` inline create

- [ ] **Step 1: ProgramForm**

`apps/admin/components/content/ProgramForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { admin } from "@althaqalayn/api";
import { BilingualField, TextArea, TextField } from "@/components/fields";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { EditorFooter } from "./EditorFooter";
import type { ProgramNode } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export function ProgramForm({
  program,
  onCancel,
  onSaved,
}: {
  program: ProgramNode | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [titleEn, setTitleEn] = useState(program ? pick(program.title) : "");
  const [titleHa, setTitleHa] = useState(program?.title.ha ?? "");
  const [arabic, setArabic] = useState(program?.arabic ?? "");
  const [descEn, setDescEn] = useState(program?.description?.en ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const save = async () => {
    if (!titleEn.trim()) { setTitleError("English title is required."); return; }
    setBusy(true); setError(null);
    try {
      await admin.upsertProgram(
        getClient(),
        {
          title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
          ...(arabic.trim() ? { arabic: arabic.trim() } : {}),
          ...(descEn.trim() ? { description: { en: descEn.trim() } } : {}),
        },
        program?.id,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const sections: FormSection[] = [
    {
      key: "details",
      title: "Details",
      render: () => (
        <>
          <BilingualField label="TITLE" en={titleEn} ha={titleHa} onEn={(v) => { setTitleEn(v); setTitleError(null); }} onHa={setTitleHa} placeholder="Program title" errorEn={titleError} />
          <TextField label="ARABIC MOTIF (OPTIONAL)" value={arabic} onChange={setArabic} placeholder="ﷺ" dir="rtl" />
          <TextArea label="DESCRIPTION" value={descEn} onChange={setDescEn} rows={3} placeholder="What this program covers…" />
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 28 }}>
      <SectionedForm
        sections={sections}
        error={error}
        footer={<EditorFooter busy={busy} saveLabel={program ? "Save changes" : "Create program"} onCancel={onCancel} onSave={() => void save()} />}
      />
    </div>
  );
}
```

- [ ] **Step 2: Shared EditorFooter**

Create `apps/admin/components/content/EditorFooter.tsx`:

```tsx
"use client";

import type { CSSProperties } from "react";
import { brand, font } from "@/lib/ui";

export function EditorFooter({
  busy,
  saveLabel,
  onCancel,
  onSave,
  disabled,
}: {
  busy: boolean;
  saveLabel: string;
  onCancel: () => void;
  onSave: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <button type="button" onClick={onCancel} style={cancel}>Cancel</button>
      <button type="button" disabled={busy || disabled} onClick={onSave} style={{ ...save, opacity: busy || disabled ? 0.6 : 1 }}>
        {busy ? "Saving…" : saveLabel}
      </button>
    </>
  );
}

const cancel: CSSProperties = { border: "1.5px solid var(--line)", background: "transparent", borderRadius: 11, padding: "12px 22px", fontSize: 13.5, fontWeight: 700, color: "var(--muted)", cursor: "pointer", fontFamily: font.ui };
const save: CSSProperties = { background: brand.green, color: "#fff", border: "none", borderRadius: 11, padding: "12px 28px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: font.ui };
```

- [ ] **Step 3: SeriesForm**

`apps/admin/components/content/SeriesForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { admin } from "@althaqalayn/api";
import { LANGUAGES, SERIES_KINDS, type Language, type SeriesKind } from "@althaqalayn/types";
import { GradientPicker, ParentPicker, SelectField, TextArea, BilingualField, TextField } from "@/components/fields";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { YEARS } from "@/lib/ui";
import { EditorFooter } from "./EditorFooter";
import type { SeriesNode } from "@/lib/useContentTree";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";
const KIND_LABELS: Record<SeriesKind, string> = { recency: "Recency (latest)", occasion: "Occasion", topic: "Topic", book: "Book / text" };

export function SeriesForm({
  series,
  programId,
  programs,
  onCancel,
  onSaved,
  onCreateProgram,
}: {
  series: SeriesNode | null;
  programId?: string;
  programs: { value: string; label: string }[];
  onCancel: () => void;
  onSaved: () => void;
  onCreateProgram: (name: string) => Promise<string>;
}) {
  const [titleEn, setTitleEn] = useState(series ? pick(series.title) : "");
  const [titleHa, setTitleHa] = useState(series?.title.ha ?? "");
  const [parent, setParent] = useState(series?.programId ?? programId ?? "");
  const [kind, setKind] = useState<SeriesKind>(series?.kind ?? "recency");
  const [year, setYear] = useState(series?.year ?? YEARS[0]);
  const [occasion, setOccasion] = useState(series?.occasion ?? "");
  const [language, setLanguage] = useState<Language>(series?.language ?? "ha");
  const [gradient, setGradient] = useState<[string, string]>(series ? [series.cover.gradient[0], series.cover.gradient[1]] : ["#0B4634", "#17795E"]);
  const [arabic, setArabic] = useState(series?.cover.arabic ?? "");
  const [descEn, setDescEn] = useState(series?.description?.en ?? "");
  const [featured, setFeatured] = useState(series?.featured ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const save = async () => {
    if (!titleEn.trim()) { setTitleError("English title is required."); return; }
    setBusy(true); setError(null);
    try {
      await admin.upsertSeries(
        getClient(),
        {
          ...(parent ? { programId: parent } : {}),
          title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
          kind,
          ...(year ? { year } : {}),
          ...(kind === "occasion" && occasion.trim() ? { occasion: occasion.trim() } : {}),
          language,
          cover: { gradient, ...(arabic.trim() ? { arabic: arabic.trim() } : {}) },
          ...(descEn.trim() ? { description: { en: descEn.trim() } } : {}),
          featured,
        },
        series?.id,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const sections: FormSection[] = [
    {
      key: "details",
      title: "Details",
      render: () => (
        <>
          <BilingualField label="TITLE" en={titleEn} ha={titleHa} onEn={(v) => { setTitleEn(v); setTitleError(null); }} onHa={setTitleHa} placeholder="Series title" errorEn={titleError} />
          <ParentPicker label="PROGRAM" value={parent} onChange={setParent} options={programs} onCreate={onCreateProgram} allowNone />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <SelectField label="KIND" value={kind} onChange={(v) => setKind(v as SeriesKind)} options={SERIES_KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] }))} />
            </div>
            <div style={{ flex: 1 }}>
              <SelectField label="YEAR" value={year} onChange={setYear} options={(year && !YEARS.includes(year) ? [year, ...YEARS] : YEARS).map((y) => ({ value: y, label: y }))} />
            </div>
          </div>
          {kind === "occasion" ? <TextField label="OCCASION LABEL" value={occasion} onChange={setOccasion} placeholder="Maulud, Ashura…" /> : null}
          <SelectField label="LANGUAGE" value={language} onChange={(v) => setLanguage(v as Language)} options={LANGUAGES.map((l) => ({ value: l, label: l === "ha" ? "Hausa" : "English" }))} />
          <TextArea label="DESCRIPTION" value={descEn} onChange={setDescEn} rows={3} />
        </>
      ),
    },
    {
      key: "cover",
      title: "Cover",
      render: () => (
        <>
          <GradientPicker label="COVER" value={gradient} onChange={setGradient} arabic={arabic} onArabic={setArabic} />
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Feature on the Home “Featured series” rail
          </label>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 28 }}>
      <SectionedForm
        sections={sections}
        error={error}
        footer={<EditorFooter busy={busy} saveLabel={series ? "Save changes" : "Create series"} onCancel={onCancel} onSave={() => void save()} />}
      />
    </div>
  );
}
```

> Note: the Episodes section of a Series is added in Task 12 (it needs the episode list + reorder). This task ships Series with Details + Cover only.

- [ ] **Step 4: Wire editors into ContentWorkspace**

In `ContentWorkspace.tsx`, replace the detail block (the `<NodeDetail .../>` line and its comment) with a renderer that branches on `mode`. Add imports and a helper. Full replacement of the `detail` div contents:

```tsx
import { ProgramForm } from "./ProgramForm";
import { SeriesForm } from "./SeriesForm";
import { admin } from "@althaqalayn/api";
```

Add inside `ContentWorkspace`, before `return`:

```tsx
  const programOptions = tree.programs.map((p) => ({ value: p.id, label: p.title.en }));

  const createProgram = async (name: string): Promise<string> => {
    const p = await admin.upsertProgram(getClient(), { title: { en: name } });
    await reload();
    return p.id;
  };

  const afterSave = async () => { await reload(); setMode("read"); setDraftNew(null); };

  const findProgram = (id: string) => tree.programs.find((p) => p.id === id) ?? null;
  const findSeriesNode = (id: string) => {
    for (const p of tree.programs) { const s = p.seriesNodes.find((x) => x.id === id); if (s) return s; }
    return tree.orphanSeries.find((x) => x.id === id) ?? null;
  };
```

Replace the detail content with:

```tsx
      <div className="noscroll" style={detail}>
        {mode === "new" && draftNew?.kind === "program" ? (
          <ProgramForm program={null} onCancel={() => setMode("read")} onSaved={afterSave} />
        ) : mode === "new" && draftNew?.kind === "series" ? (
          <SeriesForm series={null} programId={draftNew.programId} programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
        ) : mode === "edit" && selected?.kind === "program" ? (
          <ProgramForm program={findProgram(selected.id)} onCancel={() => setMode("read")} onSaved={afterSave} />
        ) : mode === "edit" && selected?.kind === "series" ? (
          <SeriesForm series={findSeriesNode(selected.id)} programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
        ) : (
          <NodeDetail tree={tree} selected={selected} onEdit={() => setMode("edit")} />
        )}
      </div>
```

> Episode/standalone editing branches are added in Task 13; until then the Edit button on a lecture falls through to `NodeDetail` (no-op). Acceptable intermediate state.

- [ ] **Step 5: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/components/content
git commit -m "feat(admin): Program + Series inline editors via SectionedForm"
```

---

## Task 12: Series Episodes section — list, reorder, inline add

**Files:**
- Modify: `apps/admin/components/content/SeriesForm.tsx` (add Episodes section, edit mode only)

**Interfaces:**
- Consumes: `admin.setEpisodeNumbers`, `admin.deleteLecture` from `@althaqalayn/api`; `ActionMenu` from `@/components/ActionMenu`; `statusPill`, `mediaBadge`, `brand` from `@/lib/ui`.
- Produces: no new export. When `series` is non-null, `SeriesForm` shows an Episodes section listing `series.episodes` with up/down reorder, per-row `ActionMenu` (Edit → `onEditEpisode(id)`, Delete), and `+ Add episode` / `+ Add multiple` buttons that call `onAddEpisode(seriesId)` / `onAddMultiple(seriesId)`.
- New props on `SeriesForm`: `onEditEpisode?: (id: string) => void`, `onAddEpisode?: (seriesId: string) => void`, `onAddMultiple?: (seriesId: string) => void`, `onEpisodesChanged?: () => void`.

- [ ] **Step 1: Add reorder + list state**

Add to `SeriesForm` imports:

```tsx
import { admin, ... } from "@althaqalayn/api"; // already imported; ensure admin present
import { ActionMenu } from "@/components/ActionMenu";
import { brand, mediaBadge, statusPill, YEARS } from "@/lib/ui"; // extend existing ui import
import { getClient } from "@/lib/supabase"; // already imported
```

Add the new optional props to the component signature and a local ordered-episode state:

```tsx
  onEditEpisode,
  onAddEpisode,
  onAddMultiple,
  onEpisodesChanged,
}: {
  // …existing props…
  onEditEpisode?: (id: string) => void;
  onAddEpisode?: (seriesId: string) => void;
  onAddMultiple?: (seriesId: string) => void;
  onEpisodesChanged?: () => void;
}) {
```

Inside the component:

```tsx
  const [eps, setEps] = useState(series?.episodes ?? []);
  const move = async (index: number, dir: -1 | 1) => {
    const next = [...eps];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setEps(next);
    await admin.setEpisodeNumbers(getClient(), next.map((e) => e.id));
    onEpisodesChanged?.();
  };
  const removeEp = async (id: string, title: string) => {
    if (!confirm(`Delete episode “${title}”?`)) return;
    await admin.deleteLecture(getClient(), id);
    setEps((cur) => cur.filter((e) => e.id !== id));
    onEpisodesChanged?.();
  };
```

- [ ] **Step 2: Add the Episodes section (edit mode only)**

After the `cover` section object in `sections`, conditionally append:

```tsx
    ...(series
      ? [{
          key: "episodes",
          title: `Episodes (${eps.length})`,
          render: () => (
            <div>
              {eps.length === 0 ? <div style={{ fontSize: 13, color: "var(--muted)", padding: "8px 0" }}>No episodes yet.</div> : null}
              {eps.map((e, i) => {
                const badge = mediaBadge(e.type);
                const pill = statusPill(e.status);
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <button type="button" onClick={() => void move(i, -1)} disabled={i === 0} style={reorderBtn}>▲</button>
                      <button type="button" onClick={() => void move(i, 1)} disabled={i === eps.length - 1} style={reorderBtn}>▼</button>
                    </div>
                    <span style={{ width: 22, fontWeight: 800, fontSize: 12, color: brand.greenMid }}>{e.episode ?? i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title.en}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, borderRadius: 5, padding: "2px 6px", background: badge.bg, color: badge.fg }}>{e.type.toUpperCase()}</span>
                        <span style={{ fontSize: 9.5, fontWeight: 800, borderRadius: 20, padding: "2px 8px", background: pill.bg, color: pill.fg }}>{pill.label}</span>
                      </div>
                    </div>
                    <ActionMenu items={[
                      { label: "Edit", onSelect: () => onEditEpisode?.(e.id) },
                      { label: "Delete", onSelect: () => void removeEp(e.id, e.title.en), danger: true },
                    ]} />
                  </div>
                );
              })}
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button type="button" onClick={() => onAddEpisode?.(series.id)} style={addBtn}>+ Add episode</button>
                <button type="button" onClick={() => onAddMultiple?.(series.id)} style={addBtnGhost}>+ Add multiple</button>
              </div>
            </div>
          ),
        }]
      : []),
```

Add these styles near the bottom of the file (module scope):

```tsx
const reorderBtn: CSSProperties = { background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 9, lineHeight: 1, padding: 0 };
const addBtn: CSSProperties = { background: brand.green, color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
const addBtnGhost: CSSProperties = { background: "transparent", color: brand.greenMid, border: "1.5px solid var(--line)", borderRadius: 10, padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
```

Add `import type { CSSProperties } from "react";` at the top if not present.

- [ ] **Step 3: Pass the new callbacks from ContentWorkspace**

In `ContentWorkspace.tsx`, update the two `SeriesForm` usages (new + edit) to pass:

```tsx
          onEditEpisode={(id) => { setSelected({ kind: "episode", id }); setMode("edit"); }}
          onAddEpisode={(seriesId) => { setDraftNew({ kind: "episode", seriesId }); setMode("new"); setSelected(null); }}
          onAddMultiple={(seriesId) => { setDraftNew({ kind: "episodesBatch", seriesId }); setMode("new"); setSelected(null); }}
          onEpisodesChanged={() => void reload()}
```

Extend the `NewKind` union in `ContentTree.tsx` to include the batch kind:

```ts
export type NewKind =
  | { kind: "program" }
  | { kind: "series"; programId?: string }
  | { kind: "episode"; seriesId: string }
  | { kind: "episodesBatch"; seriesId: string }
  | { kind: "standalone" };
```

> The `episode` / `episodesBatch` editor branches are wired in Task 13/14; passing the callbacks now is harmless (they set state the branches will consume).

- [ ] **Step 4: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/components/content
git commit -m "feat(admin): Series episodes section — list, reorder, add hooks"
```

---

## Task 13: Episode / Standalone lecture editor

**Files:**
- Create: `apps/admin/components/content/LectureForm.tsx`
- Modify: `apps/admin/components/content/ContentWorkspace.tsx` (episode/standalone branches)

**Interfaces:**
- Consumes: field kit; `MediaZone`; `SectionedForm`; `admin`; `getClient`; `MEDIA_TYPES`, `LANGUAGES` from `@althaqalayn/types`; node types.
- Produces: `LectureForm({ lecture, scope, seriesId, programId, programs, onCancel, onSaved, onCreateProgram })`
  - `lecture: Lecture | null`; `scope: "series" | "single"`; `seriesId?: string` (for new episode); `programId?: string`
  - `programs: { value: string; label: string }[]`

- [ ] **Step 1: Implement LectureForm**

`apps/admin/components/content/LectureForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { admin } from "@althaqalayn/api";
import { LANGUAGES, MEDIA_TYPES, type Language, type MediaType, type Lecture, type PublishStatus } from "@althaqalayn/types";
import { BilingualField, DateField, NumberStepper, ParentPicker, PublishControl, SelectField, TextArea } from "@/components/fields";
import { MediaZone } from "@/components/MediaZone";
import { MediaPreview } from "@/components/MediaPreview";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { YEARS } from "@/lib/ui";
import { EditorFooter } from "./EditorFooter";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";
const TYPE_LABELS: Record<MediaType, string> = { audio: "Audio", video: "Video", text: "Text" };

export function LectureForm({
  lecture,
  scope,
  seriesId,
  programId,
  programs,
  onCancel,
  onSaved,
  onCreateProgram,
}: {
  lecture: Lecture | null;
  scope: "series" | "single";
  seriesId?: string;
  programId?: string;
  programs: { value: string; label: string }[];
  onCancel: () => void;
  onSaved: () => void;
  onCreateProgram: (name: string) => Promise<string>;
}) {
  const [titleEn, setTitleEn] = useState(lecture ? pick(lecture.title) : "");
  const [titleHa, setTitleHa] = useState(lecture?.title.ha ?? "");
  const [type, setType] = useState<MediaType>(lecture?.type ?? "audio");
  const [language, setLanguage] = useState<Language>(lecture?.language ?? "ha");
  const [year, setYear] = useState(lecture?.year ?? YEARS[0]);
  const [program, setProgram] = useState(lecture?.programId ?? programId ?? "");
  const [episode, setEpisode] = useState<number | null>(lecture?.episode ?? null);
  const [mediaUrl, setMediaUrl] = useState(lecture?.mediaUrl ?? "");
  const [durationMin, setDurationMin] = useState<number | null>(lecture?.duration ? Math.round(lecture.duration / 60) : null);
  const [bodyEn, setBodyEn] = useState(lecture?.body?.en ?? "");
  const [descEn, setDescEn] = useState(lecture?.description?.en ?? "");
  const [date, setDate] = useState(lecture?.date ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<PublishStatus>(lecture?.status ?? "published");
  const [scheduledFor, setScheduledFor] = useState(lecture?.scheduledFor ? lecture.scheduledFor.slice(0, 16) : "");
  const [mediaBusy, setMediaBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const save = async () => {
    if (!titleEn.trim()) { setTitleError("English title is required."); return; }
    setBusy(true); setError(null);
    try {
      await admin.upsertLecture(
        getClient(),
        {
          scope,
          title: { en: titleEn.trim(), ...(titleHa.trim() ? { ha: titleHa.trim() } : {}) },
          type,
          language,
          date,
          status,
          ...(year ? { year } : {}),
          ...(status === "scheduled" && scheduledFor ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
          ...(descEn.trim() ? { description: { en: descEn.trim() } } : {}),
          ...(type === "text" && bodyEn.trim() ? { body: { en: bodyEn.trim() } } : {}),
          ...(type !== "text" && mediaUrl ? { mediaUrl } : {}),
          ...(durationMin ? { duration: durationMin * 60 } : {}),
          ...(scope === "series"
            ? { ...(seriesId ?? lecture?.seriesId ? { seriesId: seriesId ?? lecture?.seriesId } : {}), ...(program ? { programId: program } : {}), ...(episode != null ? { episode } : {}) }
            : { ...(program ? { programId: program } : {}) }),
        },
        lecture?.id,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const sections: FormSection[] = [
    {
      key: "details",
      title: "Details",
      render: () => (
        <>
          <BilingualField label="TITLE" en={titleEn} ha={titleHa} onEn={(v) => { setTitleEn(v); setTitleError(null); }} onHa={setTitleHa} placeholder="Lecture title" errorEn={titleError} />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><SelectField label="MEDIA TYPE" value={type} onChange={(v) => setType(v as MediaType)} options={MEDIA_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))} /></div>
            <div style={{ flex: 1 }}><SelectField label="LANGUAGE" value={language} onChange={(v) => setLanguage(v as Language)} options={LANGUAGES.map((l) => ({ value: l, label: l === "ha" ? "Hausa" : "English" }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><SelectField label="YEAR" value={year} onChange={setYear} options={(year && !YEARS.includes(year) ? [year, ...YEARS] : YEARS).map((y) => ({ value: y, label: y }))} /></div>
            {scope === "series" ? <div style={{ width: 150 }}><NumberStepper label="EPISODE #" value={episode} onChange={setEpisode} /></div> : null}
          </div>
          {scope === "single" ? <ParentPicker label="PROGRAM (OPTIONAL)" value={program} onChange={setProgram} options={programs} onCreate={onCreateProgram} allowNone /> : null}
          <DateField label="DATE" value={date} onChange={setDate} />
        </>
      ),
    },
    {
      key: "media",
      title: type === "text" ? "Reader body" : "Media",
      render: () =>
        type === "text" ? (
          <>
            <TextArea label="BODY (ENGLISH)" value={bodyEn} onChange={setBodyEn} rows={6} placeholder="The full text shown in the reader…" />
            <div style={{ marginTop: 10 }}><MediaPreview type="text" body={bodyEn} /></div>
          </>
        ) : (
          <>
            <MediaZone type={type} value={mediaUrl} onChange={setMediaUrl} onBusyChange={setMediaBusy} onDurationDetected={(s) => setDurationMin(Math.round(s / 60))} />
            <div style={{ width: 160 }}><NumberStepper label="LENGTH (MIN)" value={durationMin} onChange={setDurationMin} min={0} /></div>
          </>
        ),
    },
    {
      key: "publish",
      title: "Description & publish",
      render: () => (
        <>
          <TextArea label="DESCRIPTION" value={descEn} onChange={setDescEn} rows={3} placeholder="Short summary shown on the lecture page…" />
          <PublishControl status={status} scheduledFor={scheduledFor} onChange={(n) => { setStatus(n.status); setScheduledFor(n.scheduledFor); }} />
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 28 }}>
      <SectionedForm
        sections={sections}
        error={error}
        footer={<EditorFooter busy={busy} disabled={mediaBusy} saveLabel={lecture ? "Save changes" : status === "published" ? "Publish" : status === "scheduled" ? "Schedule" : "Save draft"} onCancel={onCancel} onSave={() => void save()} />}
      />
    </div>
  );
}
```

- [ ] **Step 2: Wire episode/standalone branches in ContentWorkspace**

Add import: `import { LectureForm } from "./LectureForm";`

Add finder helpers alongside the others:

```tsx
  const findLecture = (kind: "episode" | "standalone", id: string) => {
    if (kind === "standalone") return tree.standalone.find((l) => l.id === id) ?? null;
    for (const p of tree.programs) for (const s of p.seriesNodes) { const e = s.episodes.find((x) => x.id === id); if (e) return e; }
    for (const s of tree.orphanSeries) { const e = s.episodes.find((x) => x.id === id); if (e) return e; }
    return null;
  };
```

Add branches to the detail renderer (before the final `NodeDetail` fallback):

```tsx
        ) : mode === "new" && draftNew?.kind === "episode" ? (
          <LectureForm lecture={null} scope="series" seriesId={draftNew.seriesId} programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
        ) : mode === "new" && draftNew?.kind === "standalone" ? (
          <LectureForm lecture={null} scope="single" programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
        ) : mode === "edit" && selected?.kind === "episode" ? (
          <LectureForm lecture={findLecture("episode", selected.id)} scope="series" programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
        ) : mode === "edit" && selected?.kind === "standalone" ? (
          <LectureForm lecture={findLecture("standalone", selected.id)} scope="single" programs={programOptions} onCancel={() => setMode("read")} onSaved={afterSave} onCreateProgram={createProgram} />
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components/content
git commit -m "feat(admin): Episode + Standalone lecture editor with MediaZone + PublishControl"
```

---

## Task 14: Batch episode creation

**Files:**
- Create: `apps/admin/components/content/BatchEpisodesForm.tsx`
- Modify: `apps/admin/components/content/ContentWorkspace.tsx` (`episodesBatch` branch)

**Interfaces:**
- Consumes: field kit; `MediaZone`; `admin.upsertLecture`; `getClient`; node types; `MEDIA_TYPES`, `LANGUAGES`.
- Produces: `BatchEpisodesForm({ series, onCancel, onSaved })` where `series: SeriesNode`. Creates N episodes sharing the series' language/year/program; each row: title EN/HA, #, media.

- [ ] **Step 1: Implement**

`apps/admin/components/content/BatchEpisodesForm.tsx`:

```tsx
"use client";

import { useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import type { MediaType } from "@althaqalayn/types";
import { SelectField } from "@/components/fields";
import { fieldInput } from "@/components/fields";
import { MediaZone } from "@/components/MediaZone";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { brand } from "@/lib/ui";
import { EditorFooter } from "./EditorFooter";
import type { SeriesNode } from "@/lib/useContentTree";

interface Row { key: number; titleEn: string; titleHa: string; episode: number; mediaUrl: string; }

export function BatchEpisodesForm({
  series,
  onCancel,
  onSaved,
}: {
  series: SeriesNode;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const startNum = (series.episodes.reduce((m, e) => Math.max(m, e.episode ?? 0), 0)) + 1;
  const [type, setType] = useState<MediaType>("audio");
  const [rows, setRows] = useState<Row[]>([{ key: 0, titleEn: "", titleHa: "", episode: startNum, mediaUrl: "" }]);
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patch = (key: number, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const add = () => setRows((rs) => [...rs, { key: (rs.at(-1)?.key ?? 0) + 1, titleEn: "", titleHa: "", episode: (rs.at(-1)?.episode ?? startNum) + 1, mediaUrl: "" }]);
  const remove = (key: number) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));

  const save = async () => {
    const valid = rows.filter((r) => r.titleEn.trim());
    if (!valid.length) { setError("Add at least one episode with a title."); return; }
    setBusy(true); setError(null);
    try {
      await Promise.all(valid.map((r) =>
        admin.upsertLecture(getClient(), {
          scope: "series",
          title: { en: r.titleEn.trim(), ...(r.titleHa.trim() ? { ha: r.titleHa.trim() } : {}) },
          type,
          language: series.language,
          date: new Date().toISOString().slice(0, 10),
          status: "published",
          ...(series.year ? { year: series.year } : {}),
          seriesId: series.id,
          ...(series.programId ? { programId: series.programId } : {}),
          episode: r.episode,
          ...(type !== "text" && r.mediaUrl ? { mediaUrl: r.mediaUrl } : {}),
        }),
      ));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const sections: FormSection[] = [
    {
      key: "shared",
      title: `Add episodes to ${series.title.en}`,
      render: () => (
        <>
          <SelectField label="MEDIA TYPE (ALL)" value={type} onChange={(v) => setType(v as MediaType)} options={[{ value: "audio", label: "Audio" }, { value: "video", label: "Video" }, { value: "text", label: "Text" }]} />
          <div style={{ marginTop: 16 }}>
            {rows.map((r) => (
              <div key={r.key} style={rowCard}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Episode {r.episode}</span>
                  {rows.length > 1 ? <button type="button" onClick={() => remove(r.key)} style={{ background: "transparent", border: "none", color: "#a23e3e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Remove</button> : null}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={r.titleEn} onChange={(e) => patch(r.key, { titleEn: e.target.value })} placeholder="Title (English)" style={{ ...fieldInput, flex: 1 }} />
                  <input value={String(r.episode)} onChange={(e) => patch(r.key, { episode: Number(e.target.value) || r.episode })} inputMode="numeric" style={{ ...fieldInput, width: 64 }} />
                </div>
                <input value={r.titleHa} onChange={(e) => patch(r.key, { titleHa: e.target.value })} placeholder="Title (Hausa)" style={{ ...fieldInput, marginTop: 8 }} />
                {type !== "text" ? (
                  <div style={{ marginTop: 8 }}>
                    <MediaZone type={type} value={r.mediaUrl} onChange={(url) => patch(r.key, { mediaUrl: url })} onBusyChange={setMediaBusy} compact />
                  </div>
                ) : null}
              </div>
            ))}
            <button type="button" onClick={add} style={addRow}>+ Add another episode</button>
          </div>
        </>
      ),
    },
  ];

  return (
    <div style={{ padding: 28 }}>
      <SectionedForm sections={sections} error={error} footer={<EditorFooter busy={busy} disabled={mediaBusy} saveLabel={`Publish ${rows.filter((r) => r.titleEn.trim()).length || ""} episode(s)`.replace("  ", " ")} onCancel={onCancel} onSave={() => void save()} />} />
    </div>
  );
}

const rowCard: CSSProperties = { border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 12, background: "var(--bg)" };
const addRow: CSSProperties = { width: "100%", padding: 12, border: "1.5px dashed var(--line)", borderRadius: 10, background: "transparent", color: brand.greenMid, fontSize: 13, fontWeight: 700, cursor: "pointer" };
```

- [ ] **Step 2: Wire the branch**

Add import `import { BatchEpisodesForm } from "./BatchEpisodesForm";` and a branch (after the `episode` new branch):

```tsx
        ) : mode === "new" && draftNew?.kind === "episodesBatch" ? (
          <BatchEpisodesForm series={findSeriesNode(draftNew.seriesId)!} onCancel={() => setMode("read")} onSaved={afterSave} />
```

> `findSeriesNode` returns `SeriesNode | null`; the `!` is safe because the batch action originates from an existing series node. Guard: if null, fall through — add `&& findSeriesNode(draftNew.seriesId)` to the condition to be safe:
> `mode === "new" && draftNew?.kind === "episodesBatch" && findSeriesNode(draftNew.seriesId)`

- [ ] **Step 3: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components/content
git commit -m "feat(admin): batch episode creation form"
```

---

## Task 15: Navigation swap — Content replaces Lectures + Series

**Files:**
- Modify: `apps/admin/lib/views.ts`
- Modify: `apps/admin/components/Console.tsx`

**Interfaces:**
- Consumes: `ContentWorkspace` from `@/components/content/ContentWorkspace`.
- Produces: `View` union gains `"content"`, loses `"lectures"` and `"series"`.

- [ ] **Step 1: Update views.ts**

Replace lines 1–29 of `apps/admin/lib/views.ts`:

```ts
export type View =
  | "dashboard"
  | "content"
  | "categories"
  | "media"
  | "featured"
  | "gallery"
  | "transcripts"
  | "settings";

export interface NavItem {
  key: View;
  label: string;
  icon: string;
  group: "MANAGE" | "SYSTEM";
}

export const NAV: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard", group: "MANAGE" },
  { key: "content", label: "Content", icon: "lectures", group: "MANAGE" },
  { key: "categories", label: "Categories", icon: "categories", group: "MANAGE" },
  { key: "media", label: "Media library", icon: "media", group: "MANAGE" },
  { key: "featured", label: "Featured & Home", icon: "featured", group: "MANAGE" },
  { key: "gallery", label: "Gallery & events", icon: "gallery", group: "MANAGE" },
  { key: "transcripts", label: "Transcripts", icon: "transcripts", group: "MANAGE" },
  { key: "settings", label: "Settings", icon: "settings", group: "SYSTEM" },
];
```

Update `VIEW_TITLES` (lines 32–42): remove `lectures` and `series`, add `content: "Content"`:

```ts
export const VIEW_TITLES: Record<View, string> = {
  dashboard: "Dashboard",
  content: "Content",
  categories: "Categories",
  media: "Media library",
  featured: "Featured & Home",
  gallery: "Gallery & events",
  transcripts: "Transcripts",
  settings: "Settings",
};
```

- [ ] **Step 2: Update Console.tsx**

Rewrite `apps/admin/components/Console.tsx` to drop the `Lectures`/`SeriesManager`/`LectureEditor` wiring and route `content`:

```tsx
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { Categories } from "@/components/views/Categories";
import { ContentWorkspace } from "@/components/content/ContentWorkspace";
import { Dashboard } from "@/components/views/Dashboard";
import { Featured } from "@/components/views/Featured";
import { Gallery } from "@/components/views/Gallery";
import { MediaLibrary } from "@/components/views/MediaLibrary";
import { Settings } from "@/components/views/Settings";
import { Transcripts } from "@/components/views/Transcripts";
import type { View } from "@/lib/views";

export function Console() {
  const [view, setView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");

  const onPrimary = () => {
    if (view === "dashboard" || view === "content") setView("content");
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar view={view} onNavigate={setView} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "var(--bg)" }}>
        <Topbar view={view} query={query} onQuery={setQuery} onPrimary={onPrimary} />
        <div className="noscroll" style={{ flex: 1, overflowY: "auto", padding: 26 }}>
          {view === "dashboard" ? (
            <Dashboard onNavigate={setView} />
          ) : view === "content" ? (
            <ContentWorkspace />
          ) : view === "categories" ? (
            <Categories query={query} />
          ) : view === "featured" ? (
            <Featured />
          ) : view === "gallery" ? (
            <Gallery query={query} />
          ) : view === "transcripts" ? (
            <Transcripts query={query} />
          ) : view === "media" ? (
            <MediaLibrary query={query} />
          ) : (
            <Settings />
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Fix Dashboard's navigate targets**

`Dashboard` may call `onNavigate("lectures")` or `("series")`. Update those to `"content"`.

Run: `grep -rn '"lectures"\|"series"' apps/admin/components/views/Dashboard.tsx`
For each hit, change the navigate argument to `"content"`. (Leave any `icon: "lectures"`/`"series"` icon-name strings — those are `Icon` names, not views.)

- [ ] **Step 4: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success. TypeScript will flag any remaining reference to the removed `"lectures"`/`"series"` view values — fix each by pointing at `"content"`.

- [ ] **Step 5: Verify (manual)**

`pnpm --filter admin dev` → sign in → sidebar shows **Content**. Click it: tree + detail render. Create a program, a series under it, an episode; reorder episodes; batch-add; edit a standalone. Confirm the app (mobile/public) still reads the data.

- [ ] **Step 6: Commit**

```bash
git add apps/admin/lib/views.ts apps/admin/components/Console.tsx apps/admin/components/views/Dashboard.tsx
git commit -m "feat(admin): route Content workspace; retire Lectures + Series views"
```

---

## Task 16: Migrate Categories editor to SectionedForm

**Files:**
- Read first: `apps/admin/components/views/Categories.tsx` and its `CategoryEditor` (find with `grep -rn "CategoryEditor" apps/admin`)
- Modify: the category editor component to render `SectionedForm` inside the existing `Drawer`.

**Interfaces:**
- Consumes: field kit; `SectionedForm`; existing `admin.upsertCategory`/`deleteCategory`.
- Produces: unchanged external props; internals now use the field kit.

- [ ] **Step 1: Read the current editor**

Run: `grep -rln "upsertCategory" apps/admin/components`
Read the file it reports (the CategoryEditor). Note its props (`category`, `onClose`, `onSaved`) and the fields it sets (`label`, `ar`, `meta`, `active`, `archived`).

- [ ] **Step 2: Rebuild its body with the field kit**

Keep the `Drawer` shell (from `form.tsx`) for header/scrim/footer, but replace the raw `<input>`/`<select>` blocks with field-kit components. Example body (adapt names to the actual `CategoryInput` — `label: LocalizedText`, `ar: string`, `meta?: string`, `active: boolean`, `archived: boolean`):

```tsx
      <BilingualField label="LABEL" en={labelEn} ha={labelHa} onEn={setLabelEn} onHa={setLabelHa} placeholder="Category name" errorEn={labelError} />
      <TextField label="ARABIC" value={ar} onChange={setAr} dir="rtl" />
      <TextField label="META (OPTIONAL)" value={meta} onChange={setMeta} placeholder="e.g. 24 lectures" />
```

Keep the `active`/`archived` toggles using the existing `Toggle` from `form.tsx`. Preserve the exact `admin.upsertCategory` payload shape already in the file — only the inputs change, not the save logic.

- [ ] **Step 3: Typecheck + build + verify**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Manual: Categories → New / Edit still saves; wider drawer; fields render.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components
git commit -m "refactor(admin): Categories editor onto field kit"
```

---

## Task 17: Migrate Transcripts editor to SectionedForm

**Files:**
- Modify: the transcript editor (find with `grep -rln "upsertTranscript" apps/admin/components`)

**Interfaces:**
- Consumes: field kit (`ParentPicker` for the linked lecture, `TextArea` for body, `SelectField` for status/language); `SectionedForm`; existing `admin.upsertTranscript`.

- [ ] **Step 1: Read the current editor** and note it sets `lectureId`, `language`, `status` (`TranscriptStatus`), `body`.

- [ ] **Step 2: Rebuild body.** Use `ParentPicker label="LINKED LECTURE"` populated from `admin.listAllLectures(getClient())` (fetch on mount), `SelectField` for language + status (`TRANSCRIPT_STATUSES`), `TextArea` for `body.en`/`body.ha`. Preserve the existing save payload.

- [ ] **Step 3: Typecheck + build + verify.** Transcripts → New/Edit saves; linked-lecture picker lists lectures.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components
git commit -m "refactor(admin): Transcripts editor onto field kit"
```

---

## Task 18: Migrate Gallery album + photos to SectionedForm

**Files:**
- Modify: the album editor (find with `grep -rln "upsertAlbum" apps/admin/components`)

**Interfaces:**
- Consumes: field kit; `MediaZone` used with an image type? — Note: `MediaZone` handles audio/video only. Photos need an **image** uploader. Reuse `uploadMedia` directly with an `<input accept="image/*">` inside the Photos section (do not extend MediaZone).

- [ ] **Step 1: Read the current editor.** Note `AlbumInput` (`title`, `date`, `event?`, `cover?`, `published`) and photo add/delete via `admin.addPhoto`/`admin.deletePhoto`.

- [ ] **Step 2: Rebuild.** Sections: **Details** (`TextField` title, `DateField` date, `TextField` event), **Cover** (image upload via `uploadMedia(file, "gallery")` → set `cover` url), **Photos** (grid of existing photos with delete + a multi-file `<input type="file" accept="image/*" multiple>` that uploads each via `uploadMedia(f, "gallery")` then `admin.addPhoto(client, albumId, { url })`, with a per-photo caption `TextField`). Enforce `MAX_MEDIA_BYTES` before each image upload (import from `@/lib/upload`).

- [ ] **Step 3: Typecheck + build + verify.** Gallery → New album; upload cover + several photos; delete a photo; publish toggle works.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components
git commit -m "refactor(admin): Gallery album + photos onto field kit + image upload"
```

---

## Task 19: Migrate Featured & Home curation to SectionedForm

**Files:**
- Read first: `apps/admin/components/views/Featured.tsx`
- Modify: to use pick-and-reorder lists instead of any free-text.

**Interfaces:**
- Consumes: `admin.listAllLectures`, series list; `admin.upsertLecture`/`upsertSeries` to set `featured: true/false`.

- [ ] **Step 1: Read `Featured.tsx`** and determine how "featured" is currently represented (the `featured` boolean on lectures/series). If it already toggles `featured`, the migration is cosmetic: present two columns — "Featured lectures" and "Featured series" — each a list with a toggle/remove and an "Add" picker (`ParentPicker`-style select of non-featured items). Reorder is visual only unless a `position` exists (it does for series → reuse `admin.setSeriesPositions`; lectures have no home-order column, so **do not** claim lecture reorder — omit it and `log`-comment that lecture featured-order is by date).

- [ ] **Step 2: Implement** the two curation lists using existing field-kit selects + `ActionMenu` for remove. Persist via the `featured` flag on the respective `upsert*` call. No schema change.

- [ ] **Step 3: Typecheck + build + verify.** Toggle a lecture/series featured; confirm it appears/disappears; series reorder persists.

- [ ] **Step 4: Commit**

```bash
git add apps/admin/components
git commit -m "refactor(admin): Featured & Home curation lists (no free-text)"
```

---

## Task 20: Delete dead components

**Files:**
- Delete: `apps/admin/components/views/Lectures.tsx`, `apps/admin/components/views/SeriesManager.tsx`, `apps/admin/components/LectureEditor.tsx`, `apps/admin/components/EpisodesDrawer.tsx`, `apps/admin/components/LectureView.tsx`, `apps/admin/components/MediaUploadField.tsx`

- [ ] **Step 1: Confirm no remaining imports**

Run: `grep -rn "views/Lectures\|SeriesManager\|LectureEditor\|EpisodesDrawer\|LectureView\|MediaUploadField" apps/admin`
Expected: no results (or only the files themselves). If any consumer remains, fix it before deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm apps/admin/components/views/Lectures.tsx apps/admin/components/views/SeriesManager.tsx apps/admin/components/LectureEditor.tsx apps/admin/components/EpisodesDrawer.tsx apps/admin/components/LectureView.tsx apps/admin/components/MediaUploadField.tsx
```

- [ ] **Step 3: Typecheck + build**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success (proves nothing referenced the deleted files).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(admin): remove editors superseded by Content workspace"
```

---

## Task 21: Manual QA pass

**Files:** none (verification only). Fix-forward any defects found, committing per fix.

- [ ] **Step 1: Run the checklist** in `pnpm --filter admin dev`, signed in:

- [ ] Program: create, edit, delete (series unlinked, not deleted per confirm text).
- [ ] Series: create under a program, create standalone (no program), edit, delete.
- [ ] Series inline `+ New program` from `ParentPicker` creates + selects the program.
- [ ] Episode: create under a series (episode # prefilled), edit, delete.
- [ ] Batch add multiple episodes; numbers increment; all publish.
- [ ] Episode reorder (▲▼) persists across reload (`episode` column written).
- [ ] Standalone lecture: create, edit; optional program link works.
- [ ] Media: drag-drop audio + video; oversize (>50 MB) rejected inline; wrong-type rejected; Replace; Remove; auto-duration fills length.
- [ ] Text lecture: body editor + live `MediaPreview`.
- [ ] Publish control: Draft / Publish now / Schedule (datetime appears only for Schedule); saved status matches the public app's visibility.
- [ ] Tree search filters programs/series/episodes/standalone.
- [ ] Categories / Transcripts / Gallery / Featured editors save via the widened drawer.
- [ ] Empty states: no programs, empty series, no standalone.
- [ ] Dark mode: toggle theme; all new surfaces use CSS vars (no hardcoded light colors).
- [ ] Public reads unaffected: open the mobile/web app; new content appears when published.

- [ ] **Step 2: Final build gate**

Run: `pnpm --filter admin typecheck && pnpm --filter admin build`
Expected: success.

- [ ] **Step 3: Commit any fixes** (skip if none):

```bash
git add -A
git commit -m "fix(admin): QA pass follow-ups for Content workspace"
```

---

## Self-review (completed while writing)

- **Spec coverage:** IA/nav (§1)→Task 15; workspace shell (§2)→Tasks 9–10; SectionedForm+field kit (§3 of spec / field decisions)→Tasks 2–7; MediaZone (§4)→Task 6; batch + reorder (§5)→Tasks 12, 14, Task 1 (position writer); other entities→Tasks 16–19; data flow (`useContentTree`)→Task 8; validation/errors→built into each editor (title required, media busy gating, form-level error banner, `confirm` on delete); testing→Task 21 checklist. All spec sections mapped.
- **Placeholder scan:** no TBD/TODO; every code step has concrete code; migration Tasks 16–19 reference exact existing functions and instruct reading the current file first (their bodies vary with code not yet re-read, so they give the exact field-kit calls + preserve existing payloads rather than inventing payloads).
- **Type consistency:** `NewKind` extended once (Task 12) and consumed in Tasks 13–14; `FormSection` shape consistent; `admin.setEpisodeNumbers`/`setSeriesPositions` defined in Task 1 and used in Tasks 12/19; `MediaZone` prop names (`value`, `onChange`, `onBusyChange`, `onDurationDetected`) consistent across Tasks 6/13/14.
- **Known intermediate states flagged:** Edit button inert until Task 11/13 (noted in Tasks 10–11); batch/episode callbacks passed before their branches exist (noted in Task 12). These compile and are called out.
