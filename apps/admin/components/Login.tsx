"use client";

import { useState, type CSSProperties } from "react";
import { useAuth } from "@/lib/auth";
import { brand, font } from "@/lib/ui";

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
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

  return (
    <div style={{ height: "100vh", display: "flex" }}>
      {/* Left green panel */}
      <div style={styles.panel}>
        <div style={styles.dots} />
        <div style={styles.watermark}>ﷲ</div>
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/althaqalayn_icon.svg" alt="Althaqalayn" width={76} height={76} style={{ display: "block", marginBottom: 26 }} />
          <div style={styles.brandTitle}>Althaqalayn Lecture Archive</div>
          <div style={styles.brandSub}>
            Content administration for the Althaqalayn Cultural Foundation — manage the lectures,
            series and tafsīr of Sheikh Hamzah Muhammad Lawal (QS).
          </div>
        </div>
      </div>

      {/* Right sign-in column */}
      <div style={styles.formCol}>
        <div style={styles.h1}>Sign in</div>
        <div style={styles.subtle}>Administrator access only.</div>

        <div style={styles.label}>EMAIL</div>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@althaqalayn.org"
          autoComplete="email"
          style={styles.input}
        />

        <div style={{ ...styles.label, marginTop: 16 }}>PASSWORD</div>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          style={styles.input}
        />

        {error ? <div style={styles.error}>{error}</div> : null}

        <button onClick={submit} disabled={busy} style={styles.button}>
          {busy ? "Signing in…" : "Sign in to console"}
        </button>
        <div style={styles.footnote}>Protected area · sessions expire after inactivity</div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    flex: 1,
    background: `linear-gradient(165deg, ${brand.green}, ${brand.greenDeepest})`,
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: 60,
  },
  dots: {
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,.06) 1px, transparent 1.6px)",
    backgroundSize: "16px 16px",
  },
  watermark: {
    position: "absolute",
    right: -40,
    bottom: -30,
    fontFamily: font.arabic,
    fontSize: 280,
    color: "rgba(228,199,123,.06)",
    lineHeight: 1,
  },
  emblem: {
    width: 76,
    height: 76,
    borderRadius: "50%",
    border: "1.5px solid rgba(228,199,123,.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: font.arabic,
    fontSize: 38,
    color: brand.gold,
    marginBottom: 26,
  },
  brandTitle: { fontFamily: font.heading, fontSize: 34, fontWeight: 600, color: "#fff", lineHeight: 1.2, maxWidth: 420 },
  brandSub: { fontSize: 15, color: "rgba(255,255,255,.7)", marginTop: 14, maxWidth: 420, lineHeight: 1.6 },

  formCol: {
    width: 460,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: 60,
    background: "var(--card)",
  },
  h1: { fontFamily: font.heading, fontSize: 24, fontWeight: 600 },
  subtle: { fontSize: 13, color: "var(--muted)", marginTop: 6 },
  label: { fontSize: 11, fontWeight: 800, letterSpacing: ".6px", color: "var(--faint)", margin: "26px 0 7px" },
  input: {
    width: "100%",
    border: "1.5px solid var(--line)",
    borderRadius: 11,
    padding: "13px 14px",
    fontSize: 14,
    background: "var(--input)",
    outline: "none",
  },
  error: { color: "#a23e3e", fontSize: 12.5, marginTop: 14 },
  button: {
    marginTop: 24,
    background: brand.green,
    color: "#fff",
    textAlign: "center",
    border: "none",
    borderRadius: 11,
    padding: 12,
    fontSize: 13.5,
    fontWeight: 600,
    fontFamily: font.ui,
    cursor: "pointer",
  },
  footnote: { fontSize: 11.5, color: "var(--faint)", marginTop: 16, textAlign: "center" },
};
