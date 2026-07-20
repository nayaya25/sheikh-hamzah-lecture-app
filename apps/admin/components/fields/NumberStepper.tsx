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
