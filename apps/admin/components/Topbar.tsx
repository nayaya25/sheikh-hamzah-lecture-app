"use client";

import { useState, type CSSProperties } from "react";
import { useTheme } from "@/lib/theme";
import { brand, font } from "@/lib/ui";
import { motion, radii } from "@/lib/tokens";
import { VIEW_TITLES, type View } from "@/lib/views";
import { Icon } from "@/components/Icon";

// Contextual primary action per view (hidden where there's nothing to create).
const PRIMARY: Partial<Record<View, string>> = {
  dashboard: "New lecture",
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
  const [searchFocus, setSearchFocus] = useState(false);
  const primary = PRIMARY[view];

  return (
    <div style={styles.root}>
      <div style={styles.title}>{VIEW_TITLES[view]}</div>
      <div style={{ flex: 1 }} />

      <div
        style={{
          ...styles.search,
          borderColor: searchFocus ? brand.greenBright : "var(--line)",
          boxShadow: searchFocus ? "0 0 0 3px rgba(23,121,94,.13)" : "none",
        }}
      >
        <Icon name="search" size={16} color="var(--faint)" strokeWidth={1.9} />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
          placeholder="Search everything…"
          style={styles.searchInput}
        />
      </div>

      <button
        onClick={toggle}
        style={styles.iconBtn}
        title={dark ? "Switch to light" : "Switch to dark"}
        aria-label="Toggle theme"
      >
        <Icon name={dark ? "sun" : "moon"} size={17} color="var(--muted)" strokeWidth={1.9} />
      </button>

      {primary ? (
        <button
          onClick={onPrimary}
          style={styles.primary}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span>{primary}</span>
          <span style={styles.primaryIcon}>
            <Icon name="plus" size={14} color={brand.green} strokeWidth={2.4} />
          </span>
        </button>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    height: 72,
    flexShrink: 0,
    background: "var(--card)",
    borderBottom: "1px solid var(--line)",
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "0 28px",
    boxShadow: "0 1px 0 rgba(20,35,25,.02)",
  },
  title: { fontFamily: font.heading, fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em" },
  search: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    background: "var(--field)",
    border: "1px solid var(--line)",
    borderRadius: radii.pill,
    padding: "10px 16px",
    width: 280,
    transition: `border-color ${motion.fast} ${motion.standard}, box-shadow ${motion.fast} ${motion.standard}`,
  },
  searchInput: { border: "none", background: "transparent", fontSize: 13.5, flex: 1, outline: "none" },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    border: "1px solid var(--line)",
    background: "var(--card)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: "var(--sh-1)",
    transition: `background ${motion.fast} ${motion.standard}`,
  },
  primary: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: brand.green,
    color: "#fff",
    border: "none",
    borderRadius: radii.pill,
    padding: "6px 6px 6px 18px",
    height: 44,
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: font.ui,
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(255,255,255,.12) inset, 0 4px 12px rgba(11,70,52,.24)",
    transition: `transform ${motion.fast} ${motion.out}`,
  },
  primaryIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    background: brand.gold,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
};
