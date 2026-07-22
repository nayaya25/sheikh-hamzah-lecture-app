"use client";

import type { CSSProperties, ReactNode } from "react";
import { radii, motion } from "@/lib/tokens";

export const fieldInput: CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  borderRadius: radii.md,
  padding: "12px 14px",
  fontSize: 15,
  background: "var(--field)",
  outline: "none",
  fontFamily: "inherit",
  transition: `border-color ${motion.fast} ${motion.standard}, box-shadow ${motion.fast} ${motion.standard}`,
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
    <div style={{ marginTop: 18 }}>
      <div style={styles.label}>{label}</div>
      {children}
      {error ? <div style={styles.error}>{error}</div> : hint ? <div style={styles.hint}>{hint}</div> : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  label: { fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 8 },
  hint: { fontSize: 12, color: "var(--faint)", marginTop: 6 },
  error: { fontSize: 12, color: "#a23e3e", marginTop: 6, fontWeight: 500 },
};
