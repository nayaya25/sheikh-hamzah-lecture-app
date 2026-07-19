import type { CSSProperties } from "react";
import type { MediaType } from "@althaqalayn/types";

/** Inline preview of a lecture's media: audio/video player or the text body. */
export function MediaPreview({ type, url, body }: { type: MediaType; url?: string; body?: string }) {
  if (type === "text") {
    if (!body?.trim()) return <div style={hint}>No text yet — add the reader body above.</div>;
    return <div style={textBox}>{body}</div>;
  }
  if (!url) return <div style={hint}>No file uploaded yet.</div>;
  if (type === "audio") return <audio controls preload="none" src={url} style={{ width: "100%" }} />;
  return <video controls preload="none" src={url} style={{ width: "100%", borderRadius: 10, maxHeight: 240, background: "#000" }} />;
}

const hint: CSSProperties = { fontSize: 12, color: "var(--faint)", fontStyle: "italic" };
const textBox: CSSProperties = {
  maxHeight: 180,
  overflowY: "auto",
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: 12,
  fontSize: 13,
  lineHeight: 1.6,
  color: "var(--ink)",
  background: "var(--input)",
  whiteSpace: "pre-wrap",
};
