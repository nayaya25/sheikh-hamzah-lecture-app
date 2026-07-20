"use client";

import type { CSSProperties, ReactNode } from "react";
import { brand, font } from "@/lib/ui";

export const inp: CSSProperties = {
  width: "100%",
  border: "1.5px solid var(--line)",
  borderRadius: 10,
  padding: "11px 13px",
  fontSize: 13.5,
  background: "var(--input)",
  outline: "none",
};
export const sel: CSSProperties = { ...inp, cursor: "pointer" };

export function Label({ children }: { children: ReactNode }) {
  return <div style={styles.label}>{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 16 }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{ ...styles.track, background: on ? brand.green : "#d5cdb8" }} aria-label="Toggle">
      <span style={{ ...styles.knob, left: on ? 21 : 3 }} />
    </button>
  );
}

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
      <div style={styles.drawer}>
        <div style={styles.header}>
          <div>
            <div style={styles.h1}>{title}</div>
            {sub ? <div style={styles.sub}>{sub}</div> : null}
          </div>
          <button onClick={onClose} style={styles.close} aria-label="Close">✕</button>
        </div>
        <div className="noscroll" style={styles.body}>
          {children}
          {error ? <div style={styles.error}>{error}</div> : null}
        </div>
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancel}>Cancel</button>
          <button onClick={onSave} disabled={busy} style={styles.save}>{saveLabel}</button>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  label: { fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)", marginBottom: 7 },
  track: { position: "relative", width: 44, height: 26, borderRadius: 13, border: "none", cursor: "pointer", flexShrink: 0 },
  knob: { position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .15s" },
  scrim: { position: "fixed", inset: 0, zIndex: 50, background: "rgba(20,30,26,.4)" },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 51,
    width: 472,
    maxWidth: "100vw",
    background: "var(--card)",
    boxShadow: "-14px 0 40px rgba(0,0,0,.16)",
    display: "flex",
    flexDirection: "column",
  },
  header: { padding: "22px 24px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" },
  h1: { fontFamily: font.heading, fontSize: 19, fontWeight: 600 },
  sub: { fontSize: 12, color: "var(--muted)", marginTop: 2 },
  close: { background: "transparent", border: "none", fontSize: 18, color: "var(--muted)", cursor: "pointer" },
  body: { flex: 1, overflowY: "auto", padding: 24 },
  error: { color: "#a23e3e", fontSize: 12.5, marginTop: 14 },
  footer: { padding: "16px 24px", borderTop: "1px solid var(--line)", display: "flex", gap: 12 },
  cancel: { flex: 1, textAlign: "center", border: "1.5px solid var(--line)", background: "transparent", borderRadius: 11, padding: 13, fontSize: 13.5, fontWeight: 700, color: "var(--muted)", cursor: "pointer", fontFamily: font.ui },
  save: { flex: 1.4, textAlign: "center", background: brand.green, color: "#fff", border: "none", borderRadius: 11, padding: 13, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: font.ui },
};
