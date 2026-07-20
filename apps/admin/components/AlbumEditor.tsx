"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { admin, mapPhoto, unwrap, type PhotoRow } from "@althaqalayn/api";
import type { Album, Photo } from "@althaqalayn/types";
import { Drawer, Field, inp, Label, Toggle } from "@/components/form";
import { getClient } from "@/lib/supabase";
import { brand } from "@/lib/ui";
import { uploadMedia } from "@/lib/upload";

/** Album metadata + live photo management (upload/delete). */
export function AlbumEditor({
  album,
  onClose,
  onChanged,
}: {
  album: Album | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [albumId, setAlbumId] = useState(album?.id ?? "");
  const [title, setTitle] = useState(album?.title ?? "");
  const [date, setDate] = useState(album?.date ?? new Date().toISOString().slice(0, 10));
  const [event, setEvent] = useState(album?.event ?? "");
  const [published, setPublished] = useState(album?.published ?? false);
  const [photos, setPhotos] = useState<Photo[]>(album?.photos ?? []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPhotos = useCallback(async (id: string) => {
    const r = await getClient().from("photos").select("*").eq("album_id", id).order("position");
    setPhotos(unwrap<PhotoRow[]>(r).map(mapPhoto));
  }, []);

  useEffect(() => {
    if (albumId) void loadPhotos(albumId);
  }, [albumId, loadPhotos]);

  const saveMeta = async () => {
    setError(null);
    if (!title.trim()) return setError("Title is required.");
    setBusy(true);
    try {
      const saved = await admin.upsertAlbum(
        getClient(),
        { title: title.trim(), date, ...(event.trim() ? { event: event.trim() } : {}), published },
        albumId || undefined,
      );
      setAlbumId(saved.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const addPhotos = async (files: FileList) => {
    if (!albumId) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const { url } = await uploadMedia(file, "gallery");
        await admin.addPhoto(getClient(), albumId, { url });
      }
      await loadPhotos(albumId);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (id: string) => {
    await admin.deletePhoto(getClient(), id);
    await loadPhotos(albumId);
    onChanged();
  };

  return (
    <Drawer
      title={album ? "Edit album" : "New album"}
      sub="A gallery of event photos"
      onClose={onClose}
      onSave={saveMeta}
      saveLabel={busy ? "Saving…" : "Save album"}
      busy={busy}
      error={error}
    >
      <Field label="TITLE">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maulud an-Nabī ﷺ 1445" style={inp} />
      </Field>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <div style={{ flex: 1 }}>
          <Label>EVENT (OPTIONAL)</Label>
          <input value={event} onChange={(e) => setEvent(e.target.value)} placeholder="Maulud an-Nabī" style={inp} />
        </div>
        <div style={{ width: 170 }}>
          <Label>DATE</Label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} />
        </div>
      </div>

      <div style={styles.pubRow}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Published</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Visible in the app’s Gallery</div>
        </div>
        <Toggle on={published} onToggle={() => setPublished((p) => !p)} />
      </div>

      <div style={{ marginTop: 20 }}>
        <Label>PHOTOS</Label>
        {!albumId ? (
          <div style={styles.hint}>Save the album first, then add photos.</div>
        ) : (
          <>
            <div style={styles.photoGrid}>
              {photos.map((p) => (
                <div key={p.id} style={styles.photo}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.caption ?? ""} style={styles.photoImg} />
                  <button onClick={() => void removePhoto(p.id)} style={styles.photoDel} aria-label="Delete photo">✕</button>
                </div>
              ))}
            </div>
            <label style={styles.addPhotos}>
              {uploading ? "Uploading…" : "+ Add photos"}
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                disabled={uploading}
                onChange={(e) => {
                  if (e.target.files?.length) void addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </>
        )}
      </div>
    </Drawer>
  );
}

const styles: Record<string, CSSProperties> = {
  pubRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    background: "var(--input)",
    border: "1px solid var(--line)",
    borderRadius: 12,
    padding: 14,
  },
  hint: { fontSize: 12.5, color: "var(--faint)", fontStyle: "italic" },
  photoGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 },
  photo: { position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "1 / 1" },
  photoImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  photoDel: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "rgba(0,0,0,.55)",
    color: "#fff",
    border: "none",
    fontSize: 11,
    cursor: "pointer",
  },
  addPhotos: {
    display: "block",
    textAlign: "center",
    border: "1.5px dashed var(--line)",
    borderRadius: 10,
    padding: 12,
    background: "var(--input)",
    color: brand.greenMid,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
};
