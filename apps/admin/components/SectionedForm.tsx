"use client";

import type { CSSProperties, ReactNode } from "react";
import { font } from "@/lib/ui";

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
    border: "1px solid var(--line)",
    borderRadius: 16,
    padding: "18px 20px 22px",
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: font.heading,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: ".6px",
    color: "var(--faint)",
    textTransform: "uppercase",
    paddingBottom: 12,
    marginBottom: 4,
    borderBottom: "1px solid var(--line)",
  },
  error: { color: "#a23e3e", fontSize: 12.5, marginTop: 4, marginBottom: 12, fontWeight: 600 },
  footer: { display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 4 },
};
