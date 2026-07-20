"use client";

import type { CSSProperties } from "react";
import { brand, font } from "@/lib/ui";

export function EditorFooter({
  busy,
  saveLabel,
  onCancel,
  onSave,
  disabled,
}: {
  busy: boolean;
  saveLabel: string;
  onCancel: () => void;
  onSave: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <button type="button" onClick={onCancel} style={cancel}>Cancel</button>
      <button type="button" disabled={busy || disabled} onClick={onSave} style={{ ...save, opacity: busy || disabled ? 0.6 : 1 }}>
        {busy ? "Saving…" : saveLabel}
      </button>
    </>
  );
}

const cancel: CSSProperties = { border: "1.5px solid var(--line)", background: "transparent", borderRadius: 11, padding: "12px 22px", fontSize: 13.5, fontWeight: 700, color: "var(--muted)", cursor: "pointer", fontFamily: font.ui };
const save: CSSProperties = { background: brand.green, color: "#fff", border: "none", borderRadius: 11, padding: "12px 28px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: font.ui };
