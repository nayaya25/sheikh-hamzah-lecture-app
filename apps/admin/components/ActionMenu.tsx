"use client";

import { useState, type CSSProperties } from "react";
import { Icon } from "@/components/Icon";

export interface ActionItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
}

/** A 3-dots button that opens a small dropdown of actions (Edit / View / Delete…). */
export function ActionMenu({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen((o) => !o)} style={styles.dots} aria-label="Actions">
        <Icon name="dots" size={18} color="var(--muted)" />
      </button>
      {open ? (
        <>
          <div style={styles.scrim} onClick={() => setOpen(false)} />
          <div style={styles.menu}>
            {items.map((it) => (
              <button
                key={it.label}
                onClick={() => {
                  setOpen(false);
                  it.onSelect();
                }}
                style={{ ...styles.item, ...(it.danger ? styles.danger : null) }}
              >
                {it.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  dots: { background: "transparent", border: "none", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" },
  scrim: { position: "fixed", inset: 0, zIndex: 60 },
  menu: {
    position: "absolute",
    top: "100%",
    right: 0,
    zIndex: 61,
    minWidth: 140,
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    boxShadow: "0 10px 30px rgba(0,0,0,.18)",
    padding: 6,
    display: "flex",
    flexDirection: "column",
  },
  item: {
    textAlign: "left",
    background: "transparent",
    border: "none",
    borderRadius: 7,
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--ink)",
    cursor: "pointer",
    fontFamily: "var(--font-instrument)",
  },
  danger: { color: "#a23e3e" },
};
