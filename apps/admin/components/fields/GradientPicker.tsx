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
