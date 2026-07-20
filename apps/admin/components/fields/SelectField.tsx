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
