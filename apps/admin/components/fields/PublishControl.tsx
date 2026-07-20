"use client";

import type { CSSProperties } from "react";
import type { PublishStatus } from "@althaqalayn/types";
import { brand } from "@/lib/ui";
import { DateField } from "./DateField";

const OPTIONS: { value: PublishStatus; label: string; hint: string }[] = [
  { value: "draft", label: "Draft", hint: "Saved, not visible in the app" },
  { value: "published", label: "Publish now", hint: "Goes live immediately" },
  { value: "scheduled", label: "Schedule", hint: "Auto-publishes at a set time" },
];

export function PublishControl({
  status,
  scheduledFor,
  onChange,
}: {
  status: PublishStatus;
  scheduledFor: string;
  onChange: (next: { status: PublishStatus; scheduledFor: string }) => void;
}) {
  const pick = (value: PublishStatus) =>
    onChange({ status: value, scheduledFor: value === "scheduled" ? scheduledFor : "" });

  const active = OPTIONS.find((o) => o.value === status) ?? OPTIONS[0];

  return (
    <div style={{ marginTop: 18 }}>
      <div style={styles.label}>PUBLISH</div>
      <div style={styles.seg}>
        {OPTIONS.map((o) => {
          const on = o.value === status;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              style={{ ...styles.segItem, ...(on ? styles.segOn : styles.segOff) }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <div style={styles.hint}>{active.hint}</div>
      {status === "scheduled" ? (
        <DateField
          label="SCHEDULE FOR"
          mode="datetime"
          value={scheduledFor}
          onChange={(v) => onChange({ status: "scheduled", scheduledFor: v })}
        />
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  label: { fontSize: 11, fontWeight: 800, letterSpacing: ".5px", color: "var(--faint)", marginBottom: 7 },
  seg: { display: "flex", gap: 8 },
  segItem: {
    flex: 1,
    padding: "10px 8px",
    borderRadius: 10,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  segOn: { background: brand.green, color: "#fff", border: "none", fontWeight: 700 },
  segOff: { background: "var(--chip)", color: "var(--muted)", border: "1px solid var(--line)", fontWeight: 600 },
  hint: { fontSize: 11, color: "var(--faint)", marginTop: 6 },
};
