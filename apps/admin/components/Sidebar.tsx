"use client";

import type { CSSProperties } from "react";
import { useAuth } from "@/lib/auth";
import { brand, font } from "@/lib/ui";
import { radii } from "@/lib/tokens";
import { NAV, type View } from "@/lib/views";
import { Icon } from "@/components/Icon";

export function Sidebar({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  const { profile, email, signOut } = useAuth();
  const name = profile?.name ?? "Admin";
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const groups: NonNullable<(typeof NAV)[number]["group"]>[] = ["MENU", "SYSTEM"];

  return (
    <aside style={styles.root}>
      <div style={styles.logoRow}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/althaqalayn_icon.svg"
          alt=""
          width={38}
          height={38}
          style={{ borderRadius: radii.md, flexShrink: 0, boxShadow: "var(--sh-1)" }}
        />
        <div>
          <div style={styles.logoTitle}>Althaqalayn</div>
          <div style={styles.logoKicker}>Archive Admin</div>
        </div>
      </div>

      <nav className="noscroll" style={styles.nav}>
        {groups.map((group) => (
          <div key={group}>
            <div style={styles.groupLabel}>{group}</div>
            {NAV.filter((n) => n.group === group).map((item) => {
              // Collection detail isn't a nav destination, but Collections
              // should stay highlighted while a collection is open.
              const active = item.key === view || (item.key === "collections" && view === "collection");
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  style={{ ...styles.navItem, ...(active ? styles.navItemActive : null) }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = "var(--field)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Icon name={item.icon} size={19} strokeWidth={active ? 2.1 : 1.8} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
        <div style={styles.note}>
          Featuring, transcripts &amp; media now live <b style={styles.noteB}>inside a lecture</b> — created &amp;
          edited in a step-by-step dialog, not on separate pages.
        </div>
      </nav>

      <div style={styles.footer}>
        <div style={styles.avatar}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.footerName}>{name}</div>
          <div style={styles.footerRole} title={email ?? undefined}>
            {profile?.role ?? "Owner"}
          </div>
        </div>
        <button onClick={() => void signOut()} style={styles.logout} title="Sign out" aria-label="Sign out">
          <Icon name="logout" size={16} color="var(--faint)" strokeWidth={1.8} />
        </button>
      </div>
    </aside>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    width: 264,
    flexShrink: 0,
    height: "100vh",
    background: "var(--card)",
    borderRight: "1px solid var(--line)",
    display: "flex",
    flexDirection: "column",
    padding: "20px 0 14px",
  },
  logoRow: { display: "flex", alignItems: "center", gap: 11, padding: "0 22px 20px" },
  logoTitle: { fontFamily: font.heading, fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" },
  logoKicker: { fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--faint)", marginTop: 2 },
  nav: { flex: 1, padding: "8px 14px", overflowY: "auto" },
  groupLabel: { fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", color: "var(--faint)", padding: "14px 12px 8px" },
  navItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    marginBottom: 3,
    borderRadius: radii.md,
    color: "var(--muted)",
    fontSize: 14,
    fontWeight: 500,
    fontFamily: font.ui,
    textAlign: "left",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "background 140ms, color 140ms",
  },
  navItemActive: { background: "var(--green-soft)", color: brand.greenMid, fontWeight: 600 },
  note: {
    margin: "10px 12px 0",
    padding: "12px 14px",
    fontSize: 11.5,
    lineHeight: 1.55,
    color: "var(--muted)",
    background: "var(--field)",
    borderRadius: radii.md,
  },
  noteB: { color: brand.greenMid },
  footer: {
    margin: "8px 16px 0",
    paddingTop: 14,
    borderTop: "1px solid var(--line)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    background: `linear-gradient(140deg, ${brand.gold}, ${brand.goldDk})`,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 13,
    flexShrink: 0,
  },
  footerName: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--ink)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  footerRole: { fontSize: 11, color: "var(--muted)", textTransform: "capitalize" },
  logout: {
    width: 30,
    height: 30,
    borderRadius: radii.sm,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
  },
};
