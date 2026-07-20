"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { admin, mapPhoto, unwrap, type PhotoRow } from "@althaqalayn/api";
import type { Album, Photo } from "@althaqalayn/types";
import { Drawer, Toggle } from "@/components/form";
import { DateField, TextField } from "@/components/fields";
import { SectionedForm, type FormSection } from "@/components/SectionedForm";
import { getClient } from "@/lib/supabase";
import { brand } from "@/lib/ui";
import { MAX_MEDIA_BYTES, uploadMedia } from "@/lib/upload";

/** Album metadata + cover image + live photo management (upload/delete). */
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
  const [cover, setCover] = useState(album?.cover ?? "");
  const [published, setPublished] = useState(album?.published ?? false);
  const [photos, setPhotos] = useState<Photo[]>(album?.photos ?? []);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
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
        {
          title: title.trim(),
          date,
          ...(event.trim() ? { event: event.trim() } : {}),
          ...(cover ? { cover } : {}),
          published,
        },
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

  const handleCoverFile = async (file: File) => {
    if (file.size > MAX_MEDIA_BYTES) {
      setCoverError(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 50 MB.`);
      return;
    }
    setCoverError(null);
    setCoverUploading(true);
    try {
      const { url } = await uploadMedia(file, "gallery");
      setCover(url);
    } catch (e) {
      setCoverError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setCoverUploading(false);
    }
  };

  const addPhotos = async (files: FileList) => {
    if (!albumId) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_MEDIA_BYTES) {
          throw new Error(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 50 MB.`);
        }
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

  const sections: FormSection[] = [
    {
      key: "details",
      title: "Details",
      render: () => (
        <>
          <TextField label="TITLE" value={title} onChange={setTitle} placeholder="Maulud an-Nabī ﷺ 1445" />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ width: 170 }}>
              <DateField label="DATE" value={date} onChange={setDate} />
            </div>
            <div style={{ flex: 1 }}>
              <TextField label="EVENT (OPTIONAL)" value={event} onChange={setEvent} placeholder="Maulud an-Nabī" />
            </div>
          </div>
          <div style={styles.pubRow}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>Published</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>Visible in the app’s Gallery</div>
            </div>
            <Toggle on={published} onToggle={() => setPublished((p) => !p)} />
          </div>
        </>
      ),
    },
    {
      key: "cover",
      title: "Cover",
      render: () => (
        <>
          {cover ? (
            <div style={styles.coverRow}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" style={styles.coverThumb} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.coverUrl}>{cover}</div>
              </div>
              <label style={styles.coverBtn}>
                {coverUploading ? "Uploading…" : "Replace"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  disabled={coverUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void handleCoverFile(f);
                  }}
                />
              </label>
              <button type="button" onClick={() => setCover("")} style={styles.coverBtnMuted}>Remove</button>
            </div>
          ) : (
            <label style={styles.coverDrop}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
                {coverUploading ? "Uploading…" : "Click to upload a cover image"}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>JPG, PNG · max 50 MB</div>
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={coverUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void handleCoverFile(f);
                }}
              />
            </label>
          )}
          {coverError ? <div style={styles.coverError}>{coverError}</div> : null}
        </>
      ),
    },
    {
      key: "photos",
      title: "Photos",
      render: () =>
        !albumId ? (
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
        ),
    },
  ];

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
      <SectionedForm sections={sections} />
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
  coverRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1.5px solid var(--line)",
    borderRadius: 12,
    padding: "12px 14px",
    background: "var(--input)",
  },
  coverThumb: { width: 56, height: 56, borderRadius: 10, objectFit: "cover", flexShrink: 0 },
  coverUrl: { fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  coverBtn: {
    flexShrink: 0,
    fontSize: 12.5,
    fontWeight: 700,
    color: brand.greenMid,
    cursor: "pointer",
    padding: "8px 12px",
    border: "1px solid var(--line)",
    borderRadius: 9,
  },
  coverBtnMuted: {
    flexShrink: 0,
    fontSize: 12.5,
    fontWeight: 700,
    color: "var(--muted)",
    cursor: "pointer",
    padding: "8px 12px",
    border: "1px solid var(--line)",
    borderRadius: 9,
    background: "transparent",
  },
  coverDrop: {
    display: "block",
    border: "1.6px dashed var(--line)",
    borderRadius: 14,
    padding: 26,
    textAlign: "center",
    background: "var(--input)",
    cursor: "pointer",
  },
  coverError: { fontSize: 11.5, color: "#a23e3e", marginTop: 8, fontWeight: 600 },
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
