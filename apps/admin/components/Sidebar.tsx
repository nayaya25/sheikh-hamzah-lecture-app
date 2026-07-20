"use client";

import type { CSSProperties } from "react";
import { useAuth } from "@/lib/auth";
import { brand, font } from "@/lib/ui";
import { NAV, type View } from "@/lib/views";
import { Icon } from "@/components/Icon";

export function Sidebar({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  const { profile, email, signOut } = useAuth();
  const name = profile?.name ?? "Admin";
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const groups: NonNullable<(typeof NAV)[number]["group"]>[] = ["MANAGE", "SYSTEM"];

  return (
    <div style={styles.root}>
      <div style={styles.brandRow}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/althaqalayn_icon.svg" alt="" width={38} height={38} style={{ flexShrink: 0 }} />
        <div>
          <div style={styles.brandName}>Althaqalayn</div>
          <div style={styles.brandKicker}>ADMIN CONSOLE</div>
        </div>
      </div>

      <div className="noscroll" style={styles.nav}>
        {groups.map((group) => (
          <div key={group}>
            <div style={styles.groupLabel}>{group}</div>
            {NAV.filter((n) => n.group === group).map((item) => {
              const active = item.key === view;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  style={{ ...styles.navItem, ...(active ? styles.navItemActive : null) }}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <div style={styles.avatar}>{initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.footerName}>{name}</div>
          <div style={styles.footerRole} title={email ?? undefined}>
            {profile?.role ?? "Foundation staff"}
          </div>
        </div>
        <button onClick={() => void signOut()} style={styles.logout} title="Sign out">
          <Icon name="logout" size={18} color="rgba(255,255,255,.6)" />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    width: 246,
    flexShrink: 0,
    background: `linear-gradient(180deg, ${brand.green}, ${brand.greenDeepest})`,
    display: "flex",
    flexDirection: "column",
    padding: "20px 0",
    height: "100vh",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "0 20px 20px",
    borderBottom: "1px solid rgba(255,255,255,.09)",
  },
  emblem: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    border: "1.5px solid rgba(228,199,123,.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontFamily: font.arabic,
    fontSize: 20,
    color: brand.gold,
  },
  brandName: { fontFamily: font.heading, fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.1 },
  brandKicker: { fontSize: 10.5, letterSpacing: 1, color: brand.gold },
  nav: { padding: "14px 0", flex: 1, overflowY: "auto" },
  groupLabel: { fontSize: 10, fontWeight: 800, letterSpacing: 1, color: "rgba(255,255,255,.35)", padding: "6px 22px" },
  navItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 22px",
    background: "transparent",
    border: "none",
    borderLeft: "3px solid transparent",
    color: "rgba(255,255,255,.72)",
    fontSize: 13.5,
    fontFamily: font.ui,
    cursor: "pointer",
    textAlign: "left",
  },
  navItemActive: {
    color: brand.gold,
    background: "rgba(228,199,123,.14)",
    borderLeft: `3px solid ${brand.gold}`,
    fontWeight: 600,
  },
  footer: {
    padding: "14px 16px 0",
    marginTop: 4,
    borderTop: "1px solid rgba(255,255,255,.09)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: brand.gold,
    color: brand.green,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 13,
  },
  footerName: { fontSize: 12.5, color: "#fff", fontWeight: 600 },
  footerRole: { fontSize: 10.5, color: "rgba(255,255,255,.5)", textTransform: "capitalize" },
  logout: { background: "transparent", border: "none", cursor: "pointer", padding: 0 },
};
