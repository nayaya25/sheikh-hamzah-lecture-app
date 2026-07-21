"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { admin } from "@althaqalayn/api";
import type { Category } from "@althaqalayn/types";
import { CategoryEditor } from "@/components/CategoryEditor";
import { Toggle } from "@/components/form";
import { getClient } from "@/lib/supabase";
import { brand, font } from "@/lib/ui";

export function Categories({ query }: { query: string }) {
  const [cats, setCats] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCats(await admin.listAllCategories(getClient()));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const match = (c: Category) => !q || `${c.label} ${c.ar}`.toLowerCase().includes(q);
  const active = (cats ?? []).filter((c) => !c.archived && match(c));
  const archived = (cats ?? []).filter((c) => c.archived && match(c));

  const patch = async (c: Category, changes: Partial<Category>) => {
    const { id, ...rest } = { ...c, ...changes };
    await admin.upsertCategory(getClient(), rest, id);
    void load();
  };
  const remove = async (c: Category) => {
    if (!confirm(`Delete category “${c.label}”?`)) return;
    await admin.deleteCategory(getClient(), c.id);
    void load();
  };
  const onSaved = () => {
    setEditing(null);
    void load();
  };

  /** Swap two active categories' `position`; visible order = position order.
   *  Swaps the pair's real indices in the full `cats` list and persists the
   *  whole list — categories are a flat list (no cross-grouping), so `cats`
   *  is always the true order. */
  const move = async (c: Category, dir: -1 | 1) => {
    if (!cats || busy) return;
    const i = active.findIndex((x) => x.id === c.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= active.length) return;
    const otherId = active[j].id;
    const fullIds = cats.map((x) => x.id);
    const ia = fullIds.indexOf(c.id);
    const ib = fullIds.indexOf(otherId);
    [fullIds[ia], fullIds[ib]] = [fullIds[ib], fullIds[ia]];
    setBusy(true);
    try {
      await admin.setCategoryPositions(getClient(), fullIds);
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div style={{ color: "var(--muted)" }}>Couldn’t load: {error}</div>;
  if (!cats) return <div style={{ color: "var(--muted)" }}>Loading…</div>;

  return (
    <div>
      <div style={styles.head}>
        <div style={styles.h2}>Explore categories</div>
        <button onClick={() => setEditing("new")} style={styles.newBtn}>+ New category</button>
      </div>

      <div style={styles.card}>
        {active.length === 0 ? (
          <div style={styles.empty}>No active categories.</div>
        ) : (
          active.map((c, i) => (
            <div key={c.id} style={styles.row}>
              <div style={styles.reorderCol}>
                <button
                  type="button"
                  onClick={() => void move(c, -1)}
                  disabled={busy || i === 0}
                  style={styles.reorderBtn}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => void move(c, 1)}
                  disabled={busy || i === active.length - 1}
                  style={styles.reorderBtn}
                >
                  ▼
                </button>
              </div>
              <span style={styles.motif}>{c.ar}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.label}>{c.label}</div>
                {c.meta ? <div style={styles.meta}>{c.meta}</div> : null}
              </div>
              <button onClick={() => setEditing(c)} style={styles.link}>Edit</button>
              <button onClick={() => void patch(c, { archived: true })} style={styles.linkMuted}>Archive</button>
              <Toggle on={c.active} onToggle={() => void patch(c, { active: !c.active })} />
            </div>
          ))
        )}
      </div>

      {archived.length > 0 ? (
        <>
          <div style={{ ...styles.head, marginTop: 26 }}>
            <div style={styles.h2}>Archived</div>
          </div>
          <div style={styles.card}>
            {archived.map((c) => (
              <div key={c.id} style={styles.row}>
                <span style={{ ...styles.motif, opacity: 0.5 }}>{c.ar}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...styles.label, color: "var(--muted)" }}>{c.label}</div>
                </div>
                <button onClick={() => void patch(c, { archived: false })} style={styles.link}>Restore</button>
                <button onClick={() => void remove(c)} style={styles.linkMuted}>Delete</button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {editing !== null ? (
        <CategoryEditor category={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={onSaved} />
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  h2: { fontFamily: font.heading, fontSize: 15, fontWeight: 600 },
  newBtn: { background: brand.green, color: "#fff", border: "none", borderRadius: 9, padding: "9px 15px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: font.ui },
  card: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" },
  empty: { padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 },
  row: { display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--line)" },
  reorderCol: { display: "flex", flexDirection: "column", gap: 1 },
  reorderBtn: { background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 10, lineHeight: 1, padding: 2 },
  motif: { fontFamily: font.arabic, fontSize: 22, color: brand.goldDk, width: 34, textAlign: "center" },
  label: { fontSize: 14, fontWeight: 600 },
  meta: { fontSize: 11.5, color: "var(--muted)", marginTop: 2 },
  link: { background: "transparent", border: "none", fontSize: 12, fontWeight: 700, color: brand.greenMid, cursor: "pointer" },
  linkMuted: { background: "transparent", border: "none", fontSize: 12, fontWeight: 700, color: "var(--muted)", cursor: "pointer" },
};
