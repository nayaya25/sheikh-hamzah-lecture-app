"use client";

import { useState, type CSSProperties } from "react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { brand, font } from "@/lib/ui";
import { radii } from "@/lib/tokens";
import { Icon } from "@/components/Icon";

// Deliberately no primary "New …" button here — creation happens from page
// headers / collection detail / empty states via modals (see ModalProvider).
export function Topbar({ query, onQuery }: { query: string; onQuery: (q: string) => void }) {
  const { profile, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const [searchFocus, setSearchFocus] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const name = profile?.name ?? "Admin";
  const first = name.split(" ")[0];

  return (
    <div style={styles.root}>
      <button style={styles.burger} title="Toggle sidebar" aria-label="Toggle sidebar">
        <Icon name="menu" size={18} strokeWidth={1.9} />
      </button>

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
          placeholder="Search or type a command…"
          style={styles.searchInput}
        />
        <span style={styles.kbd}>⌘K</span>
      </div>

      <div style={{ flex: 1 }} />

      <button
        onClick={toggle}
        style={styles.iconBtn}
        title={dark ? "Switch to light" : "Switch to dark"}
        aria-label="Toggle theme"
      >
        <Icon name={dark ? "sun" : "moon"} size={17} color="var(--muted)" strokeWidth={1.9} />
      </button>

      <button style={styles.iconBtn} title="Notifications" aria-label="Notifications">
        <span style={styles.dot} />
        <Icon name="bell" size={17} color="var(--muted)" strokeWidth={1.9} />
      </button>

      <div style={{ position: "relative" }}>
        <button onClick={() => setUserMenu((o) => !o)} style={styles.who}>
          <span style={styles.avatar}>{name.slice(0, 2).toUpperCase()}</span>
          <span style={styles.whoName}>{first}</span>
          <Icon name="chevron-down" size={14} color="var(--faint)" strokeWidth={2} />
        </button>
        {userMenu ? (
          <>
            <div style={styles.menuScrim} onClick={() => setUserMenu(false)} />
            <div style={styles.menu}>
              <button
                onClick={() => {
                  setUserMenu(false);
                  void signOut();
                }}
                style={styles.menuItem}
              >
                Sign out
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    height: 70,
    flexShrink: 0,
    background: "var(--card)",
    borderBottom: "1px solid var(--line)",
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "0 26px",
  },
  burger: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    border: "1px solid var(--line)",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--muted)",
    cursor: "pointer",
    flexShrink: 0,
  },
  search: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "var(--field)",
    border: "1px solid var(--line)",
    borderRadius: radii.md,
    padding: "0 12px",
    height: 42,
    width: 420,
    color: "var(--faint)",
    fontSize: 14,
    transition: "border-color 140ms, box-shadow 140ms",
  },
  searchInput: { border: "none", background: "transparent", fontSize: 14, flex: 1, outline: "none", color: "var(--ink)" },
  kbd: {
    marginLeft: "auto",
    fontSize: 11,
    fontWeight: 600,
    color: "var(--muted)",
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: 6,
    padding: "3px 7px",
    flexShrink: 0,
  },
  iconBtn: {
    position: "relative",
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    border: "1px solid var(--line)",
    background: "var(--card)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  dot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--down)",
    border: "2px solid var(--card)",
  },
  who: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "4px 10px 4px 4px",
    borderRadius: radii.pill,
    border: "1px solid var(--line)",
    background: "var(--card)",
    cursor: "pointer",
  },
  whoName: { fontSize: 13.5, fontWeight: 600, color: "var(--ink)", fontFamily: font.ui },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    background: `linear-gradient(140deg, ${brand.gold}, ${brand.goldDk})`,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 11,
    flexShrink: 0,
  },
  menuScrim: { position: "fixed", inset: 0, zIndex: 60 },
  menu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    zIndex: 61,
    minWidth: 150,
    background: "var(--card)",
    border: "1px solid var(--line)",
    borderRadius: radii.md,
    boxShadow: "var(--sh-2)",
    padding: 6,
    display: "flex",
    flexDirection: "column",
  },
  menuItem: {
    textAlign: "left",
    background: "transparent",
    border: "none",
    borderRadius: radii.sm,
    padding: "9px 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--ink)",
    cursor: "pointer",
    fontFamily: font.ui,
  },
};
