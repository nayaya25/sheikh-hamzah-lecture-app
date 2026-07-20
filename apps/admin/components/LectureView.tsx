"use client";

import type { CSSProperties, ReactNode } from "react";
import type { Lecture } from "@althaqalayn/types";
import { MediaPreview } from "@/components/MediaPreview";
import { font, mediaBadge, statusPill } from "@/lib/ui";

const pick = (t?: { en: string; ha?: string }) => t?.en ?? "";

/** Read-only detail view of a lecture, with an inline media/text preview. */
export function LectureView({
  lecture,
  seriesTitle,
  onClose,
}: {
  lecture: Lecture;
  seriesTitle?: string;
  onClose: () => void;
}) {
  const badge = mediaBadge(lecture.type);
  const pill = statusPill(lecture.status);

  return (
    <>
      <div style={styles.scrim} onClick={onClose} />
      <div style={styles.drawer}>
        <div style={styles.header}>
          <div style={{ minWidth: 0 }}>
            <div style={styles.h1}>{pick(lecture.title)}</div>
            {lecture.title.ha ? <div style={styles.sub}>{lecture.title.ha}</div> : null}
          </div>
          <button onClick={onClose} style={styles.close} aria-label="Close">✕</button>
        </div>

        <div className="noscroll" style={styles.body}>
          <div style={styles.badges}>
            <span style={{ ...styles.badge, background: badge.bg, color: badge.fg }}>{lecture.type.toUpperCase()}</span>
            <span style={{ ...styles.pill, background: pill.bg, color: pill.fg }}>{pill.label}</span>
          </div>

          {lecture.type === "text" ? (
            <Row label="Reader body">
              <MediaPreview type="text" body={lecture.body?.en ?? lecture.body?.ha} />
            </Row>
          ) : (
            <Row label="Media">
              <MediaPreview type={lecture.type} url={lecture.mediaUrl} />
            </Row>
          )}

          <Meta label="Collection" value={seriesTitle ?? (lecture.scope === "single" ? "Standalone" : "—")} />
          {lecture.episode != null ? <Meta label="Episode" value={`Part ${lecture.episode}`} /> : null}
          {lecture.year ? <Meta label="Year" value={lecture.year} /> : null}
          <Meta label="Language" value={lecture.language === "ha" ? "Hausa" : "English"} />
          {lecture.duration ? <Meta label="Length" value={`${Math.round(lecture.duration / 60)} min`} /> : null}
          <Meta label="Date" value={lecture.date} />
          {lecture.scheduledFor ? <Meta label="Scheduled for" value={new Date(lecture.scheduledFor).toLocaleString()} /> : null}
          {lecture.description?.en ? <Meta label="Description" value={lecture.description.en} /> : null}
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={styles.label}>{label.toUpperCase()}</div>
      {children}
    </div>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.metaRow}>
      <div style={styles.label}>{label.toUpperCase()}</div>
      <div style={styles.value}>{value}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  scrim: { position: "fixed", inset: 0, zIndex: 50, background: "rgba(20,30,26,.4)" },
  drawer: {
    position: "fixed",
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 51,
    width: 472,
    maxWidth: "100vw",
    background: "var(--card)",
    boxShadow: "-14px 0 40px rgba(0,0,0,.16)",
    display: "flex",
    flexDirection: "column",
  },
  header: { padding: "22px 24px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  h1: { fontFamily: font.heading, fontSize: 18, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  sub: { fontSize: 12, color: "var(--muted)", marginTop: 2 },
  close: { background: "transparent", border: "none", fontSize: 18, color: "var(--muted)", cursor: "pointer" },
  body: { flex: 1, overflowY: "auto", padding: 24 },
  badges: { display: "flex", gap: 8, marginBottom: 18 },
  badge: { fontSize: 9, fontWeight: 800, letterSpacing: ".5px", borderRadius: 5, padding: "4px 8px" },
  pill: { fontSize: 10.5, fontWeight: 800, borderRadius: 20, padding: "4px 11px" },
  label: { fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)", marginBottom: 5 },
  metaRow: { paddingTop: 12, borderTop: "1px solid var(--line)", marginTop: 12 },
  value: { fontSize: 13.5, color: "var(--ink)", lineHeight: 1.5 },
};
