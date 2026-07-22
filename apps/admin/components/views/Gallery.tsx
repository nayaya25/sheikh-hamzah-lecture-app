"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { admin, unwrap } from "@althaqalayn/api";
import type { Album } from "@althaqalayn/types";
import { AlbumEditor } from "@/components/AlbumEditor";
import { Toggle } from "@/components/form";
import { getClient } from "@/lib/supabase";
import { brand, font, statusPill } from "@/lib/ui";
import { radii } from "@/lib/tokens";
import { useConfirm } from "@/components/ConfirmProvider";

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
  const { confirm } = useConfirm();
  const [albums, setAlbums] = useState<AlbumRowVM[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Album | "new" | null>(null);
  const [hover, setHover] = useState<string | null>(null);

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
    if (!(await confirm({ title: `Delete album “${a.title}”?`, body: "Its photos will be deleted too.", danger: true, confirmLabel: "Delete" }))) return;
    await admin.deleteAlbum(getClient(), a.id);
    void load();
  };

  if (error) return <div style={styles.notice}>Couldn’t load the gallery: {error}</div>;
  if (!albums) return <div style={styles.notice}>Loading…</div>;

  return (
    <div>
      <div style={styles.pageHd}>
        <div>
          <div style={styles.pageT}>Gallery</div>
          <div style={styles.pageS}>Event albums — photos preserved alongside the archive.</div>
        </div>
        <button type="button" onClick={() => setEditing("new")} style={styles.primaryBtn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" style={{ width: 16, height: 16 }}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          New album
        </button>
      </div>

      {shown.length === 0 ? (
        <div style={styles.empty}>No albums{q ? " match" : " yet"}.</div>
      ) : (
        <div style={styles.grid}>
          {shown.map((a) => {
            const hot = hover === a.id;
            const pill = statusPill(a.published ? "published" : "draft");
            return (
              <div
                key={a.id}
                onMouseEnter={() => setHover(a.id)}
                onMouseLeave={() => setHover(null)}
                style={{
                  ...styles.card,
                  transform: hot ? "translateY(-3px)" : "translateY(0)",
                  boxShadow: hot ? "var(--sh-2)" : "var(--sh-1)",
                }}
              >
                <div style={styles.cover}>
                  <button type="button" onClick={() => setEditing(toEdit(a))} style={styles.coverHit} aria-label={`Manage ${a.title}`}>
                    {a.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.cover} alt="" style={styles.coverImg} />
                    ) : (
                      <div style={styles.coverEmpty}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={{ width: 26, height: 26 }}>
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <path d="M3 15l5-4 4 3 4-4 5 4" />
                          <circle cx="9" cy="9" r="1.4" />
                        </svg>
                        <span style={{ marginTop: 6 }}>No photos yet</span>
                      </div>
                    )}
                  </button>
                  <span style={styles.count} className="tnum">{a.count} photo{a.count === 1 ? "" : "s"}</span>
                  <div style={styles.coverActions}>
                    <button
                      type="button"
                      onClick={() => setEditing(toEdit(a))}
                      title="Manage album"
                      aria-label="Manage album"
                      style={styles.coverBtn}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={styles.coverIcon}>
                        <path d="M4 20h4L18 10l-4-4L4 16z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(a)}
                      title="Delete album"
                      aria-label="Delete album"
                      style={styles.coverBtn}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={styles.coverIcon}>
                        <path d="M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div style={styles.body}>
                  <button type="button" onClick={() => setEditing(toEdit(a))} style={styles.titleBtn}>
                    <div style={styles.title}>{a.title}</div>
                    <div style={styles.meta}>{a.date}{a.event ? ` · ${a.event}` : ""}</div>
                  </button>
                  <div style={styles.footer}>
                    <span style={{ ...styles.pill, background: pill.bg, color: pill.fg }}>{pill.label}</span>
                    <div style={{ flex: 1 }} />
                    <Toggle on={a.published} onToggle={() => void togglePublished(a)} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing !== null ? (
        <AlbumEditor album={editing === "new" ? null : editing} onClose={() => setEditing(null)} onChanged={load} />
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  notice: { color: "var(--muted)", fontSize: 14, padding: 8 },

  pageHd: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 22 },
  pageT: { fontFamily: font.heading, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink)" },
  pageS: { fontSize: 14, color: "var(--muted)", marginTop: 5 },
  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 42,
    padding: "0 16px",
    borderRadius: "var(--r-md)",
    border: "none",
    background: brand.green,
    color: "#fff",
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: font.ui,
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(255,255,255,.1) inset, 0 4px 12px rgba(11,70,52,.22)",
    flexShrink: 0,
  },

  empty: { fontSize: 13.5, color: "var(--muted)", padding: "40px 0", textAlign: "center" },

  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 18 },
  card: {
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: "var(--r-lg)",
    overflow: "hidden",
    boxShadow: "var(--sh-1)",
    transition: "transform .22s var(--ease), box-shadow .22s var(--ease)",
  },
  cover: { position: "relative", height: 140, background: "var(--field)" },
  coverHit: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  coverImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  coverEmpty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--faint)",
    fontSize: 12,
  },
  count: {
    position: "absolute",
    left: 12,
    bottom: 12,
    background: "rgba(0,0,0,.5)",
    color: "#fff",
    fontSize: 10.5,
    fontWeight: 700,
    borderRadius: 999,
    padding: "4px 10px",
    pointerEvents: "none",
  },
  coverActions: { position: "absolute", top: 12, right: 12, display: "flex", gap: 8 },
  coverBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    background: "rgba(0,0,0,.28)",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  coverIcon: { width: 15, height: 15, color: "#fff" },

  body: { padding: "14px 16px 14px" },
  titleBtn: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
    fontFamily: font.ui,
  },
  title: { fontFamily: font.heading, fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" },
  meta: { fontSize: 12, color: "var(--muted)", marginTop: 3 },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid var(--line)",
  },
  pill: { fontSize: 10.5, fontWeight: 700, borderRadius: radii.pill, padding: "5px 12px", flexShrink: 0 },
};
