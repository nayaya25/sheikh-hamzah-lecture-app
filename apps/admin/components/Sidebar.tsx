"use client";

import { useState, type CSSProperties } from "react";
import { useAuth } from "@/lib/auth";
import { brand, font } from "@/lib/ui";
import { motion, radii } from "@/lib/tokens";
import { NAV, type View } from "@/lib/views";
import { Icon } from "@/components/Icon";

export function Sidebar({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  const { profile, email, signOut } = useAuth();
  const [hover, setHover] = useState<string | null>(null);
  const name = profile?.name ?? "Admin";
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  const groups: NonNullable<(typeof NAV)[number]["group"]>[] = ["MANAGE", "SYSTEM"];

  return (
    <div style={styles.root}>
      <div style={styles.texture} />

      <div style={styles.brandRow}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/althaqalayn_icon.svg" alt="" width={36} height={36} style={{ flexShrink: 0 }} />
        <div>
          <div style={styles.brandName}>Althaqalayn</div>
          <div style={styles.brandKicker}>Lecture Archive</div>
        </div>
      </div>

      <div className="noscroll" style={styles.nav}>
        {groups.map((group) => (
          <div key={group} style={{ marginBottom: 6 }}>
            <div style={styles.groupLabel}>{group}</div>
            {NAV.filter((n) => n.group === group).map((item) => {
              const active = item.key === view;
              const hot = hover === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => onNavigate(item.key)}
                  onMouseEnter={() => setHover(item.key)}
                  onMouseLeave={() => setHover(null)}
                  style={{
                    ...styles.navItem,
                    ...(active ? styles.navItemActive : hot ? styles.navItemHover : null),
                  }}
                >
                  {active ? <span style={styles.tick} /> : null}
                  <Icon name={item.icon} size={18} strokeWidth={active ? 2.1 : 1.8} />
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
        <button onClick={() => void signOut()} style={styles.logout} title="Sign out" aria-label="Sign out">
          <Icon name="logout" size={17} color="rgba(255,255,255,.55)" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: "relative",
    width: 250,
    flexShrink: 0,
    background: `linear-gradient(180deg, ${brand.greenMid} -20%, ${brand.green} 40%, ${brand.greenDeepest} 100%)`,
    display: "flex",
    flexDirection: "column",
    padding: "22px 0 14px",
    height: "100vh",
    boxShadow: "inset -1px 0 0 rgba(0,0,0,.25)",
  },
  texture: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,.04) 1px, transparent 1.6px)",
    backgroundSize: "20px 20px",
    maskImage: "linear-gradient(180deg, #000, transparent 55%)",
    WebkitMaskImage: "linear-gradient(180deg, #000, transparent 55%)",
    pointerEvents: "none",
  },
  brandRow: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "0 22px 20px",
    marginBottom: 6,
    borderBottom: "1px solid rgba(255,255,255,.08)",
  },
  brandName: { fontFamily: font.arabic, fontSize: 20, fontWeight: 400, color: "#fff", lineHeight: 1.05 },
  brandKicker: { fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: brand.gold, marginTop: 3 },
  nav: { position: "relative", padding: "10px 12px", flex: 1, overflowY: "auto" },
  groupLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.16em",
    color: "rgba(255,255,255,.34)",
    padding: "10px 12px 8px",
  },
  navItem: {
    position: "relative",
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    marginBottom: 2,
    background: "transparent",
    border: "none",
    borderRadius: radii.sm,
    color: "rgba(255,255,255,.7)",
    fontSize: 13.5,
    fontFamily: font.ui,
    cursor: "pointer",
    textAlign: "left",
    transition: `background ${motion.fast} ${motion.standard}, color ${motion.fast} ${motion.standard}`,
  },
  navItemHover: { background: "rgba(255,255,255,.06)", color: "#fff" },
  navItemActive: {
    color: brand.gold,
    background: "rgba(228,199,123,.13)",
    fontWeight: 600,
    boxShadow: "inset 0 0 0 1px rgba(228,199,123,.18)",
  },
  tick: {
    position: "absolute",
    left: -12,
    top: "50%",
    transform: "translateY(-50%)",
    width: 3,
    height: 20,
    borderRadius: 3,
    background: brand.gold,
  },
  footer: {
    position: "relative",
    margin: "10px 14px 0",
    paddingTop: 14,
    borderTop: "1px solid rgba(255,255,255,.08)",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    background: `linear-gradient(140deg, ${brand.gold}, ${brand.goldDk})`,
    color: brand.greenDeepest,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 13,
    flexShrink: 0,
  },
  footerName: { fontSize: 12.5, color: "#fff", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  footerRole: { fontSize: 10.5, color: "rgba(255,255,255,.5)", textTransform: "capitalize" },
  logout: {
    width: 34,
    height: 34,
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
