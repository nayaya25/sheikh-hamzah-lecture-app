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
