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
