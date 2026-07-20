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
