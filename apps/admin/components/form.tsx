"use client";

import type { CSSProperties, ReactNode } from "react";
import { brand, font } from "@/lib/ui";
import { radii, motion } from "@/lib/tokens";
import { Icon } from "@/components/Icon";

export const inp: CSSProperties = {
  width: "100%",
  border: "1px solid var(--line)",
  borderRadius: radii.md,
  padding: "12px 14px",
  fontSize: 15,
  background: "var(--field)",
  outline: "none",
  transition: `border-color ${motion.fast} ${motion.standard}, box-shadow ${motion.fast} ${motion.standard}`,
};
export const sel: CSSProperties = { ...inp, cursor: "pointer" };

export function Label({ children }: { children: ReactNode }) {
  return <div style={styles.label}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 18 }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{ ...styles.track, background: on ? brand.green : "var(--line-strong)" }}
      aria-label="Toggle"
      aria-pressed={on}
    >
      <span style={{ ...styles.knob, left: on ? 21 : 3 }} />
    </button>
  );
}

const press = {
  onMouseDown: (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.transform = "scale(0.97)"),
  onMouseUp: (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.transform = "scale(1)"),
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => (e.currentTarget.style.transform = "scale(1)"),
};

/** Right-hand slide-in drawer shell: header + scrollable body + footer actions. */
export function Drawer({
  title,
  sub,
  onClose,
  onSave,
  saveLabel,
  busy,
  error,
  children,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel: string;
  busy?: boolean;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <>
      <div style={styles.scrim} onClick={onClose} />
      <div style={styles.drawer} className="rise">
        <div style={styles.header}>
          <div>
            <div style={styles.h1}>{title}</div>
            {sub ? <div style={styles.sub}>{sub}</div> : null}
          </div>
          <button onClick={onClose} style={styles.close} aria-label="Close">
            <Icon name="close" size={16} color="var(--muted)" strokeWidth={1.9} />
          </button>
        </div>
        <div className="noscroll" style={styles.body}>
          {children}
          {error ? <div style={styles.error}>{error}</div> : null}
        </div>
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancel} {...press}>
            Cancel
          </button>
          <button onClick={onSave} disabled={busy} style={{ ...styles.save, opacity: busy ? 0.7 : 1 }} {...press}>
            <span>{saveLabel}</span>
            <span style={styles.saveIcon}>
              <Icon name="check" size={15} color={brand.green} strokeWidth={2.3} />
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  label: { fontSize: 12.5, fontWeight: 500, color: "var(--muted)", marginBottom: 8 },
  track: {
    position: "relative",
    width: 44,
    height: 26,
    borderRadius: radii.pill,
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    transition: `background ${motion.fast} ${motion.standard}`,
  },
  knob: {
    position: "absolute",
    top: 3,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,.25)",
    transition: `left ${motion.fast} ${motion.out}`,
  },
  scrim: { position: "fixed", inset: 0, zIndex: 50, background: "rgba(20,30,26,.42)", backdropFilter: "blur(2px)" },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 51,
    width: 800,
    maxWidth: "100vw",
    background: "var(--card)",
    boxShadow: "var(--sh-3)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "22px 24px",
    borderBottom: "1px solid var(--line)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h1: { fontFamily: font.heading, fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" },
  sub: { fontSize: 12.5, color: "var(--muted)", marginTop: 3 },
  close: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, overflowY: "auto", padding: 24 },
  error: { color: "#a23e3e", fontSize: 13, marginTop: 14 },
  footer: { padding: "16px 24px", borderTop: "1px solid var(--line)", display: "flex", gap: 12 },
  cancel: {
    flex: 1,
    textAlign: "center",
    border: "1px solid var(--line)",
    background: "var(--field)",
    borderRadius: radii.md,
    padding: 13,
    fontSize: 14,
    fontWeight: 600,
    color: "var(--muted)",
    cursor: "pointer",
    fontFamily: font.ui,
    transition: `transform ${motion.fast} ${motion.out}`,
  },
  save: {
    flex: 1.4,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: brand.green,
    color: "#fff",
    border: "none",
    borderRadius: radii.md,
    padding: "6px 6px 6px 18px",
    height: 48,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: font.ui,
    boxShadow: "0 1px 0 rgba(255,255,255,.12) inset, 0 4px 12px rgba(11,70,52,.24)",
    transition: `transform ${motion.fast} ${motion.out}`,
  },
  saveIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    background: brand.gold,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
};
