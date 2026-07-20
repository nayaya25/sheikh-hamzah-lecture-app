"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { admin, unwrap } from "@althaqalayn/api";
import type { Album } from "@althaqalayn/types";
import { AlbumEditor } from "@/components/AlbumEditor";
import { Toggle } from "@/components/form";
import { getClient } from "@/lib/supabase";
import { brand, font } from "@/lib/ui";

interface AlbumRowVM {
  id: string;
  title: string;
  date: string;
  event: string | null;
  published: boolean;
  cover: string | null;
  count: number;
}

export function Gallery({ query }: { query: string }) {
  const [albums, setAlbums] = useState<AlbumRowVM[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Album | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await getClient()
        .from("albums")
        .select("id,title,date,event,published,photos(id,url)")
        .order("created_at", { ascending: false });
      const rows = unwrap<
        { id: string; title: string; date: string; event: string | null; published: boolean; photos: { id: string; url: string }[] }[]
      >(r);
      setAlbums(
        rows.map((a) => ({
          id: a.id,
          title: a.title,
          date: a.date,
          event: a.event,
          published: a.published,
          cover: a.photos[0]?.url ?? null,
          count: a.photos.length,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const shown = (albums ?? []).filter((a) => !q || `${a.title} ${a.event ?? ""}`.toLowerCase().includes(q));

  const toEdit = (a: AlbumRowVM): Album => ({
    id: a.id,
    title: a.title,
    date: a.date,
    ...(a.event ? { event: a.event } : {}),
    photos: [],
    published: a.published,
  });

  const togglePublished = async (a: AlbumRowVM) => {
    await admin.upsertAlbum(getClient(), { title: a.title, date: a.date, ...(a.event ? { event: a.event } : {}), published: !a.published }, a.id);
    void load();
  };
  const remove = async (a: AlbumRowVM) => {
    if (!confirm(`Delete album “${a.title}” and its photos?`)) return;
    await admin.deleteAlbum(getClient(), a.id);
    void load();
  };

  if (error) return <div style={{ color: "var(--muted)" }}>Couldn’t load: {error}</div>;
  if (!albums) return <div style={{ color: "var(--muted)" }}>Loading…</div>;

  return (
    <div>
      <div style={styles.head}>
        <div style={styles.h2}>Albums & events</div>
        <button onClick={() => setEditing("new")} style={styles.newBtn}>+ New album</button>
      </div>

      {shown.length === 0 ? (
        <div style={styles.card}><div style={styles.empty}>No albums{q ? " match" : " yet"}.</div></div>
      ) : (
        <div style={styles.grid}>
          {shown.map((a) => (
            <div key={a.id} style={styles.card}>
              <div style={styles.cover}>
                {a.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.cover} alt="" style={styles.coverImg} />
                ) : (
                  <div style={styles.coverEmpty}>No photos</div>
                )}
                <span style={styles.count}>{a.count} photos</span>
              </div>
              <div style={styles.title}>{a.title}</div>
              <div style={styles.meta}>{a.date}{a.event ? ` · ${a.event}` : ""}</div>
              <div style={styles.actions}>
                <button onClick={() => setEditing(toEdit(a))} style={styles.link}>Manage</button>
                <button onClick={() => void remove(a)} style={styles.linkMuted}>Delete</button>
                <div style={{ flex: 1 }} />
                <Toggle on={a.published} onToggle={() => void togglePublished(a)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null ? (
        <AlbumEditor album={editing === "new" ? null : editing} onClose={() => setEditing(null)} onChanged={load} />
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  h2: { fontFamily: font.heading, fontSize: 15, fontWeight: 600 },
  newBtn: { background: brand.green, color: "#fff", border: "none", borderRadius: 9, padding: "9px 15px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: font.ui },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 },
  card: { background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 12 },
  empty: { padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 },
  cover: { height: 130, borderRadius: 12, overflow: "hidden", position: "relative", background: "var(--input)" },
  coverImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  coverEmpty: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--faint)", fontSize: 12 },
  count: { position: "absolute", left: 8, top: 8, background: "rgba(0,0,0,.45)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "3px 9px" },
  title: { fontFamily: font.heading, fontSize: 14, fontWeight: 600, marginTop: 10 },
  meta: { fontSize: 11.5, color: "var(--muted)", marginTop: 2 },
  actions: { display: "flex", alignItems: "center", gap: 14, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" },
  link: { background: "transparent", border: "none", fontSize: 12, fontWeight: 700, color: brand.greenMid, cursor: "pointer" },
  linkMuted: { background: "transparent", border: "none", fontSize: 12, fontWeight: 700, color: "var(--muted)", cursor: "pointer" },
};
