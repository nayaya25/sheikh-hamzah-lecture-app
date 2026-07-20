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
