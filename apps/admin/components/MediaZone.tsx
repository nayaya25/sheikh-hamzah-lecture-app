"use client";

import { useRef, useState, type CSSProperties, type DragEvent } from "react";
import type { MediaType } from "@althaqalayn/types";
import { MediaPreview } from "@/components/MediaPreview";
import { brand } from "@/lib/ui";
import { MAX_MEDIA_BYTES, deleteMedia, storagePathFromUrl, uploadMedia } from "@/lib/upload";

const ACCEPT: Record<Exclude<MediaType, "text">, string> = {
  audio: "audio/*",
  video: "video/*",
};

export function MediaZone({
  type,
  value,
  onChange,
  folder = "lectures",
  compact,
  onBusyChange,
  onDurationDetected,
}: {
  type: MediaType;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  compact?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onDurationDetected?: (seconds: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (type === "text") return null; // text uses TextArea + MediaPreview directly

  const mediaKind = type as Exclude<MediaType, "text">;

  const validate = (file: File): string | null => {
    if (file.size > MAX_MEDIA_BYTES) {
      return `File is ${(file.size / 1024 / 1024).toFixed(1)} MB — the limit is 50 MB.`;
    }
    const prefix = mediaKind === "audio" ? "audio/" : "video/";
    if (file.type && !file.type.startsWith(prefix)) {
      return `That looks like a ${file.type || "non-" + mediaKind} file — choose ${mediaKind === "audio" ? "an audio" : "a video"} file.`;
    }
    return null;
  };

  const handleFile = async (file: File) => {
    const bad = validate(file);
    if (bad) {
      setError(bad);
      return;
    }
    setError(null);
    setUploading(true);
    onBusyChange?.(true);
    try {
      const { url } = await uploadMedia(file, folder);
      const old = storagePathFromUrl(value);
      if (old) await deleteMedia(old);
      onChange(url);
      setName(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  const remove = async () => {
    const old = storagePathFromUrl(value);
    if (old) await deleteMedia(old);
    onChange("");
    setName("");
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  return (
    <div>
      {value ? (
        <div style={styles.filled}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.name}>{name || "Current file"}</div>
            <div style={styles.url}>{value}</div>
          </div>
          <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} style={styles.action}>
            {uploading ? "Uploading…" : "Replace"}
          </button>
          <button type="button" onClick={() => void remove()} style={styles.actionMuted}>Remove</button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          style={{
            ...styles.dropzone,
            ...(compact ? { padding: 16 } : null),
            ...(dragOver ? { borderColor: brand.greenMid, background: "var(--chip)" } : null),
          }}
        >
          <div style={styles.dzTitle}>
            {uploading ? "Uploading…" : dragOver ? "Drop to upload" : `Drag a ${mediaKind} file here, or click to browse`}
          </div>
          <div style={styles.dzHint}>{mediaKind === "audio" ? "MP3, M4A" : "MP4, MOV"} · max 50 MB</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[mediaKind]}
        hidden
        disabled={uploading}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void handleFile(f);
        }}
      />

      {uploading ? <div style={styles.barTrack}><div style={styles.barFill} /></div> : null}
      {error ? <div style={styles.error}>{error}</div> : null}

      {value ? (
        <div style={{ marginTop: 10 }}>
          <MediaPreview type={type} url={value} />
          {onDurationDetected ? (
            mediaKind === "audio" ? (
              <audio src={value} preload="metadata" style={{ display: "none" }}
                onLoadedMetadata={(e) => {
                  const d = (e.currentTarget as HTMLAudioElement).duration;
                  if (d && Number.isFinite(d)) onDurationDetected(Math.round(d));
                }} />
            ) : (
              <video src={value} preload="metadata" style={{ display: "none" }}
                onLoadedMetadata={(e) => {
                  const d = (e.currentTarget as HTMLVideoElement).duration;
                  if (d && Number.isFinite(d)) onDurationDetected(Math.round(d));
                }} />
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  dropzone: {
    border: "1.6px dashed var(--line)",
    borderRadius: 14,
    padding: 26,
    textAlign: "center",
    background: "var(--input)",
    cursor: "pointer",
  },
  dzTitle: { fontSize: 13.5, fontWeight: 600, color: "var(--ink)" },
  dzHint: { fontSize: 11.5, color: "var(--faint)", marginTop: 3 },
  filled: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1.5px solid var(--line)",
    borderRadius: 12,
    padding: "12px 14px",
    background: "var(--input)",
  },
  name: { fontSize: 13, fontWeight: 600 },
  url: { fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  action: { flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: brand.greenMid, cursor: "pointer", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 9, background: "transparent" },
  actionMuted: { flexShrink: 0, fontSize: 12.5, fontWeight: 700, color: "var(--muted)", cursor: "pointer", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 9, background: "transparent" },
  barTrack: { height: 4, borderRadius: 4, background: "var(--line)", overflow: "hidden", marginTop: 10 },
  barFill: { height: "100%", width: "40%", background: brand.greenMid, borderRadius: 4, animation: "mediaZoneBar 1s ease-in-out infinite" },
  error: { fontSize: 11.5, color: "#a23e3e", marginTop: 8, fontWeight: 600 },
};
