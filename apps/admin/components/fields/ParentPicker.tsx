"use client";

import { useState, type CSSProperties } from "react";
import { brand } from "@/lib/ui";
import { FieldShell, fieldInput } from "./FieldShell";

export function ParentPicker({
  label,
  value,
  onChange,
  options,
  onCreate,
  error,
  allowNone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  onCreate?: (name: string) => Promise<string>;
  error?: string | null;
  allowNone?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim() || !onCreate) return;
    setBusy(true);
    try {
      const id = await onCreate(name.trim());
      onChange(id);
      setCreating(false);
      setName("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FieldShell label={label} error={error}>
      {creating ? (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New name…"
            style={{ ...fieldInput, flex: 1 }}
            onKeyDown={(e) => e.key === "Enter" && void create()}
          />
          <button type="button" disabled={busy} onClick={() => void create()} style={btnPrimary}>
            {busy ? "…" : "Add"}
          </button>
          <button type="button" onClick={() => setCreating(false)} style={btnGhost}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ ...fieldInput, cursor: "pointer", flex: 1 }}
          >
            {allowNone ? <option value="">— None —</option> : <option value="">— Select —</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {onCreate ? (
            <button type="button" onClick={() => setCreating(true)} style={btnGhost}>+ New</button>
          ) : null}
        </div>
      )}
    </FieldShell>
  );
}

const btnPrimary: CSSProperties = {
  background: brand.green,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "0 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
const btnGhost: CSSProperties = {
  background: "transparent",
  color: brand.greenMid,
  border: "1.5px solid var(--line)",
  borderRadius: 10,
  padding: "0 14px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};
