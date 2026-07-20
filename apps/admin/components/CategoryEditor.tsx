"use client";

import { useState } from "react";
import { admin } from "@althaqalayn/api";
import type { Category } from "@althaqalayn/types";
import { Drawer, Field, inp } from "@/components/form";
import { getClient } from "@/lib/supabase";

/** Create/edit an Explore category tile (English label + Arabic motif + meta). */
export function CategoryEditor({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(category?.label ?? "");
  const [ar, setAr] = useState(category?.ar ?? "");
  const [meta, setMeta] = useState(category?.meta ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!label.trim() || !ar.trim()) return setError("Label and Arabic motif are required.");
    setBusy(true);
    try {
      await admin.upsertCategory(
        getClient(),
        {
          label: label.trim(),
          ar: ar.trim(),
          ...(meta.trim() ? { meta: meta.trim() } : {}),
          active: category?.active ?? true,
          archived: category?.archived ?? false,
        },
        category?.id,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer
      title={category ? "Edit category" : "New category"}
      sub="An Explore tile on the app home"
      onClose={onClose}
      onSave={save}
      saveLabel={busy ? "Saving…" : "Save category"}
      busy={busy}
      error={error}
    >
      <Field label="LABEL (ENGLISH)">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ramadan Tafsir" style={inp} />
      </Field>
      <Field label="ARABIC MOTIF">
        <input value={ar} onChange={(e) => setAr(e.target.value)} placeholder="تفسير" style={{ ...inp, width: 160 }} />
      </Field>
      <Field label="META (OPTIONAL)">
        <input value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="12 lectures" style={inp} />
      </Field>
    </Drawer>
  );
}
