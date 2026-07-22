"use client";

import { useState, type CSSProperties } from "react";
import { useAuth } from "@/lib/auth";
import { brand, font } from "@/lib/ui";
import { motion, radii } from "@/lib/tokens";
import { Icon } from "@/components/Icon";

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const fieldStyle = (key: string): CSSProperties => ({
    ...styles.input,
    borderColor: focus === key ? brand.greenBright : "var(--line)",
    boxShadow: focus === key ? `0 0 0 3px rgba(23,121,94,.14)` : "none",
  });

  return (
    <div style={styles.root} className="login-grid">
      {/* Left — brand panel */}
      <section style={styles.panel}>
        <div style={styles.dots} />
        <div style={styles.watermark}>ﷲ</div>

        <div style={styles.panelInner} className="rise">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/althaqalayn_icon.svg" alt="Althaqalayn" width={72} height={72} style={{ display: "block" }} />
          <div style={styles.arabicMark}>الثقلين</div>
          <h1 style={styles.brandTitle}>Althaqalayn Lecture Archive</h1>
          <div style={styles.goldRule} />
          <p style={styles.brandSub}>
            Content administration for the Althaqalayn Cultural Foundation — the preserved lectures,
            series and tafsīr of Sheikh Hamzah Muhammad Lawal <span style={styles.qs}>(QS)</span>.
          </p>
        </div>

        <div style={styles.panelFoot}>A trust maintained for the community · صدقة جارية</div>
      </section>

      {/* Right — sign-in */}
      <section style={styles.formCol}>
        <div style={styles.formBlock} className="rise">
          <div style={styles.eyebrow}>
            <span style={styles.eyebrowTick} />
            Administrator access
          </div>
          <h2 style={styles.h1}>Sign in to the console</h2>
          <p style={styles.subtle}>Manage the archive’s content, gallery and schedule.</p>

          <label style={styles.label} htmlFor="login-email">Email</label>
          <input
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocus("email")}
            onBlur={() => setFocus(null)}
            placeholder="admin@althaqalayn.org"
            autoComplete="email"
            style={fieldStyle("email")}
          />

          <label style={{ ...styles.label, marginTop: 18 }} htmlFor="login-password">Password</label>
          <input
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocus("password")}
            onBlur={() => setFocus(null)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            style={fieldStyle("password")}
          />

          {error ? (
            <div style={styles.error}>
              <Icon name="close" size={13} color="#a23e3e" />
              {error}
            </div>
          ) : null}

          <button
            onClick={submit}
            disabled={busy}
            style={{ ...styles.button, opacity: busy ? 0.7 : 1 }}
            onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <span>{busy ? "Signing in…" : "Sign in"}</span>
            <span style={styles.buttonIcon}>
              <Icon name={busy ? "clock" : "arrow-right"} size={15} color={brand.green} strokeWidth={2.2} />
            </span>
          </button>

          <div style={styles.footnote}>Protected area · sessions expire after inactivity</div>
        </div>
      </section>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    minHeight: "100dvh",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    background: "var(--bg)",
  },

  // ── Brand panel ──────────────────────────────────────────────
  panel: {
    position: "relative",
    overflow: "hidden",
    background: `linear-gradient(158deg, ${brand.greenMid} -10%, ${brand.green} 45%, ${brand.greenDeepest} 100%)`,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "clamp(40px, 6vw, 88px)",
    boxShadow: "inset -1px 0 0 rgba(0,0,0,.2)",
  },
  dots: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,.05) 1px, transparent 1.7px)",
    backgroundSize: "18px 18px",
    maskImage: "radial-gradient(120% 120% at 30% 20%, #000 30%, transparent 78%)",
    WebkitMaskImage: "radial-gradient(120% 120% at 30% 20%, #000 30%, transparent 78%)",
  },
  watermark: {
    position: "absolute",
    right: -60,
    bottom: -80,
    fontFamily: font.arabic,
    fontSize: 420,
    color: "rgba(228,199,123,.07)",
    lineHeight: 1,
    pointerEvents: "none",
    userSelect: "none",
  },
  panelInner: { position: "relative", maxWidth: 440, display: "flex", flexDirection: "column" },
  arabicMark: {
    fontFamily: font.arabic,
    fontSize: 40,
    color: brand.gold,
    marginTop: 22,
    lineHeight: 1,
  },
  brandTitle: {
    fontFamily: font.arabic,
    fontSize: "clamp(30px, 3.2vw, 42px)",
    fontWeight: 400,
    color: "#fff",
    lineHeight: 1.18,
    marginTop: 14,
    textWrap: "balance",
  },
  goldRule: {
    width: 54,
    height: 2,
    background: `linear-gradient(90deg, ${brand.gold}, transparent)`,
    margin: "22px 0",
    borderRadius: 2,
  },
  brandSub: { fontSize: 15.5, color: "rgba(255,255,255,.72)", maxWidth: 400, lineHeight: 1.7 },
  qs: { color: brand.gold },
  panelFoot: {
    position: "absolute",
    left: "clamp(40px, 6vw, 88px)",
    bottom: 40,
    fontSize: 12,
    color: "rgba(255,255,255,.4)",
    letterSpacing: 0.2,
  },

  // ── Sign-in column ───────────────────────────────────────────
  formCol: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(32px, 4vw, 64px)",
    background: "var(--bg)",
  },
  formBlock: { width: "100%", maxWidth: 384 },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "var(--muted)",
  },
  eyebrowTick: { width: 16, height: 2, background: brand.goldDk, borderRadius: 2 },
  h1: {
    fontFamily: font.heading,
    fontSize: 27,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    marginTop: 16,
    textWrap: "balance",
  },
  subtle: { fontSize: 14, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 },
  label: {
    display: "block",
    fontSize: 12.5,
    fontWeight: 500,
    color: "var(--muted)",
    margin: "28px 0 8px",
  },
  input: {
    width: "100%",
    border: "1px solid var(--line)",
    borderRadius: radii.md,
    padding: "13px 15px",
    fontSize: 15,
    background: "var(--field)",
    outline: "none",
    transition: `border-color ${motion.fast} ${motion.standard}, box-shadow ${motion.fast} ${motion.standard}`,
  },
  error: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#a23e3e",
    fontSize: 13,
    marginTop: 16,
    background: "rgba(162,62,62,.08)",
    padding: "9px 12px",
    borderRadius: radii.sm,
  },
  button: {
    marginTop: 26,
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    background: brand.green,
    color: "#fff",
    border: "none",
    borderRadius: radii.md,
    padding: "8px 8px 8px 20px",
    height: 52,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: font.ui,
    cursor: "pointer",
    boxShadow: "0 1px 0 rgba(255,255,255,.12) inset, 0 6px 16px rgba(11,70,52,.28)",
    transition: `transform ${motion.fast} ${motion.out}, background ${motion.fast} ${motion.standard}`,
  },
  buttonIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    background: brand.gold,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  footnote: { fontSize: 12, color: "var(--faint)", marginTop: 18, textAlign: "center" },
};
