"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { admin, mapSeries, unwrap, type SeriesRow } from "@althaqalayn/api";
import type { Series } from "@althaqalayn/types";
import { Toggle } from "@/components/form";
import { getClient } from "@/lib/supabase";
import { brand, coverGradient, font } from "@/lib/ui";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

export function Featured() {
  const [series, setSeries] = useState<Series[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await getClient().from("series").select("*").order("position");
      setSeries(unwrap<SeriesRow[]>(r).map((row) => mapSeries(row)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (s: Series) => {
    const { id, lectureIds, ...rest } = s;
    void lectureIds;
    await admin.upsertSeries(getClient(), { ...rest, featured: !s.featured }, id);
    void load();
  };

  if (error) return <div style={{ color: "var(--muted)" }}>Couldn’t load: {error}</div>;
  if (!series) return <div style={{ color: "var(--muted)" }}>Loading…</div>;

  return (
    <div>
      <div style={styles.h2}>Featured series</div>
      <div style={styles.sub}>Series toggled on here appear in the app’s Home “Featured series” rail.</div>
      <div style={styles.card}>
        {series.map((s) => (
          <div key={s.id} style={styles.row}>
            <div style={{ ...styles.cover, background: coverGradient(s.cover.gradient[0], s.cover.gradient[1]) }}>
              <span style={styles.motif}>{s.cover.arabic}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={styles.title}>{pick(s.title)}</div>
              <div style={styles.meta}>{s.occasion ?? s.kind.toUpperCase()}{s.year ? ` · ${s.year}` : ""}</div>
            </div>
            <Toggle on={Boolean(s.featured)} onToggle={() => void toggle(s)} />
          </div>
        ))}
        {series.length === 0 ? <div style={styles.empty}>No series yet — create one under Programs & series.</div> : null}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  h2: { fontFamily: font.heading, fontSize: 15, fontWeight: 600 },
  sub: { fontSize: 12.5, color: "var(--muted)", margin: "6px 0 14px" },
  card: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, overflow: "hidden" },
  empty: { padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 },
  row: { display: "flex", alignItems: "center", gap: 14, padding: "12px 18px", borderBottom: "1px solid var(--line)" },
  cover: { width: 46, height: 46, borderRadius: 10, position: "relative", overflow: "hidden", flexShrink: 0 },
  motif: { position: "absolute", right: -2, top: -6, fontFamily: font.arabic, fontSize: 30, color: "rgba(255,255,255,.18)" },
  title: { fontSize: 14, fontWeight: 600 },
  meta: { fontSize: 11.5, color: "var(--muted)", marginTop: 2 },
};
