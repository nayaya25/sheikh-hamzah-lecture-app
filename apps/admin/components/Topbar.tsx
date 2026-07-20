"use client";

import type { CSSProperties } from "react";
import { useTheme } from "@/lib/theme";
import { brand, font } from "@/lib/ui";
import { VIEW_TITLES, type View } from "@/lib/views";
import { Icon } from "@/components/Icon";

// Contextual primary action per view (hidden where there's nothing to create).
const PRIMARY: Partial<Record<View, string>> = {
  dashboard: "New lecture",
  content: "New lecture",
  categories: "New category",
  gallery: "New album",
  media: "Upload media",
};

export function Topbar({
  view,
  query,
  onQuery,
  onPrimary,
}: {
  view: View;
  query: string;
  onQuery: (q: string) => void;
  onPrimary?: () => void;
}) {
  const { dark, toggle } = useTheme();
  const primary = PRIMARY[view];

  return (
    <div style={styles.root}>
      <div style={styles.title}>{VIEW_TITLES[view]}</div>
      <div style={{ flex: 1 }} />

      <div style={styles.search}>
        <Icon name="search" size={16} color="var(--faint)" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search everything…"
          style={styles.searchInput}
        />
      </div>

      <button onClick={toggle} style={styles.iconBtn} title="Toggle theme">
        <Icon name={dark ? "sun" : "moon"} size={17} color="var(--muted)" />
      </button>

      {primary ? (
        <button onClick={onPrimary} style={styles.primary}>
          <Icon name="plus" size={15} color="#fff" strokeWidth={2.4} />
          {primary}
        </button>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    height: 66,
    flexShrink: 0,
    background: "var(--card)",
    borderBottom: "1px solid var(--line)",
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "0 26px",
  },
  title: { fontFamily: font.heading, fontSize: 20, fontWeight: 600 },
  search: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    background: "var(--chip)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    padding: "9px 13px",
    width: 260,
  },
  searchInput: { border: "none", background: "transparent", fontSize: 13, flex: 1, outline: "none" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 9,
    border: "1px solid var(--line)",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  primary: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 7,
    background: brand.green,
    color: "#fff",
    border: "none",
    borderRadius: 9,
    padding: "9px 15px",
    fontSize: 12.5,
    fontWeight: 700,
    fontFamily: font.ui,
    cursor: "pointer",
  },
};
