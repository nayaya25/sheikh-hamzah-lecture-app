"use client";

import type { CSSProperties, ReactNode } from "react";
import { font } from "@/lib/ui";
import { radii } from "@/lib/tokens";

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
    borderRadius: radii.lg,
    padding: "18px 22px 24px",
    marginBottom: 16,
    boxShadow: "var(--sh-1), var(--highlight)",
  },
  cardTitle: {
    fontFamily: font.heading,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    color: "var(--ink)",
    paddingBottom: 14,
    marginBottom: 6,
    borderBottom: "1px solid var(--line)",
  },
  error: {
    color: "#a23e3e",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
    fontWeight: 500,
    background: "rgba(162,62,62,.08)",
    padding: "9px 12px",
    borderRadius: radii.sm,
  },
  footer: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 },
};
