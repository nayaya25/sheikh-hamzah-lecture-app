import type { CSSProperties } from "react";
import type { MediaType } from "@althaqalayn/types";
import { MediaPreview } from "@/components/MediaPreview";
import { brand } from "@/lib/ui";

/** Upload dropzone / replace control + inline preview for an audio or video file. */
export function MediaUploadField({
  type,
  url,
  name,
  uploading,
  onFile,
  compact,
}: {
  type: MediaType;
  url: string;
  name: string;
  uploading: boolean;
  onFile: (file: File) => void;
  compact?: boolean;
}) {
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) onFile(f);
  };

  return (
    <>
      {url ? (
        <div style={styles.uploaded}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{name || "Current file"}</div>
            <div style={styles.url}>{url}</div>
          </div>
          <label style={styles.replace}>
            {uploading ? "Uploading…" : "Replace"}
            <input type="file" accept="audio/*,video/*" hidden disabled={uploading} onChange={pick} />
          </label>
        </div>
      ) : (
        <label style={{ ...styles.dropzone, ...(compact ? { padding: 16 } : null) }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
            {uploading ? "Uploading…" : "Click to upload an audio or video file"}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--faint)", marginTop: 3 }}>MP3, MP4 · stored in your media bucket</div>
          <input type="file" accept="audio/*,video/*" hidden disabled={uploading} onChange={pick} />
        </label>
      )}
      {url ? (
        <div style={{ marginTop: 10 }}>
          <MediaPreview type={type} url={url} />
        </div>
      ) : null}
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  dropzone: {
    display: "block",
    border: "1.6px dashed var(--line)",
    borderRadius: 14,
    padding: 26,
    textAlign: "center",
    background: "var(--input)",
    cursor: "pointer",
  },
  uploaded: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1.5px solid var(--line)",
    borderRadius: 12,
    padding: "12px 14px",
    background: "var(--input)",
  },
  url: { fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  replace: {
    flexShrink: 0,
    fontSize: 12.5,
    fontWeight: 700,
    color: brand.greenMid,
    cursor: "pointer",
    padding: "8px 12px",
    border: "1px solid var(--line)",
    borderRadius: 9,
  },
};
