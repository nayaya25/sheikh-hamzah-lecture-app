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
